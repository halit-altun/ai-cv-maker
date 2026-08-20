const dns = require("dns").promises;

/**
 * Sıfır maliyetli hibrit e-posta doğrulama:
 * 1) DNS MX (yerel, sınırsız)
 * 2) Reacher self-hosted (SMTP handshake)
 * 3) EmailVerify.io API (kota yedek)
 */

const DEFAULT_CANDIDATE_PREFIXES = ["careers", "hr", "recruitment", "jobs"];

/**
 * EmailVerify role_based → kariyer/İK adresleri için whitelist.
 * Bu local-part'lar cold mail hedefidir; role_based geçerli sayılır.
 */
const ROLE_BASED_CAREER_LOCALS = new Set([
  "hr",
  "careers",
  "jobs",
  "job",
  "recruitment",
  "recruiter",
  "talent",
  "people",
  "hiring",
  "apply",
  "join",
  "work",
  "humanresources",
  "peopleops",
  "peopleandculture",
  "culture",
  "talentacquisition",
  "talentteam",
  "peopleteam",
  "careers-team",
  "jobapplications",
  "applications",
  "vacancies",
  "opportunity",
  "opportunities",
  "employment",
  "workwithus",
  "jointheteam",
  "futuretalent",
  "tech-hiring",
  "tech-careers",
  "engineering-hiring",
  "ik",
  "kariyer",
]);

function isRoleBasedCareerAddress(email) {
  const local = extractLocalPart(email);
  return Boolean(local && ROLE_BASED_CAREER_LOCALS.has(local));
}

/** EmailVerify sub_status → kesin geçersiz (mailbox yok / riskli engel) */
const EMAILVERIFY_HARD_FAIL_SUBSTATUSES = new Set([
  "mailbox_not_found",
  "mailbox-not-found",
  "no_dns_entries",
  "no-dns-entries",
  "failed_syntax_check",
  "failed-syntax-check",
  "disposable",
  "blocked_domain",
  "blocked-domain",
  "opt_out",
  "opt-out",
  "spamtrap",
  "spam_trap",
]);

function normalizeEmailVerifyToken(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

/**
 * Docs: https://www.emailverify.io/api/docs/#verifier
 * Status: valid | invalid | disposable | catch_all | do_not_mail | unknown | role_based | skipped
 * sub_status: permitted | mailbox_not_found | …
 *
 * Kabul: yalnızca status=valid
 * İstisna: role_based + kariyer/İK local + sub_status hard-fail değil (mailbox_not_found → red)
 * Finder API (/finder) burada kullanılmaz — o ayrı (isim→email, 10 kredi).
 */
function interpretEmailVerifyResult(email, raw) {
  const status = normalizeEmailVerifyToken(raw?.status);
  const subStatus = normalizeEmailVerifyToken(raw?.sub_status || raw?.subStatus);
  const hardFailSub = EMAILVERIFY_HARD_FAIL_SUBSTATUSES.has(subStatus);

  const roleBasedCareer =
    (status === "role_based" || status === "rolebased") && isRoleBasedCareerAddress(email);

  // mailbox_not_found her zaman red — role_based olsa bile
  if (hardFailSub) {
    return {
      status: status || "invalid",
      subStatus,
      isValid: false,
      isInvalid: true,
      isRisky: false,
      roleBasedWhitelisted: false,
      reason: "HARD_FAIL_SUBSTATUS",
    };
  }

  if (status === "valid") {
    return {
      status,
      subStatus,
      isValid: true,
      isInvalid: false,
      isRisky: false,
      roleBasedWhitelisted: false,
    };
  }

  // Kariyer/İK: role_based kabul (yalnızca hard-fail sub_status yoksa)
  if (roleBasedCareer) {
    return {
      status,
      subStatus,
      isValid: true,
      isInvalid: false,
      isRisky: false,
      roleBasedWhitelisted: true,
      reason: "ROLE_BASED_CAREER_WHITELIST",
    };
  }

  if (
    status === "invalid" ||
    status === "disposable" ||
    status === "spamtrap" ||
    status === "do_not_mail" ||
    status === "skipped"
  ) {
    return {
      status: status || "invalid",
      subStatus,
      isValid: false,
      isInvalid: true,
      isRisky: false,
      roleBasedWhitelisted: false,
    };
  }

  // catch_all | unknown | role_based (whitelist dışı) → belirsiz, gönderme
  return {
    status: status || "unknown",
    subStatus,
    isValid: false,
    isInvalid: false,
    isRisky: true,
    roleBasedWhitelisted: false,
    reason: "AMBIGUOUS_STATUS",
  };
}

/** EmailVerify.io ardışık çağrılar arası son zaman damgası */
let lastEmailVerifyCallAt = 0;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeDomain(raw) {
  let value = String(raw || "").trim().toLowerCase();
  if (!value) return "";
  if (value.includes("@")) value = value.split("@").pop() || "";
  value = value.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
  value = value.split("/")[0].split("?")[0].replace(/^@/, "");
  return value;
}

function extractLocalPart(raw) {
  const value = String(raw || "").trim().toLowerCase();
  if (!value || !value.includes("@")) return null;
  const local = value.split("@")[0]?.replace(/^@/, "").trim();
  return local || null;
}

/**
 * Kullanıcının firma sayfasından girdiği ana adres.
 * info@firma.com → info@firma.com | trustedEmail öncelikli
 * Yalnızca ham girdide @ varsa çözülür (domain-only → null).
 */
function resolveTrustedPrimaryEmail({ rawDomainInput, domain, trustedEmail } = {}) {
  const explicit = String(trustedEmail || "").trim().toLowerCase();
  if (explicit && explicit.includes("@")) return explicit;

  const raw = String(rawDomainInput || "").trim().toLowerCase();
  const localFromRaw = extractLocalPart(raw);
  if (!localFromRaw) return null;

  const d = normalizeDomain(domain || raw);
  if (!d) return null;
  return `${localFromRaw}@${d}`;
}

/**
 * Doğrulamasız gönderim yalnızca açıkça trustedEmail verildiğinde uygulanır
 * (checkbox ile frontend kontrol eder).
 */
function resolveTrustedSkipEmail({ trustedEmail } = {}) {
  const explicit = String(trustedEmail || "").trim().toLowerCase();
  return explicit && explicit.includes("@") ? explicit : null;
}

/** Departman adresleri; kullanıcı ana adresi her zaman en önde (doğrulamasız). */
const RECIPIENT_PRIORITY_LOCALS = ["careers", "hr", "recruitment", "jobs"];

function getRecipientPriority(email, trustedEmail = null) {
  const address = String(email || "").trim().toLowerCase();
  const local = extractLocalPart(address) || "";
  const trusted = String(trustedEmail || "").trim().toLowerCase();

  if (trusted && address === trusted) {
    return 0; // kullanıcı ana adresi — koşulsuz
  }

  const idx = RECIPIENT_PRIORITY_LOCALS.indexOf(local);
  if (idx !== -1) return idx + 1; // careers=1, hr=2, recruitment=3, jobs=4

  // Diğer üretilmiş prefix'ler
  return 100 + (local ? local.charCodeAt(0) : 0);
}

/**
 * Geçerli (isValid) adresler arasından öncelik sırasına göre bir adres seçer
 * (geriye uyumluluk / tek adres ihtiyacı için).
 */
function selectByPriority(validChecks, trustedEmail = null) {
  if (!Array.isArray(validChecks) || !validChecks.length) return null;
  const sorted = [...validChecks].sort((a, b) => {
    const pa = getRecipientPriority(a.email, trustedEmail);
    const pb = getRecipientPriority(b.email, trustedEmail);
    if (pa !== pb) return pa - pb;
    return String(a.email).localeCompare(String(b.email));
  });
  return sorted[0] || null;
}

function isVerifyEnabled() {
  return String(process.env.EMAIL_VERIFY_ENABLED || "true").toLowerCase() !== "false";
}

function getReacherUrl() {
  const url = String(process.env.REACHER_URL || "").trim().replace(/\/$/, "");
  return url || "";
}

function getEmailVerifyApiKey() {
  return String(process.env.EMAILVERIFY_API_KEY || "").trim();
}

function allowMxOnlyFallback() {
  return String(process.env.EMAIL_VERIFY_MX_ONLY_FALLBACK || "true").toLowerCase() !== "false";
}

/**
 * Mailbox API'leri (Reacher/EmailVerify) catch-all / rol adreslerini invalid sayınca
 * MX varsa kuyruk adaylarını kabul et. EMAIL_VERIFY_MX_ONLY_FALLBACK=false ile kapatılır.
 */
function acceptCandidatesAfterMailboxChecks({
  mxOk,
  validEmails,
  candidates,
  mailboxAttempted = false,
} = {}) {
  const valid = Array.isArray(validEmails) ? validEmails.filter(Boolean) : [];
  if (valid.length) {
    return { ok: true, emails: valid, usedMxFallback: false };
  }
  // Reacher/EmailVerify çalıştıysa geçmeyeni MX yüzünden kabul etme.
  if (mailboxAttempted) {
    return { ok: false, emails: [], usedMxFallback: false };
  }
  const list = Array.isArray(candidates) ? candidates.filter(Boolean) : [];
  if (mxOk && allowMxOnlyFallback() && list.length) {
    return { ok: true, emails: list, usedMxFallback: true };
  }
  return { ok: false, emails: [], usedMxFallback: false };
}

/**
 * Kademe 1 — Domain'de MX kaydı var mı?
 */
async function checkMx(domain) {
  const resolved = normalizeDomain(domain);
  if (!resolved) {
    return { ok: false, domain: "", mx: [], error: "DOMAIN_REQUIRED" };
  }

  try {
    const records = await dns.resolveMx(resolved);
    const mx = (records || [])
      .filter((r) => r && r.exchange)
      .sort((a, b) => a.priority - b.priority)
      .map((r) => ({ exchange: r.exchange, priority: r.priority }));

    if (!mx.length) {
      return {
        ok: false,
        domain: resolved,
        mx: [],
        error: "NO_MX",
        message: `[PASS] ${resolved} için MX kaydı bulunamadı.`,
      };
    }

    return { ok: true, domain: resolved, mx, error: null, message: null };
  } catch (err) {
    const code = err && err.code ? String(err.code) : "DNS_ERROR";
    return {
      ok: false,
      domain: resolved,
      mx: [],
      error: code === "ENOTFOUND" || code === "ENODATA" ? "NO_MX" : "DNS_ERROR",
      message: `[ERROR] DNS sorgusu başarısız: ${resolved} (${code})`,
    };
  }
}

/**
 * Kademe 2 — Reacher Docker API
 * POST {REACHER_URL}/v0/check_email  { to_email }
 * is_reachable: safe | risky | invalid | unknown
 */
async function verifyWithReacher(email) {
  const base = getReacherUrl();
  if (!base) {
    return { available: false, provider: "reacher", result: "unavailable", raw: null };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.REACHER_TIMEOUT_MS || 25000));

  try {
    const response = await fetch(`${base}/v0/check_email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to_email: email }),
      signal: controller.signal,
    });

    const raw = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        available: true,
        provider: "reacher",
        result: "unknown",
        isValid: false,
        raw,
        error: `HTTP_${response.status}`,
      };
    }

    const reachable = String(raw.is_reachable || "").toLowerCase();
    const isValid = reachable === "safe";
    const isRisky = reachable === "risky";
    const isInvalid = reachable === "invalid";

    return {
      available: true,
      provider: "reacher",
      result: reachable || "unknown",
      isValid,
      isRisky,
      isInvalid,
      raw,
    };
  } catch (err) {
    return {
      available: true,
      provider: "reacher",
      result: "unknown",
      isValid: false,
      error: err instanceof Error ? err.message : "REACHER_ERROR",
      raw: null,
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Kademe 3 — EmailVerify.io Single Validation API
 * Docs: https://www.emailverify.io/api/docs/
 * GET https://app.emailverify.io/api/v1/validate?key=&email=
 */
async function verifyWithEmailVerify(email) {
  const apiKey = getEmailVerifyApiKey();
  if (!apiKey) {
    return { available: false, provider: "emailverify", result: "unavailable", raw: null };
  }

  const {
    canUseEmailVerifyCredit,
    recordEmailVerifyUsage,
  } = require("./emailverify-quota.service");

  const allowed = await canUseEmailVerifyCredit();
  if (!allowed) {
    console.log(`[EMAILVERIFY] Kota bitti — EmailVerify adımı atlanıyor (${email})`);
    return {
      available: false,
      skipped: true,
      provider: "emailverify",
      result: "quota_skipped",
      reason: "QUOTA_EXCEEDED",
      raw: null,
    };
  }

  // Rate limit ~1 req/s — istekler arası en az 1.5 sn
  const minGapMs = Math.max(
    1500,
    Number(process.env.EMAILVERIFY_MIN_GAP_MS || process.env.EMAIL_VERIFY_DELAY_MS || 1500)
  );
  const elapsed = Date.now() - lastEmailVerifyCallAt;
  if (lastEmailVerifyCallAt > 0 && elapsed < minGapMs) {
    const waitMs = minGapMs - elapsed;
    console.log(`[EMAILVERIFY] Rate limit — ${(waitMs / 1000).toFixed(1)} sn bekleniyor`);
    await sleep(waitMs);
  }
  lastEmailVerifyCallAt = Date.now();

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    Number(process.env.EMAILVERIFY_TIMEOUT_MS || 15000)
  );

  try {
    const url = new URL("https://app.emailverify.io/api/v1/validate");
    url.searchParams.set("key", apiKey);
    url.searchParams.set("email", email);

    const response = await fetch(url.toString(), { method: "GET", signal: controller.signal });
    const raw = await response.json().catch(() => ({}));

    const quota = await recordEmailVerifyUsage({ email, httpStatus: response.status });

    // Kota / rate limit — bu adımı atla, MX fallback'e düş
    if (response.status === 401 || response.status === 402 || response.status === 429) {
      console.log(`[EMAILVERIFY] HTTP ${response.status} — EmailVerify adımı atlanıyor (${email})`);
      return {
        available: false,
        skipped: true,
        provider: "emailverify",
        result: "quota_skipped",
        reason: response.status === 429 ? "RATE_LIMIT" : "EMAILVERIFY_QUOTA",
        raw,
        quota,
      };
    }

    if (!response.ok) {
      return {
        available: true,
        provider: "emailverify",
        result: "unknown",
        isValid: false,
        raw,
        error: `HTTP_${response.status}`,
        quota,
      };
    }

    const interpreted = interpretEmailVerifyResult(email, raw);

    if (interpreted.roleBasedWhitelisted) {
      console.log(
        `[EMAILVERIFY] role_based whitelist — ${email} kabul (sub_status=${interpreted.subStatus || "n/a"})`
      );
    } else if (interpreted.reason === "HARD_FAIL_SUBSTATUS") {
      console.log(
        `[EMAILVERIFY] hard-fail sub_status — ${email} red (status=${interpreted.status}, sub=${interpreted.subStatus})`
      );
    }

    return {
      available: true,
      provider: "emailverify",
      result:
        interpreted.reason === "HARD_FAIL_SUBSTATUS" && interpreted.subStatus
          ? interpreted.subStatus
          : interpreted.status || "unknown",
      statusDetail: interpreted.subStatus,
      isValid: interpreted.isValid,
      isRisky: interpreted.isRisky,
      isInvalid: interpreted.isInvalid,
      roleBasedWhitelisted: interpreted.roleBasedWhitelisted,
      reason: interpreted.reason || "",
      raw,
      quota,
    };
  } catch (err) {
    return {
      available: true,
      provider: "emailverify",
      result: "unknown",
      isValid: false,
      error: err instanceof Error ? err.message : "EMAILVERIFY_ERROR",
      raw: null,
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Tek adresi kademeli doğrula.
 * Reacher valid → kabul
 * Reacher invalid → red
 * Reacher unknown/risky veya yok → EmailVerify
 * Hiçbir provider yok → mx-only (opsiyonel fallback)
 */
async function verifySingleEmail(email, { mxChecked = false } = {}) {
  const address = String(email || "").trim().toLowerCase();
  if (!address || !address.includes("@")) {
    return {
      email: address,
      isValid: false,
      provider: "none",
      result: "invalid",
      reason: "INVALID_FORMAT",
    };
  }

  if (!mxChecked) {
    const domain = normalizeDomain(address);
    const mx = await checkMx(domain);
    if (!mx.ok) {
      return {
        email: address,
        isValid: false,
        provider: "mx",
        result: "invalid",
        reason: mx.error || "NO_MX",
        mx,
      };
    }
  }

  const reacher = await verifyWithReacher(address);
  if (reacher.available) {
    if (reacher.isValid) {
      return {
        email: address,
        isValid: true,
        provider: "reacher",
        result: reacher.result,
        details: reacher,
      };
    }
    if (reacher.isInvalid) {
      return {
        email: address,
        isValid: false,
        provider: "reacher",
        result: reacher.result,
        details: reacher,
      };
    }
    // risky / unknown → EmailVerify yedek
  }

  const emailverify = await verifyWithEmailVerify(address);
  if (emailverify.available) {
    if (emailverify.isValid) {
      return {
        email: address,
        isValid: true,
        provider: "emailverify",
        result: emailverify.result,
        details: emailverify,
        previous: reacher.available ? reacher : undefined,
      };
    }
    if (emailverify.isInvalid) {
      return {
        email: address,
        isValid: false,
        provider: "emailverify",
        result: emailverify.result,
        details: emailverify,
        previous: reacher.available ? reacher : undefined,
      };
    }
    // risky/unknown — catch-all senaryosu: gönderim için kabul etme (güvenli)
    return {
      email: address,
      isValid: false,
      provider: "emailverify",
      result: emailverify.result || "unknown",
      reason: "AMBIGUOUS",
      details: emailverify,
      previous: reacher.available ? reacher : undefined,
    };
  }

  // EmailVerify yapılandırıldıysa MX-only soft kabul KAPALI (yanlış pozitif engeli).
  // Yalnızca API key yokken veya açıkça EMAIL_VERIFY_MX_ONLY_FALLBACK=true ve key yokken.
  const emailverifySkipped = Boolean(emailverify.skipped);
  const reacherHardFail = reacher.available && reacher.isInvalid;
  const emailVerifyConfigured = Boolean(getEmailVerifyApiKey());
  const allowSoftMx =
    allowMxOnlyFallback() &&
    !emailVerifyConfigured &&
    !reacherHardFail &&
    (!emailverify.available || emailverifySkipped);

  if (allowSoftMx) {
    return {
      email: address,
      isValid: true,
      provider: emailverifySkipped ? "mx-only" : reacher.available ? "reacher-mx" : "mx-only",
      result: emailverifySkipped ? "emailverify_skipped_mx_ok" : "mx_ok",
      reason: emailverifySkipped ? "EMAILVERIFY_QUOTA_BYPASS" : "NO_SMTP_VERIFIER_CONFIGURED",
      warning: emailverifySkipped
        ? "EmailVerify kotası bitti — EmailVerify adımı atlandı; MX ile kabul edildi."
        : "EmailVerify yapılandırılmadı; yalnızca MX kontrolü yapıldı.",
      previous: reacher.available ? reacher : undefined,
      details: emailverifySkipped ? emailverify : undefined,
    };
  }

  // Kota bitti / atlandı ama API key var → soft kabul yok, gönderim reddi
  if (emailverifySkipped && emailVerifyConfigured) {
    return {
      email: address,
      isValid: false,
      provider: "emailverify",
      result: "quota_skipped",
      reason: "EMAILVERIFY_QUOTA_NO_FALLBACK",
      warning:
        "EmailVerify kotası/limit — MX soft kabul kapalı (yanlış adrese gönderim engellendi).",
      previous: reacher.available ? reacher : undefined,
      details: emailverify,
    };
  }

  return {
    email: address,
    isValid: false,
    provider: reacher.available ? "reacher" : emailverify.available ? "emailverify" : "none",
    result: emailverify.result || reacher.result || "unknown",
    reason: "NO_VALID_PROVIDER_RESULT",
    details: emailverify.available ? emailverify : reacher.available ? reacher : null,
  };
}

/**
 * Aday listesinin tamamını doğrular.
 * Kullanıcı ana adresi (firma sayfasından girilen @ içeren adres) doğrulamaya sokulmaz — koşulsuz geçerli.
 * Diğer geçerli adresler careers → hr → recruitment → jobs sırasıyla eklenir.
 * Geriye uyumluluk: validEmail = ilk geçerli adres.
 */
async function pickValidRecipient(candidates, options = {}) {
  const prefixes = Array.isArray(options.prefixes) && options.prefixes.length
    ? options.prefixes
    : DEFAULT_CANDIDATE_PREFIXES;

  let list = Array.isArray(candidates)
    ? [...new Set(candidates.map((c) => String(c || "").trim().toLowerCase()).filter(Boolean))]
    : [];

  const domainHint = normalizeDomain(options.domain || list[0] || "");

  const trusted = resolveTrustedSkipEmail({
    trustedEmail: options.trustedEmail,
  });

  if (trusted && !list.includes(trusted)) {
    list.unshift(trusted);
  }

  if (!list.length && domainHint) {
    list = prefixes.map((p) => `${p}@${domainHint}`);
  }

  if (!list.length) {
    return {
      ok: false,
      validEmail: null,
      validEmails: [],
      mx: null,
      checks: [],
      reason: "NO_CANDIDATES",
      message: "Doğrulanacak aday e-posta yok.",
    };
  }

  const domain = domainHint || normalizeDomain(list[0]);
  const mx = await checkMx(domain);

  const trustedCheck = trusted
    ? {
        email: trusted,
        isValid: true,
        provider: "trusted",
        result: "trusted_skip",
        reason: "TRUSTED_PRIMARY",
        warning: "Kullanıcı ana adresi — doğrulama atlandı (firma sayfasından)",
      }
    : null;

  if (!mx.ok) {
    console.log(mx.message || `[PASS] ${domain} MX yok.`);
    // MX yoksa bile kullanıcı ana adresine koşulsuz gönderim denenebilir
    if (trustedCheck) {
      const checks = list.map((email) =>
        email === trusted
          ? trustedCheck
          : {
              email,
              isValid: false,
              provider: "mx",
              result: "invalid",
              reason: mx.error || "NO_MX",
            }
      );
      console.log(`[VERIFY TRUSTED] ${trusted} — MX yok; yalnızca ana adres gönderilecek`);
      return {
        ok: true,
        validEmail: trusted,
        validEmails: [trusted],
        domain,
        mx,
        checks,
        provider: "trusted",
        message: `MX yok; kullanıcı ana adresi koşulsuz: ${trusted}`,
        warning: trustedCheck.warning,
      };
    }

    return {
      ok: false,
      validEmail: null,
      validEmails: [],
      domain,
      mx,
      checks: list.map((email) => ({
        email,
        isValid: false,
        provider: "mx",
        result: "invalid",
        reason: mx.error || "NO_MX",
      })),
      reason: mx.error || "NO_MX",
      message: mx.message || `${domain} için MX kaydı yok — gönderim iptal.`,
    };
  }

  // Doğrulama sırası: ana adres → careers → hr → recruitment → jobs → diğer
  list = [...list].sort(
    (a, b) => getRecipientPriority(a, trusted) - getRecipientPriority(b, trusted)
  );

  const checks = [];
  const delayMs = Math.max(0, Number(process.env.EMAIL_VERIFY_DELAY_MS || 1500));

  for (let i = 0; i < list.length; i += 1) {
    const email = list[i];

    if (trusted && email === trusted && trustedCheck) {
      checks.push(trustedCheck);
      console.log(`[VERIFY TRUSTED] ${email} — doğrulama atlandı (koşulsuz gönderim)`);
    } else {
      const result = await verifySingleEmail(email, { mxChecked: true });
      checks.push(result);

      if (result.isValid) {
        console.log(
          `[VERIFY OK] ${email} via ${result.provider} (${result.result})${
            result.warning ? ` — ${result.warning}` : ""
          }`
        );
      } else {
        console.log(
          `[VERIFY FAIL] ${email} via ${result.provider || "n/a"} (${result.result || result.reason})`
        );
      }
    }

    if (delayMs > 0 && i < list.length - 1) {
      await sleep(delayMs);
    }
  }

  const validChecks = checks
    .filter((c) => c && c.isValid)
    .sort(
      (a, b) =>
        getRecipientPriority(a.email, trusted) - getRecipientPriority(b.email, trusted)
    );

  const validEmailsFromChecks = validChecks.map((c) => c.email);
  const mailboxAttempted = checks.some((c) => {
    const provider = String(c?.provider || "").toLowerCase();
    return provider === "reacher" || provider === "emailverify";
  });
  const accepted = acceptCandidatesAfterMailboxChecks({
    mxOk: true,
    validEmails: validEmailsFromChecks,
    candidates: list,
    mailboxAttempted,
  });

  if (!accepted.ok) {
    return {
      ok: false,
      validEmail: null,
      validEmails: [],
      domain,
      mx,
      checks,
      reason: "NO_VALID_EMAIL",
      message: `${domain} için adaylar arasında geçerli e-posta bulunamadı.`,
    };
  }

  if (accepted.usedMxFallback) {
    console.log(
      `[VERIFY MX-FALLBACK] ${domain}: mailbox doğrulanamadı ama MX var; ${accepted.emails.length} aday kuyruğa alınacak.`
    );
  }

  const validEmails = accepted.emails;
  const primaryEmail = validEmails[0];
  const primary = validChecks[0] || {
    provider: "mx-only",
    warning: accepted.usedMxFallback
      ? "Mailbox doğrulanamadı; MX kaydı olduğu için gönderim kuyruğa alındı."
      : null,
  };

  console.log(
    `[VERIFY SELECT] ${validEmails.length} geçerli adres: ${validEmails.join(", ")}`
  );

  return {
    ok: true,
    validEmail: primaryEmail,
    validEmails,
    domain,
    mx,
    checks,
    provider: accepted.usedMxFallback ? "mx-only" : primary.provider,
    message: accepted.usedMxFallback
      ? `${domain} MX var; mailbox doğrulanamadı, ${validEmails.length} aday kuyruğa alındı.`
      : `${validEmails.length} geçerli adres: ${validEmails.join(", ")}`,
    warning: primary.warning || null,
  };
}

module.exports = {
  checkMx,
  verifyWithReacher,
  verifyWithEmailVerify,
  verifySingleEmail,
  pickValidRecipient,
  normalizeDomain,
  resolveTrustedPrimaryEmail,
  getRecipientPriority,
  selectByPriority,
  isVerifyEnabled,
  allowMxOnlyFallback,
  acceptCandidatesAfterMailboxChecks,
  isRoleBasedCareerAddress,
  interpretEmailVerifyResult,
  DEFAULT_CANDIDATE_PREFIXES,
  RECIPIENT_PRIORITY_LOCALS,
  ROLE_BASED_CAREER_LOCALS,
};
