/**
 * Frontend outreachConstants.buildRecipientEmails ile uyumlu alıcı üretimi.
 */

const EMAIL_PREFIX_CATEGORIES = {
  "hr-recruitment": [
    "hr",
    "careers",
    "jobs",
    "recruitment",
    "recruiter",
    "talent",
    "people",
    "work",
    "hiring",
    "apply",
    "join",
  ],
  "hr-culture": [
    "humanresources",
    "peopleops",
    "peopleandculture",
    "culture",
    "talentacquisition",
    "talentteam",
    "peopleteam",
    "careers-team",
  ],
  "position-career": [
    "job",
    "jobapplications",
    "applications",
    "vacancies",
    "opportunity",
    "opportunities",
    "employment",
    "workwithus",
    "jointheteam",
    "futuretalent",
  ],
  "team-founders": [
    "tech-hiring",
    "tech-careers",
    "engineering-hiring",
    "founders",
    "ceo",
    "cto",
    "management",
    "team",
  ],
  "minimal-three": ["info", "careers", "hr", "recruitment"],
  "main-domain-only": ["info"],
  "turkey-hiring": ["ik", "kariyer"],
};

const EXCLUSIVE_CATEGORY_IDS = new Set([
  "minimal-three",
  "main-domain-only",
  "turkey-hiring",
]);

function normalizeEmailDomainInput(raw) {
  let value = String(raw || "").trim().toLowerCase();
  if (!value) return "";

  if (value.includes("@")) {
    value = value.split("@").pop() || "";
  }

  value = value.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
  value = value.split("/")[0].split("?")[0].replace(/^@/, "");
  return value;
}

function extractLocalPartFromInput(raw) {
  const value = String(raw || "").trim().toLowerCase();
  if (!value || !value.includes("@")) return null;
  const local = value.split("@")[0]?.replace(/^@/, "").trim();
  return local || null;
}

function buildMinimalThreeRecipients(rawDomainInput, includePrimaryEmail = true) {
  const domain = normalizeEmailDomainInput(rawDomainInput);
  if (!domain) return [];

  const primaryLocal = extractLocalPartFromInput(rawDomainInput);
  const deptPrefixes = ["careers", "hr", "recruitment"];

  const dept = deptPrefixes
    .filter((p) => !primaryLocal || p !== primaryLocal)
    .map((p) => `${p}@${domain}`);

  if (!includePrimaryEmail) return dept;

  const local = primaryLocal || "info";
  const primary = `${local}@${domain}`;
  return [primary, ...dept.filter((e) => e !== primary)];
}

function buildRecipientEmails({
  domain,
  selectedCategoryIds = [],
  customLocalParts = [],
  rawDomainInput = "",
  includePrimaryEmail = true,
}) {
  const resolvedDomain = normalizeEmailDomainInput(domain || rawDomainInput);
  if (!resolvedDomain) return [];

  const includePrimary = includePrimaryEmail !== false;
  const primaryLocal = extractLocalPartFromInput(rawDomainInput || "");
  const ids = Array.isArray(selectedCategoryIds) ? selectedCategoryIds : [];

  if (ids.includes("minimal-three")) {
    return buildMinimalThreeRecipients(rawDomainInput || domain, includePrimary);
  }

  if (ids.includes("main-domain-only")) {
    const local = primaryLocal || "info";
    return [`${local}@${resolvedDomain}`];
  }

  if (ids.includes("turkey-hiring")) {
    return ["ik", "kariyer"].map((prefix) => `${prefix}@${resolvedDomain}`);
  }

  const set = new Set();

  if (includePrimary && primaryLocal) {
    set.add(`${primaryLocal}@${resolvedDomain}`);
  }

  for (const categoryId of ids) {
    if (
      categoryId === "custom" ||
      EXCLUSIVE_CATEGORY_IDS.has(categoryId)
    ) {
      continue;
    }
    const prefixes = EMAIL_PREFIX_CATEGORIES[categoryId] || [];
    for (const prefix of prefixes) {
      if (includePrimary && primaryLocal && prefix === primaryLocal) continue;
      set.add(`${prefix}@${resolvedDomain}`);
    }
  }

  for (const raw of customLocalParts || []) {
    const value = String(raw || "").trim().toLowerCase();
    if (!value) continue;
    if (value.includes("@")) {
      const customDomain = normalizeEmailDomainInput(value);
      const local = value.split("@")[0];
      if (local && customDomain) {
        if (
          includePrimary &&
          primaryLocal &&
          local === primaryLocal &&
          customDomain === resolvedDomain
        ) {
          continue;
        }
        set.add(`${local}@${customDomain}`);
      }
    } else {
      const local = value.replace(/^@/, "");
      if (includePrimary && primaryLocal && local === primaryLocal) continue;
      set.add(`${local}@${resolvedDomain}`);
    }
  }

  const emails = Array.from(set);
  if (includePrimary && primaryLocal) {
    const primary = `${primaryLocal}@${resolvedDomain}`;
    return [primary, ...emails.filter((e) => e !== primary)];
  }
  return emails;
}

module.exports = {
  EMAIL_PREFIX_CATEGORIES,
  EXCLUSIVE_CATEGORY_IDS,
  normalizeEmailDomainInput,
  extractLocalPartFromInput,
  buildMinimalThreeRecipients,
  buildRecipientEmails,
};
