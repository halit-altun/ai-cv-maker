const { AppError } = require("../utils/app-error");
const {
  NEXT_KEY_DELAY_MS,
  ALL_KEYS_COOLDOWN_MS,
  sleep,
  resolveStartKeyIndex,
  advanceServerPastUsed,
} = require("./gemini-key-rotator");

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
/** Company-based + genel proxy varsayılanı */
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const COMPANY_BASED_GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_MODEL_2_5 = "gemini-2.5-flash";
const GEMINI_MODEL_3_5 = "gemini-3.5-flash";
// Model 404 olduğunda (kaldırılmış ad) yedekler
const FALLBACK_GEMINI_MODELS = [
  "gemini-flash-latest",
  "gemini-2.0-flash",
  "gemini-3-flash-preview",
];

/**
 * Tüm key'ler 429 verdiğinde model döngüsü:
 * preferred (2.5) → 3.5 → tekrar 2.5 (X'ten).
 * Amaç: aynı model+key kotasını farklı modelle aşmak.
 */
function buildRateLimitModelCycle(preferredModel) {
  const preferred = sanitizeModelId(preferredModel) || GEMINI_MODEL_2_5;
  const primary =
    preferred === GEMINI_MODEL_3_5 ? GEMINI_MODEL_3_5 : GEMINI_MODEL_2_5;
  const alternate = primary === GEMINI_MODEL_2_5 ? GEMINI_MODEL_3_5 : GEMINI_MODEL_2_5;
  return [primary, alternate, primary];
}

function sanitizeModelId(model) {
  const m = String(model || "").trim();
  if (!m || !/^[a-zA-Z0-9._-]+$/.test(m)) return "";
  return m;
}

function getGeminiKeys() {
  return [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_FALLBACK,
    process.env.GEMINI_API_KEY_TERTIARY,
    // Geriye uyumluluk
    process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2,
  ]
    .filter((k) => typeof k === "string" && k.trim().length > 0)
    .map((k) => k.trim())
    .filter((k, i, arr) => arr.indexOf(k) === i);
}

function getGeminiProKey() {
  return process.env.GEMINI_PRO_API_KEY || "";
}

function buildGeminiUrl(model) {
  return `${GEMINI_API_BASE}/${model}:generateContent`;
}

/**
 * Denenecek model listesi:
 * preferredModel (istek) → GEMINI_MODEL (env) → varsayılan → yedekler.
 * GEMINI_API_URL tanımlıysa tam URL olarak aynen kullanılır (tek deneme).
 */
function getGeminiEndpoints(preferredModel) {
  const explicitUrl = String(process.env.GEMINI_API_URL || "").trim();
  if (explicitUrl) {
    return [{ model: "custom", url: explicitUrl }];
  }

  const fromRequest = sanitizeModelId(preferredModel);
  const configuredModel = sanitizeModelId(process.env.GEMINI_MODEL);
  return [fromRequest, configuredModel, DEFAULT_GEMINI_MODEL, ...FALLBACK_GEMINI_MODELS]
    .filter(Boolean)
    .filter((model, index, arr) => arr.indexOf(model) === index)
    .map((model) => ({ model, url: buildGeminiUrl(model) }));
}

function isRateLimitOrOverloadStatus(status) {
  return status === 429 || status === 503 || status === 502 || status === 504;
}

function isModelUnavailableStatus(status) {
  return status === 404;
}

function isRateLimitOrOverloadBody(bodyText) {
  const t = String(bodyText || "").toLowerCase();
  return (
    t.includes("resource_exhausted") ||
    t.includes("rate limit") ||
    t.includes("quota") ||
    t.includes("too many requests") ||
    t.includes("overloaded") ||
    t.includes("unavailable")
  );
}

function getKeyLabel(index) {
  if (index === 0) return "primary";
  if (index === 1) return "fallback";
  if (index === 2) return "tertiary";
  return `key_${index + 1}`;
}

/**
 * Gemini 2.5+/3 thought (reasoning) part'larını JSON metnine karıştırma.
 * Thought + JSON birleşince client tarafında parse patlar.
 */
function extractResponseText(data) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  if (!Array.isArray(parts) || parts.length === 0) return "";

  const textOf = (p) => (typeof p?.text === "string" ? p.text : "");

  const nonThought = parts
    .filter((p) => !p?.thought && textOf(p).length > 0)
    .map(textOf);

  if (nonThought.length > 0) {
    return nonThought.join("\n").trim();
  }

  // Yalnızca thought geldiyse yine de birleştir (boş yanıt yerine)
  return parts.map(textOf).filter(Boolean).join("\n").trim();
}

/** Tek model + tek key ile istek; hata durumunda fırlatmaz, sonucu döner. */
async function requestGeminiOnce({ url, key, keyLabel, keyIndex, requestBody }) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-goog-api-key": key,
    },
    body: JSON.stringify(requestBody),
  });

  const rawText = await response.text();
  let data = null;
  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      keyLabel,
      keyIndex,
      modelUnavailable: isModelUnavailableStatus(response.status),
      retriable:
        isRateLimitOrOverloadStatus(response.status) || isRateLimitOrOverloadBody(rawText),
      message: `Gemini HTTP ${response.status} (${keyLabel})${
        rawText ? `: ${rawText.slice(0, 200)}` : ""
      }`,
    };
  }

  const text = extractResponseText(data);
  if (!text) {
    return {
      ok: false,
      status: response.status,
      keyLabel,
      keyIndex,
      modelUnavailable: false,
      retriable: true,
      message: `Gemini boş yanıt (${keyLabel})`,
    };
  }

  return {
    ok: true,
    text,
    finishReason: data?.candidates?.[0]?.finishReason || null,
    keyUsed: keyLabel,
    keyIndex,
  };
}

/**
 * Round-robin key sırası: startIndex'ten itibaren her key en fazla bir kez.
 * Aynı key asla peş peşe retry edilmez; geçici hatada 2s bekleyip sonraki key.
 */
async function tryKeysInRoundRobin({
  keys,
  startIndex,
  url,
  model,
  requestBody,
  passLabel,
}) {
  let lastFailure = null;
  let modelUnavailable = false;
  let allRetriable = true;

  for (let offset = 0; offset < keys.length; offset++) {
    if (offset > 0) {
      console.warn(
        `[gemini] ${passLabel} — sonraki key için ${NEXT_KEY_DELAY_MS / 1000}s bekleniyor`
      );
      await sleep(NEXT_KEY_DELAY_MS);
    }

    const keyIndex = (startIndex + offset) % keys.length;
    const keyLabel = getKeyLabel(keyIndex);

    let attempt;
    try {
      attempt = await requestGeminiOnce({
        url,
        key: keys[keyIndex],
        keyLabel,
        keyIndex,
        requestBody,
      });
    } catch (err) {
      allRetriable = true;
      lastFailure = {
        message: err?.message || "Gemini isteği başarısız.",
        status: null,
        keyLabel,
        keyIndex,
        model,
        retriable: true,
      };
      console.warn(
        `[gemini] ağ hatası (${model} / ${keyLabel}) — aynı key tekrarlanmaz, sıradaki key:`,
        err?.message || err
      );
      continue;
    }

    if (attempt.ok) {
      return { ok: true, attempt, modelUnavailable: false, lastFailure: null };
    }

    lastFailure = { ...attempt, model };

    if (attempt.modelUnavailable) {
      modelUnavailable = true;
      allRetriable = false;
      console.warn(
        `[gemini] ${model} kullanılamıyor (404) — sonraki model deneniyor. ${attempt.message}`
      );
      break;
    }

    if (attempt.retriable) {
      console.warn(
        `[gemini] ${attempt.status ?? "?"} — ${model} / ${keyLabel} geçici hata; aynı key retry yok → sıradaki key`
      );
      continue;
    }

    // Kalıcı hata: diğer key'lere geçme
    allRetriable = false;
    throw new AppError(`Gemini API hatası: ${attempt.status}`, 502, "GEMINI_HTTP_ERROR", {
      status: attempt.status,
      keyLabel,
      keyIndex,
      model,
    });
  }

  return {
    ok: false,
    attempt: null,
    modelUnavailable,
    allRetriable,
    lastFailure,
  };
}

/**
 * Gemini çağrısını sunucu tarafında yapar (API key client'ta yok).
 *
 * Round-robin: preferredKeyIndex veya sunucu sayacı ile X→Y→Z.
 * 429 / geçici hata: aynı key retry yok; 2s → sıradaki key.
 * X+Y+Z hepsi 429: modele geç (2.5 → 3.5 → tekrar 2.5), her seferinde X'ten.
 * 404 model: flash-latest vb. yedek model adları.
 */
async function generateGeminiContent({
  prompt,
  jsonMode = false,
  preferredKeyIndex,
  model,
  singleKey, // Gemini Pro için tek key modu
} = {}) {
  // Eğer singleKey verilmişse (Gemini Pro), sadece o key'i kullan
  const keys = singleKey ? [singleKey] : getGeminiKeys();
  if (!keys.length) {
    throw new AppError(
      "Gemini API key yapılandırılmamış (GEMINI_API_KEY veya GEMINI_PRO_API_KEY).",
      500,
      "GEMINI_NOT_CONFIGURED"
    );
  }

  if (!prompt || !String(prompt).trim()) {
    throw new AppError("prompt zorunlu.", 400, "PROMPT_REQUIRED");
  }

  const requestBody = {
    contents: [
      {
        parts: [{ text: String(prompt) }],
      },
    ],
    ...(jsonMode
      ? {
          generationConfig: {
            responseMimeType: "application/json",
            maxOutputTokens: 65536,
            thinkingConfig: {
              includeThoughts: false,
              thinkingBudget: 512,
            },
          },
        }
      : {
          generationConfig: {
            maxOutputTokens: 8192,
          },
        }),
  };

  // GEMINI_API_URL varsa tek endpoint (eski override)
  const explicitUrl = String(process.env.GEMINI_API_URL || "").trim();
  if (explicitUrl) {
    const startIndex = resolveStartKeyIndex(keys.length, preferredKeyIndex);
    const pass = await tryKeysInRoundRobin({
      keys,
      startIndex,
      url: explicitUrl,
      model: "custom",
      requestBody,
      passLabel: "custom-url",
    });
    if (pass.ok && pass.attempt) {
      advanceServerPastUsed(pass.attempt.keyIndex, keys.length);
      return {
        text: pass.attempt.text,
        finishReason: pass.attempt.finishReason,
        keyUsed: pass.attempt.keyUsed,
        keyIndexUsed: pass.attempt.keyIndex,
        keyCount: keys.length,
        nextKeyIndex: (pass.attempt.keyIndex + 1) % keys.length,
        model: "custom",
      };
    }
    throw new AppError(pass.lastFailure?.message || "Gemini çağrısı başarısız.", 502, "GEMINI_FAILED", {
      status: pass.lastFailure?.status ?? undefined,
      keyLabel: pass.lastFailure?.keyLabel,
      keyIndex: pass.lastFailure?.keyIndex,
      model: "custom",
    });
  }

  const preferredModel = sanitizeModelId(model) || COMPANY_BASED_GEMINI_MODEL;
  const modelCycle = buildRateLimitModelCycle(preferredModel);
  
  // Single key modu (Gemini Pro): round-robin yok, startIndex=0
  const startIndex = singleKey ? 0 : resolveStartKeyIndex(keys.length, preferredKeyIndex);
  let lastFailure = null;

  const modeLabel = singleKey ? "SINGLE_KEY (Gemini Pro)" : "ROUND_ROBIN (Free)";
  console.log(
    `[gemini] mode=${modeLabel} requestedModel=${sanitizeModelId(model) || "(default)"} cycle=${modelCycle.join(" → ")} startIndex=${startIndex} keyCount=${keys.length}`
  );

  for (let cycle = 0; cycle < modelCycle.length; cycle++) {
    let modelId = modelCycle[cycle];
    // İlk turda preferred; 404 olursa yedek adlara düş
    const candidates =
      cycle === 0
        ? [modelId, sanitizeModelId(process.env.GEMINI_MODEL), ...FALLBACK_GEMINI_MODELS]
            .filter(Boolean)
            .filter((m, i, arr) => arr.indexOf(m) === i)
        : [modelId];

    const keyStart = cycle === 0 ? startIndex : 0;

    if (cycle > 0) {
      console.warn(
        `[gemini] tüm key'ler 429/geçici hata — model değiştiriliyor → ${modelId}, X (0) ile yeniden (${NEXT_KEY_DELAY_MS / 1000}s)`
      );
      await sleep(NEXT_KEY_DELAY_MS);
    }

    let movedToNextCycleDueToRateLimit = false;

    for (let c = 0; c < candidates.length; c++) {
      const currentModel = candidates[c];
      const url = buildGeminiUrl(currentModel);

      const pass = await tryKeysInRoundRobin({
        keys,
        startIndex: keyStart,
        url,
        model: currentModel,
        requestBody,
        passLabel: `cycle${cycle + 1}/${currentModel}`,
      });

      if (pass.ok && pass.attempt) {
        advanceServerPastUsed(pass.attempt.keyIndex, keys.length);
        if (cycle > 0 || pass.attempt.keyIndex !== startIndex || currentModel !== preferredModel) {
          console.log(
            `[gemini] başarılı — ${currentModel} / ${pass.attempt.keyUsed} (index ${pass.attempt.keyIndex})`
          );
        }
        return {
          text: pass.attempt.text,
          finishReason: pass.attempt.finishReason,
          keyUsed: pass.attempt.keyUsed,
          keyIndexUsed: pass.attempt.keyIndex,
          keyCount: keys.length,
          nextKeyIndex: (pass.attempt.keyIndex + 1) % keys.length,
          model: currentModel,
        };
      }

      lastFailure = pass.lastFailure;

      if (pass.modelUnavailable) {
        console.warn(
          `[gemini] ${currentModel} kullanılamıyor (404) — sonraki model adı deneniyor`
        );
        continue;
      }

      // X→Y→Z geçici hata → bir sonraki cycle modeline geç (3.5 veya tekrar 2.5)
      if (pass.allRetriable) {
        movedToNextCycleDueToRateLimit = true;
        break;
      }

      // Kalıcı hata zaten tryKeys içinde throw eder; buraya düşmemeli
      break;
    }

    if (!movedToNextCycleDueToRateLimit && lastFailure?.modelUnavailable) {
      // Aday listesi tükendi (404) — sonraki cycle'a yine de dene
      continue;
    }

    if (!movedToNextCycleDueToRateLimit) {
      break;
    }
  }

  // Tam cycle (2.5→3.5→2.5) tükendi → son çare kısa cooldown + bir kez daha preferred/X
  console.warn(
    `[gemini] 2.5↔3.5 model döngüsü tükendi — ${ALL_KEYS_COOLDOWN_MS / 1000}s beklenip ${preferredModel} / X ile son deneme`
  );
  await sleep(ALL_KEYS_COOLDOWN_MS);

  const lastPass = await tryKeysInRoundRobin({
    keys,
    startIndex: 0,
    url: buildGeminiUrl(preferredModel),
    model: preferredModel,
    requestBody,
    passLabel: `final-after-cooldown/${preferredModel}`,
  });

  if (lastPass.ok && lastPass.attempt) {
    advanceServerPastUsed(lastPass.attempt.keyIndex, keys.length);
    console.log(
      `[gemini] cooldown sonrası başarılı — ${preferredModel} / ${lastPass.attempt.keyUsed}`
    );
    return {
      text: lastPass.attempt.text,
      finishReason: lastPass.attempt.finishReason,
      keyUsed: lastPass.attempt.keyUsed,
      keyIndexUsed: lastPass.attempt.keyIndex,
      keyCount: keys.length,
      nextKeyIndex: (lastPass.attempt.keyIndex + 1) % keys.length,
      model: preferredModel,
    };
  }

  lastFailure = lastPass.lastFailure || lastFailure;

  throw new AppError(lastFailure?.message || "Gemini çağrısı başarısız.", 502, "GEMINI_FAILED", {
    status: lastFailure?.status ?? undefined,
    keyLabel: lastFailure?.keyLabel,
    keyIndex: lastFailure?.keyIndex,
    model: lastFailure?.model,
  });
}

module.exports = {
  generateGeminiContent,
  getGeminiKeys,
  getGeminiProKey,
  getGeminiEndpoints,
  buildRateLimitModelCycle,
  DEFAULT_GEMINI_MODEL,
  COMPANY_BASED_GEMINI_MODEL,
  GEMINI_MODEL_2_5,
  GEMINI_MODEL_3_5,
};
