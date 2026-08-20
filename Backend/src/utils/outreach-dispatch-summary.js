function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function formatOutreachDispatchSummary({ results = [], verification = null } = {}) {
  const checks = Array.isArray(verification?.checks) ? verification.checks : [];
  const rows = Array.isArray(results) ? results : [];
  const checkByEmail = new Map(
    checks.map((c) => [normalizeEmail(c.email), c])
  );

  const accepted = [];
  const rejected = [];
  const seen = new Set();

  for (const row of rows) {
    const email = normalizeEmail(row.email || row.to);
    if (!email || seen.has(email)) continue;
    seen.add(email);
    const status = String(row.status || "");
    const check = checkByEmail.get(email);
    if (["sent", "queued", "logged"].includes(status)) {
      accepted.push({ email, status, check });
    } else {
      rejected.push({
        email,
        status: status || "invalid",
        reason: row.errorMessage || check?.result || check?.reason || "",
        provider: row.verifyProvider || check?.provider || "",
      });
    }
  }

  for (const check of checks) {
    const email = normalizeEmail(check.email);
    if (!email || seen.has(email)) continue;
    seen.add(email);
    if (check.isValid) {
      accepted.push({ email, status: "valid", check });
    } else {
      rejected.push({
        email,
        status: "invalid",
        reason: check.result || check.reason || "",
        provider: check.provider || "",
      });
    }
  }

  const acceptedLine = accepted.length
    ? `Geçen (${accepted.length}): ${accepted
        .map((a) => `${a.email}${a.status === "queued" ? " → sırada" : a.status === "sent" ? " → gitti" : ""}`)
        .join(", ")}.`
    : "Geçen adres yok.";
  const rejectedLine = rejected.length
    ? `Geçmeyen (${rejected.length}): ${rejected
        .map((r) => `${r.email}${r.reason ? ` (${r.provider || "n/a"}: ${r.reason})` : ""}`)
        .join(", ")}.`
    : "Geçmeyen adres yok.";

  return {
    accepted,
    rejected,
    text: `${acceptedLine} ${rejectedLine}`.trim(),
  };
}

function logIntervalVerify({ jobId, itemId, companyName, sendResult } = {}) {
  const summary = formatOutreachDispatchSummary({
    results: sendResult?.results,
    verification: sendResult?.verification,
  });
  console.log(
    `[INTERVAL_VERIFY] job=${jobId || "-"} item=${itemId || "-"} company=${companyName || "-"} ` +
      `accepted=${summary.accepted.map((a) => a.email).join("|") || "-"} ` +
      `rejected=${summary.rejected.map((r) => r.email).join("|") || "-"} ` +
      `status=${sendResult?.status || "-"}`
  );
  return summary;
}

module.exports = {
  formatOutreachDispatchSummary,
  logIntervalVerify,
};
