/**
 * info@ / contact@ genel gelen kutuları için cold mail sarmalama.
 * Diğer alıcılara giden gövdeye dokunulmaz; yalnızca bu local-part’larda uygulanır.
 */

const THANKS_EN =
  "Thank you for taking the time to route my email to the responsible team.";
const THANKS_TR =
  "E-postamı ilgili ekibe yönlendirdiğiniz için teşekkür ederim.";

const ROUTE_EN =
  "Could you please forward this email to your HR or recruiting team?";
const ROUTE_TR =
  "Bu e-postayı İK veya işe alım ekibinize iletmenizi rica ederim.";

/**
 * Local-part tam info/contact veya info./contact- gibi önekler.
 * @param {string} email
 * @returns {boolean}
 */
function isInfoOrContactEmail(email) {
  const local = String(email || "")
    .trim()
    .toLowerCase()
    .split("@")[0]
    .replace(/^@/, "");
  if (!local) return false;
  return (
    local === "info" ||
    local === "contact" ||
    /^info[._+-]/.test(local) ||
    /^contact[._+-]/.test(local)
  );
}

/**
 * @param {string[]} emails
 * @returns {boolean}
 */
function anyInfoOrContactEmail(emails) {
  return (Array.isArray(emails) ? emails : []).some(isInfoOrContactEmail);
}

/**
 * @param {string[]} emails
 * @returns {boolean}
 */
function onlyInfoOrContactEmails(emails) {
  const list = (Array.isArray(emails) ? emails : [])
    .map((e) => String(e || "").trim())
    .filter(Boolean);
  return list.length > 0 && list.every(isInfoOrContactEmail);
}

/**
 * @param {string[]} emails
 * @returns {boolean}
 */
function hasStandardRecipientEmails(emails) {
  return (Array.isArray(emails) ? emails : []).some((e) => {
    const v = String(e || "").trim();
    return Boolean(v) && !isInfoOrContactEmail(v);
  });
}

/**
 * @param {string} bodyText
 * @returns {'english'|'turkish'}
 */
function detectColdEmailLanguage(bodyText) {
  const t = String(bodyText || "");
  if (/Saygılarımla/i.test(t) || /^Sayın\b/m.test(t) || /rica ederim/i.test(t)) {
    return "turkish";
  }
  return "english";
}

/**
 * Mevcut cold mail gövdesini koruyarak info/contact için giriş + teşekkür ekler.
 * Zaten sarmalanmışsa tekrar eklemez.
 * @param {{ bodyText: string, companyName?: string, language?: 'english'|'turkish' }} params
 * @returns {string}
 */
function wrapColdEmailForInfoContactInbox(params) {
  const original = String(params.bodyText || "").trim();
  if (!original) return original;

  if (original.includes(THANKS_EN) || original.includes(THANKS_TR)) {
    return original;
  }

  const lang =
    params.language === "turkish" || params.language === "english"
      ? params.language
      : detectColdEmailLanguage(original);
  const isEnglish = lang === "english";
  const company = String(params.companyName || "").trim();

  const dearLine = isEnglish
    ? company
      ? `Dear ${company} Team,`
      : "Dear Team,"
    : company
      ? `Sayın ${company} Ekibi,`
      : "Sayın Ekip,";

  const routeLine = isEnglish ? ROUTE_EN : ROUTE_TR;
  const thanksLine = isEnglish ? THANKS_EN : THANKS_TR;

  // Mevcut cold mail gövdesini koru; yalnızca üstteki hitabı kaldır (çift selamlama olmasın).
  let core = original.replace(
    /^(Dear[^\n]*|Hello[^\n]*|Hi[^\n]*|Merhaba[^\n]*|Sayın[^\n]*)\s*\n+/i,
    ""
  );

  const signRe = /(\n+)(Best regards,|Saygılarımla,)(\s*\n)/i;
  if (signRe.test(core)) {
    core = core.replace(signRe, `\n\n${thanksLine}$1$2$3`);
  } else {
    core = `${core}\n\n${thanksLine}`;
  }

  return `${dearLine}\n\n${routeLine}\n\n${core}`.trim();
}

/**
 * Prompt’a eklenecek koşullu blok (yalnızca generic inbox = YES iken).
 * Mevcut cold mail kurallarının üzerine eklenir; diğer maillerde çağrılmaz.
 */
function buildGenericInboxRoutingPromptAddon({
  language = "English",
  companyName = "",
} = {}) {
  const isEnglish = String(language).toLowerCase().startsWith("en");
  const company = String(companyName || "").trim();
  const dear = isEnglish
    ? company
      ? `Dear ${company} Team,`
      : "Dear Team,"
    : company
      ? `Sayın ${company} Ekibi,`
      : "Sayın Ekip,";
  const route = isEnglish ? ROUTE_EN : ROUTE_TR;
  const thanks = isEnglish ? THANKS_EN : THANKS_TR;

  return `
GENERIC INBOX ROUTING (info@ / contact@ ONLY — apply this EXTRA structure; keep all other cold-email rules above unchanged for the middle body):
1) First line MUST be exactly: ${dear}
2) Second beat (1 short sentence): ask them to forward/route this email to HR or recruiting (${isEnglish ? `"${ROUTE_EN}"` : `"${ROUTE_TR}"`} or equivalent short wording).
3) Then write the SAME cold-email body logic as usual (researched opening like "I reviewed …" / Turkish equivalent, middle achievements, CTA) — do not invent extra claims.
4) Immediately BEFORE Best regards/Saygılarımla, add exactly: ${thanks}
5) Then Best regards/Saygılarımla + name/title/email/phone/links as usual.
`.trim();
}

module.exports = {
  THANKS_EN,
  THANKS_TR,
  ROUTE_EN,
  ROUTE_TR,
  isInfoOrContactEmail,
  anyInfoOrContactEmail,
  onlyInfoOrContactEmails,
  hasStandardRecipientEmails,
  detectColdEmailLanguage,
  wrapColdEmailForInfoContactInbox,
  buildGenericInboxRoutingPromptAddon,
};
