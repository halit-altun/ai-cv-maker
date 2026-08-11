const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  ULTRA_FAST_SECONDS,
  PREFETCH_WINDOW_SECONDS,
  classifyMailOpen,
  decideMailOpenUpdate,
} = require("../src/utils/mail-open-classifier");

describe("classifyMailOpen", () => {
  it("manuel simülasyonu insan sayar", () => {
    const r = classifyMailOpen({
      openedInSeconds: 0,
      userAgent: "manual-simulate-open",
    });
    assert.equal(r.countsAsHumanOpen, true);
    assert.equal(r.isLikelyBot, false);
    assert.equal(r.reason, "manual_simulate");
  });

  it("0–4 sn ultra_fast bot sayılır (aynı dakika false positive kaynağı)", () => {
    for (const s of [0, 1, 2, ULTRA_FAST_SECONDS - 1]) {
      const r = classifyMailOpen({
        openedInSeconds: s,
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0",
      });
      assert.equal(r.countsAsHumanOpen, false, `seconds=${s}`);
      assert.equal(r.reason, "ultra_fast");
    }
  });

  it("GoogleImageProxy aynı dakikada insan sayılmaz", () => {
    const r = classifyMailOpen({
      openedInSeconds: 25,
      userAgent:
        "Mozilla/5.0 (Windows NT 5.1; rv:11.0) Gecko Firefox/11.0 (via ggpht.com GoogleImageProxy)",
    });
    assert.equal(r.countsAsHumanOpen, false);
    assert.equal(r.reason, "ua_proxy_or_scanner");
  });

  it("Proofpoint / Mimecast tarayıcıları bot", () => {
    for (const ua of ["Proofpoint URL Defense", "Mimecast-URL-Scan/1.0"]) {
      const r = classifyMailOpen({ openedInSeconds: 40, userAgent: ua });
      assert.equal(r.countsAsHumanOpen, false, ua);
      assert.equal(r.reason, "ua_proxy_or_scanner");
    }
  });

  it("prefetch penceresi (aynı dakika) insan sayılmaz", () => {
    const r = classifyMailOpen({
      openedInSeconds: 45,
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });
    assert.equal(r.countsAsHumanOpen, false);
    assert.equal(r.reason, "prefetch_window");
    assert.ok(45 < PREFETCH_WINDOW_SECONDS);
  });

  it("prefetch penceresi + boş UA bot", () => {
    const r = classifyMailOpen({ openedInSeconds: 30, userAgent: "" });
    assert.equal(r.countsAsHumanOpen, false);
    assert.equal(r.reason, "prefetch_window_empty_ua");
  });

  it("90 sn sonrası gerçek tarayıcı insan sayılır", () => {
    const r = classifyMailOpen({
      openedInSeconds: PREFETCH_WINDOW_SECONDS,
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
    });
    assert.equal(r.countsAsHumanOpen, true);
    assert.equal(r.reason, "human_likely");
  });

  it("referer proxy bot", () => {
    const r = classifyMailOpen({
      openedInSeconds: 120,
      userAgent: "Mozilla/5.0",
      referer: "https://ci3.googleusercontent.com/proxy/abc",
    });
    assert.equal(r.countsAsHumanOpen, false);
    assert.equal(r.reason, "referer_proxy");
  });
});

describe("decideMailOpenUpdate", () => {
  const now = new Date("2026-08-11T12:00:00.000Z");

  it("prefetch OPENED yapmaz ve openedCount artırmaz", () => {
    const classification = classifyMailOpen({
      openedInSeconds: 20,
      userAgent: "Mozilla/5.0 (via ggpht.com GoogleImageProxy)",
    });
    const next = decideMailOpenUpdate(
      { status: "SENT", openedCount: 0, prefetchCount: 0 },
      classification,
      now
    );
    assert.equal(next.status, "SENT");
    assert.equal(next.openedCount, 0);
    assert.equal(next.prefetchCount, 1);
    assert.equal(next.isLikelyBot, true);
    assert.equal(next.countedAsHuman, false);
    assert.equal(next.firstOpenedAt, null);
  });

  it("insan açılışı OPENED yapar ve sayacı artırır", () => {
    const classification = classifyMailOpen({
      openedInSeconds: 120,
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    });
    const next = decideMailOpenUpdate(
      {
        status: "SENT",
        openedCount: 0,
        prefetchCount: 2,
        isLikelyBot: true,
        firstPrefetchAt: now,
      },
      classification,
      now
    );
    assert.equal(next.status, "OPENED");
    assert.equal(next.openedCount, 1);
    assert.equal(next.prefetchCount, 2);
    assert.equal(next.isLikelyBot, false);
    assert.equal(next.countedAsHuman, true);
    assert.ok(next.firstOpenedAt);
  });

  it("önceki insan açılışı varken prefetch openedCount bozmaz", () => {
    const classification = classifyMailOpen({
      openedInSeconds: 10,
      userAgent: "GoogleImageProxy",
    });
    const firstOpenedAt = new Date("2026-08-11T11:00:00.000Z");
    const next = decideMailOpenUpdate(
      {
        status: "OPENED",
        openedCount: 3,
        prefetchCount: 1,
        isLikelyBot: false,
        firstOpenedAt,
        lastOpenedAt: firstOpenedAt,
      },
      classification,
      now
    );
    assert.equal(next.status, "OPENED");
    assert.equal(next.openedCount, 3);
    assert.equal(next.prefetchCount, 2);
    assert.equal(next.firstOpenedAt, firstOpenedAt);
  });

  it("aynı-dakika senaryosu: 90 açılışın ~%90 prefetch olsa OPENED olmamalı", () => {
    let tracking = { status: "SENT", openedCount: 0, prefetchCount: 0 };
    // 90 mail simülasyonu: 81 prefetch (0–89s), 9 gerçek (120s+)
    for (let i = 0; i < 81; i++) {
      const c = classifyMailOpen({
        openedInSeconds: (i % 60) + 5,
        userAgent:
          i % 2 === 0
            ? "Mozilla/5.0 (via ggpht.com GoogleImageProxy)"
            : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36",
      });
      tracking = {
        ...tracking,
        ...decideMailOpenUpdate(tracking, c, now),
      };
    }
    assert.equal(tracking.status, "SENT");
    assert.equal(tracking.openedCount, 0);
    assert.equal(tracking.prefetchCount, 81);

    for (let i = 0; i < 9; i++) {
      const c = classifyMailOpen({
        openedInSeconds: 120 + i,
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      });
      tracking = {
        ...tracking,
        ...decideMailOpenUpdate(tracking, c, now),
      };
    }
    assert.equal(tracking.status, "OPENED");
    assert.equal(tracking.openedCount, 9);
    assert.equal(tracking.prefetchCount, 81);
  });
});
