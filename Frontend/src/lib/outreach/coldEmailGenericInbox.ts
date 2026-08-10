/**
 * info@ / contact@ / hello@ / sales@ genel gelen kutuları — Frontend mirror (Backend util ile aynı kurallar).
 */

export const COLD_EMAIL_ROUTE_THANKS_EN =
  'Thank you for taking the time to route my email to the responsible team.';
export const COLD_EMAIL_ROUTE_THANKS_TR =
  'E-postamı ilgili ekibe yönlendirdiğiniz için teşekkür ederim.';

export const COLD_EMAIL_ROUTE_ASK_EN =
  'Could you please forward this email to your HR or recruiting team?';
export const COLD_EMAIL_ROUTE_ASK_TR =
  'Bu e-postayı İK veya işe alım ekibinize iletmenizi rica ederim.';

/** Local-part tam info/contact/hello/sales veya info./contact-/hello-/sales- önekleri. */
export function isInfoOrContactEmail(email: string): boolean {
  const local = String(email || '')
    .trim()
    .toLowerCase()
    .split('@')[0]
    ?.replace(/^@/, '') || '';
  if (!local) return false;
  return (
    local === 'info' ||
    local === 'contact' ||
    local === 'hello' ||
    local === 'sales' ||
    /^info[._+-]/.test(local) ||
    /^contact[._+-]/.test(local) ||
    /^hello[._+-]/.test(local) ||
    /^sales[._+-]/.test(local)
  );
}

export function anyInfoOrContactEmail(emails: string[]): boolean {
  return (emails || []).some(isInfoOrContactEmail);
}

/** Listedeki tüm adresler info@/contact@/hello@/sales@ (tek ana domain info dahil). */
export function onlyInfoOrContactEmails(emails: string[]): boolean {
  const list = (emails || []).map((e) => String(e || '').trim()).filter(Boolean);
  return list.length > 0 && list.every(isInfoOrContactEmail);
}

/** info/contact/hello/sales dışı en az bir alıcı var mı (standart cold mail gerekir). */
export function hasStandardRecipientEmails(emails: string[]): boolean {
  return (emails || []).some((e) => {
    const v = String(e || '').trim();
    return Boolean(v) && !isInfoOrContactEmail(v);
  });
}

export function detectColdEmailLanguage(bodyText: string): 'english' | 'turkish' {
  const t = String(bodyText || '');
  if (/Saygılarımla/i.test(t) || /^Sayın\b/m.test(t) || /rica ederim/i.test(t)) {
    return 'turkish';
  }
  return 'english';
}

export function wrapColdEmailForInfoContactInbox(params: {
  bodyText: string;
  companyName?: string;
  language?: 'english' | 'turkish';
}): string {
  const original = String(params.bodyText || '').trim();
  if (!original) return original;

  if (
    original.includes(COLD_EMAIL_ROUTE_THANKS_EN) ||
    original.includes(COLD_EMAIL_ROUTE_THANKS_TR)
  ) {
    return original;
  }

  const lang =
    params.language === 'turkish' || params.language === 'english'
      ? params.language
      : detectColdEmailLanguage(original);
  const isEnglish = lang === 'english';
  const company = String(params.companyName || '').trim();

  const dearLine = isEnglish
    ? company
      ? `Dear ${company} Team,`
      : 'Dear Team,'
    : company
      ? `Sayın ${company} Ekibi,`
      : 'Sayın Ekip,';

  const routeLine = isEnglish ? COLD_EMAIL_ROUTE_ASK_EN : COLD_EMAIL_ROUTE_ASK_TR;
  const thanksLine = isEnglish ? COLD_EMAIL_ROUTE_THANKS_EN : COLD_EMAIL_ROUTE_THANKS_TR;

  let core = original.replace(
    /^(Dear[^\n]*|Hello[^\n]*|Hi[^\n]*|Merhaba[^\n]*|Sayın[^\n]*)\s*\n+/i,
    ''
  );

  const signRe = /(\n+)(Best regards,|Saygılarımla,)(\s*\n)/i;
  if (signRe.test(core)) {
    core = core.replace(signRe, `\n\n${thanksLine}$1$2$3`);
  } else {
    core = `${core}\n\n${thanksLine}`;
  }

  return `${dearLine}\n\n${routeLine}\n\n${core}`.trim();
}

/** LinkedIn DM — genel kutu bağlamı: Hi,/Merhaba, + yönlendirme + teşekkür */
export function wrapLinkedInForGenericInbox(params: {
  bodyText: string;
  language?: 'english' | 'turkish';
}): string {
  const original = String(params.bodyText || '').trim();
  if (!original) return original;

  if (
    original.includes(COLD_EMAIL_ROUTE_THANKS_EN) ||
    original.includes(COLD_EMAIL_ROUTE_THANKS_TR)
  ) {
    return original;
  }

  const lang =
    params.language === 'turkish' || params.language === 'english'
      ? params.language
      : detectColdEmailLanguage(original);
  const isEnglish = lang === 'english';
  const hiLine = isEnglish ? 'Hi,' : 'Merhaba,';
  const routeLine = isEnglish ? COLD_EMAIL_ROUTE_ASK_EN : COLD_EMAIL_ROUTE_ASK_TR;
  const thanksLine = isEnglish ? COLD_EMAIL_ROUTE_THANKS_EN : COLD_EMAIL_ROUTE_THANKS_TR;

  let core = original.replace(
    /^(Dear[^\n]*|Hello[^\n]*|Hi[^\n]*|Merhaba[^\n]*|Sayın[^\n]*)\s*\n+/i,
    ''
  );

  const signRe = /(\n+)(Best regards,|Saygılarımla,)(\s*\n)/i;
  if (signRe.test(core)) {
    core = core.replace(signRe, `\n\n${thanksLine}$1$2$3`);
  } else {
    core = `${core}\n\n${thanksLine}`;
  }

  return `${hiLine}\n\n${routeLine}\n\n${core}`.trim();
}

/** Prompt eki — yalnızca generic inbox üretiminde. */
export function buildGenericInboxRoutingPromptAddon(params: {
  language?: 'english' | 'turkish' | string;
  companyName?: string;
}): string {
  const isEnglish = !String(params.language || 'english')
    .toLowerCase()
    .startsWith('tur');
  const company = String(params.companyName || '').trim();
  const dear = isEnglish
    ? company
      ? `Dear ${company} Team,`
      : 'Dear Team,'
    : company
      ? `Sayın ${company} Ekibi,`
      : 'Sayın Ekip,';
  const thanks = isEnglish ? COLD_EMAIL_ROUTE_THANKS_EN : COLD_EMAIL_ROUTE_THANKS_TR;

  return `
GENERIC INBOX ROUTING (info@ / contact@ / hello@ / sales@ ONLY — apply this EXTRA structure; keep all other cold-email rules above unchanged for the middle body):
1) First line MUST be exactly: ${dear}
2) Second beat (1 short sentence): ask them to forward/route this email to HR or recruiting (${isEnglish ? `"${COLD_EMAIL_ROUTE_ASK_EN}"` : `"${COLD_EMAIL_ROUTE_ASK_TR}"`} or equivalent short wording).
3) Then write the SAME cold-email body logic as usual (researched opening like "I reviewed …" / Turkish equivalent, middle achievements, CTA) — do not invent extra claims.
4) Immediately BEFORE Best regards/Saygılarımla, add exactly: ${thanks}
5) Then Best regards/Saygılarımla + name/title/email/phone/links as usual.
`.trim();
}
