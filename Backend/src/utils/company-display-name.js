/**
 * Şirket görünen adı — URL/domain etiketlerini marka adına çevirir.
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

function resolveCompanyDisplayName({ name, website, domain } = {}) {
  const rawName = String(name || "").trim();
  if (rawName && !isDomainLikeCompanyLabel(rawName)) return rawName;

  const source =
    rawName || String(website || "").trim() || String(domain || "").trim();
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
  resolveCompanyDisplayName,
  sanitizeCompanyForFileName,
  replaceCompanySegmentInPdfFilename,
};
