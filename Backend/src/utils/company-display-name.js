/**
 * Şirket görünen adı — URL/domain etiketlerini marka adına çevirir.
 * Domain ile uyuşmayan sticky isimleri (örn. Leobit @ oakslab.com) reddeder.
 */

function isDomainLikeCompanyLabel(value) {
  const v = String(value || "").trim();
  if (!v) return false;
  if (/\s/.test(v)) return false;
  if (/^https?:\/\//i.test(v)) return true;
  if (/^www\./i.test(v)) return true;
  if (/^[a-z0-9.-]+\.[a-z]{2,}([/:?#].*)?$/i.test(v)) return true;
  return false;
}

function extractHostname(raw) {
  let value = String(raw || "").trim();
  if (!value) return "";
  try {
    if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
    return new URL(value).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return value
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .split("/")[0]
      .split("?")[0]
      .toLowerCase();
  }
}

function compactAlnum(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function brandTokens(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((t) => t.length >= 2);
}

/**
 * "Oaks Lab" ↔ oakslab.com uyumlu; "Leobit" ↔ oakslab.com uyumsuz.
 */
function companyNameAlignedWithDomain(name, domainOrUrl) {
  const nameCompact = compactAlnum(name);
  const host = extractHostname(domainOrUrl);
  if (!nameCompact || !host) return true;

  const label = (host.split(".")[0] || "").replace(/[^a-z0-9]+/g, "");
  if (!label) return true;

  if (nameCompact === label) return true;
  if (nameCompact.includes(label) || label.includes(nameCompact)) return true;

  const tokens = brandTokens(name);
  // En az bir anlamlı token (3+ harf) domain etiketinde geçmeli
  const meaningful = tokens.filter((t) => t.length >= 3);
  if (meaningful.length && meaningful.every((t) => label.includes(t))) {
    return true;
  }
  if (meaningful.some((t) => label.includes(t) && t.length >= 4)) {
    return true;
  }
  return false;
}

function brandifyFromHostOrUrl(raw) {
  const host = extractHostname(raw);
  if (!host) return "";
  const firstLabel = host.split(".")[0] || host;
  return firstLabel
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Path’li URL’yi koru; birden fazla adaydan path’i olanı tercih et.
 */
function pickBestCompanyUrl(...candidates) {
  const cleaned = candidates
    .map((c) => String(c || "").trim())
    .filter(Boolean)
    .map((raw) => {
      if (/^https?:\/\//i.test(raw)) return raw;
      if (raw.includes("@")) return "";
      return `https://${raw.replace(/^\/+/, "")}`;
    })
    .filter(Boolean);

  const withPath = cleaned.find((u) => {
    try {
      const path = new URL(u).pathname || "";
      return path && path !== "/";
    } catch {
      return /\/.+/.test(u.replace(/^https?:\/\//i, ""));
    }
  });
  return withPath || cleaned[0] || "";
}

function resolveCompanyDisplayName({ name, website, domain } = {}) {
  const rawName = String(name || "").trim();
  const domainSrc =
    String(domain || "").trim() || String(website || "").trim();

  if (rawName && !isDomainLikeCompanyLabel(rawName)) {
    if (!domainSrc || companyNameAlignedWithDomain(rawName, domainSrc)) {
      return rawName;
    }
    // Sticky / yanlış şirket adı — domain markasına dön
    return brandifyFromHostOrUrl(domainSrc) || rawName;
  }

  const source = rawName || String(website || "").trim() || String(domain || "").trim();
  if (!source) return "";
  if (isDomainLikeCompanyLabel(source) || extractHostname(source).includes(".")) {
    return brandifyFromHostOrUrl(source) || rawName;
  }
  return rawName || source;
}

function sanitizeCompanyForFileName(company) {
  return (
    String(company || "")
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 60) || "Company"
  );
}

/**
 * First_Last_OldCompany.pdf → First_Last_NewCompany.pdf
 */
function replaceCompanySegmentInPdfFilename(filename, companyDisplay) {
  const safe = sanitizeCompanyForFileName(companyDisplay);
  const raw = String(filename || "CV.pdf").trim() || "CV.pdf";
  const base = raw.replace(/\.pdf$/i, "");
  const parts = base.split("_").filter(Boolean);
  if (parts.length >= 3) {
    return `${parts[0]}_${parts[1]}_${safe}.pdf`;
  }
  if (parts.length === 2) {
    return `${parts[0]}_${parts[1]}_${safe}.pdf`;
  }
  return `${base || "CV"}_${safe}.pdf`;
}

module.exports = {
  isDomainLikeCompanyLabel,
  brandifyFromHostOrUrl,
  companyNameAlignedWithDomain,
  pickBestCompanyUrl,
  resolveCompanyDisplayName,
  sanitizeCompanyForFileName,
  replaceCompanySegmentInPdfFilename,
  extractHostname,
};
