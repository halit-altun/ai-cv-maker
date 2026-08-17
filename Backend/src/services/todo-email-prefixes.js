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

function resolveEnteredMainDomainEmail(rawDomainInput, domain) {
  const d = normalizeEmailDomainInput(domain || rawDomainInput);
  if (!d) return null;
  const local = extractLocalPartFromInput(rawDomainInput) || "info";
  return `${local}@${d}`;
}

function withEnteredMainDomain(emails, rawDomainInput, domain, includeEnteredMainDomain) {
  if (!includeEnteredMainDomain) return emails;
  const main = resolveEnteredMainDomainEmail(rawDomainInput, domain);
  if (!main) return emails;
  return [main, ...emails.filter((e) => e !== main)];
}

function resolveTrustedSendEmail({
  rawDomainInput,
  domain,
  includeEnteredMainDomainInSend,
  includePrimaryEmailInSend,
  skipPrimaryEmailVerification,
} = {}) {
  if (includeEnteredMainDomainInSend) {
    return resolveEnteredMainDomainEmail(rawDomainInput, domain) || undefined;
  }
  if (
    includePrimaryEmailInSend !== false &&
    skipPrimaryEmailVerification &&
    String(rawDomainInput || "").includes("@")
  ) {
    return resolveEnteredMainDomainEmail(rawDomainInput, domain) || undefined;
  }
  return undefined;
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
  includeEnteredMainDomain = false,
}) {
  const resolvedDomain = normalizeEmailDomainInput(domain || rawDomainInput);
  if (!resolvedDomain) return [];

  const includePrimary = includePrimaryEmail !== false;
  const includeEnteredMain = Boolean(includeEnteredMainDomain);
  const rawInput = rawDomainInput || domain || "";
  const primaryLocal = extractLocalPartFromInput(rawDomainInput || "");
  const ids = Array.isArray(selectedCategoryIds) ? selectedCategoryIds : [];

  if (ids.includes("minimal-three")) {
    return withEnteredMainDomain(
      buildMinimalThreeRecipients(rawInput, includePrimary),
      rawInput,
      resolvedDomain,
      includeEnteredMain
    );
  }

  if (ids.includes("main-domain-only")) {
    const local = primaryLocal || "info";
    return withEnteredMainDomain(
      [`${local}@${resolvedDomain}`],
      rawInput,
      resolvedDomain,
      includeEnteredMain
    );
  }

  if (ids.includes("turkey-hiring")) {
    return withEnteredMainDomain(
      ["ik", "kariyer"].map((prefix) => `${prefix}@${resolvedDomain}`),
      rawInput,
      resolvedDomain,
      includeEnteredMain
    );
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
  const ordered =
    includePrimary && primaryLocal
      ? [
          `${primaryLocal}@${resolvedDomain}`,
          ...emails.filter((e) => e !== `${primaryLocal}@${resolvedDomain}`),
        ]
      : emails;
  return withEnteredMainDomain(ordered, rawInput, resolvedDomain, includeEnteredMain);
}

module.exports = {
  EMAIL_PREFIX_CATEGORIES,
  EXCLUSIVE_CATEGORY_IDS,
  normalizeEmailDomainInput,
  extractLocalPartFromInput,
  resolveEnteredMainDomainEmail,
  resolveTrustedSendEmail,
  buildMinimalThreeRecipients,
  buildRecipientEmails,
};
