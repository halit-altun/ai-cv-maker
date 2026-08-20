export type PostAnalysisDispatchInput = {
  shouldSendCompanyEmail: boolean;
  autoSendOutreachAfterAnalysis: boolean;
  queuedIntervalOutreach: boolean;
  hasColdEmailBody: boolean;
  recipientCount: number;
  hasOutreachProjectId: boolean;
};

export type PostAnalysisDispatchSkipReason =
  | 'mail_disabled'
  | 'manual_preview'
  | 'no_cold_email'
  | 'no_recipient'
  | 'project_required';

export type PostAnalysisDispatchPlan = {
  mailDispatchEnabled: boolean;
  shouldGenerateColdEmail: boolean;
  shouldDispatch: boolean;
  mode: 'enqueue' | 'http' | 'none';
  stayOnAnalysisUntilDispatch: boolean;
  goToPreviewIfDispatchFails: boolean;
  requiresProject: boolean;
  skipReason: PostAnalysisDispatchSkipReason | null;
};

const SKIP_MESSAGES: Record<PostAnalysisDispatchSkipReason, string> = {
  mail_disabled:
    'Analiz tamamlandı. Mail gönderimi kapalı olduğu için gönderim yapılmadı — "Hedef firmaya mail gönder" kutusunu işaretleyin.',
  manual_preview:
    'Analiz tamamlandı. Profilde otomatik/aralıklı gönderim kapalı; maili Önizleme adımından kendiniz gönderebilirsiniz.',
  no_cold_email:
    'Analiz tamamlandı ama AI cold mail gövdesi üretemediği için gönderim yapılmadı. Önizleme adımından "Yeniden üret" ile deneyin.',
  no_recipient:
    'Analiz tamamlandı ama alıcı adresi üretilemediği için gönderim yapılmadı. Firma domainini ve e-posta prefix kategorilerini kontrol edin.',
  project_required:
    'Analiz tamamlandı ama aralıklı kuyruk için outreach projesi seçilmediğinden gönderim yapılmadı. Analiz adımından bir proje seçin.',
};

export function describeDispatchSkip(
  reason: PostAnalysisDispatchSkipReason | null
): string | null {
  return reason ? SKIP_MESSAGES[reason] : null;
}

export function formatDispatchVerifyNotice(result: {
  message?: string;
  verifySummary?: string;
  selectedRecipients?: string[];
  verification?: {
    checks?: Array<{
      email: string;
      isValid: boolean;
      provider?: string;
      result?: string;
    }>;
  };
  results?: Array<{ email?: string; status?: string; errorMessage?: string }>;
}): { text: string; severity: 'success' | 'warning' } {
  const summary = String(result.verifySummary || '').trim();
  if (summary) {
    const rejected = /\bGeçmeyen \(([1-9]\d*)\)/.test(summary);
    return { text: summary, severity: rejected ? 'warning' : 'success' };
  }

  const checks = result.verification?.checks || [];
  const rows = result.results || [];
  const passed = checks.filter((c) => c.isValid).map((c) => c.email);
  const failed = checks.filter((c) => !c.isValid).map((c) => c.email);
  const queued = rows.filter((r) => r.status === 'queued').map((r) => r.email).filter(Boolean);
  const sent = rows.filter((r) => r.status === 'sent').map((r) => r.email).filter(Boolean);
  const parts: string[] = [];
  if (passed.length) parts.push(`Geçen (${passed.length}): ${passed.join(', ')}.`);
  if (failed.length) parts.push(`Geçmeyen (${failed.length}): ${failed.join(', ')}.`);
  if (sent.length) parts.push(`${sent.length} mail hemen gitti.`);
  if (queued.length) parts.push(`${queued.length} mail sıraya yazıldı.`);
  if (!parts.length && result.message) {
    return { text: result.message, severity: 'success' };
  }
  const extra = result.message ? ` ${result.message}` : '';
  return {
    text: `${parts.join(' ')}${extra}`.trim(),
    severity: failed.length ? 'warning' : 'success',
  };
}

/**
 * Analiz bittiğinde mail üretilsin/gönderilsin mi?
 * Profilde otomatik veya aralıklı kuyruk açıksa checkbox kapalı olsa da gönderim aktif sayılır.
 */
export function planPostAnalysisDispatch(
  input: PostAnalysisDispatchInput
): PostAnalysisDispatchPlan {
  const mailDispatchEnabled = Boolean(
    input.shouldSendCompanyEmail ||
      input.autoSendOutreachAfterAnalysis ||
      input.queuedIntervalOutreach
  );
  const wantsAutoOrQueue = Boolean(
    input.autoSendOutreachAfterAnalysis || input.queuedIntervalOutreach
  );
  const skipReason: PostAnalysisDispatchSkipReason | null = !mailDispatchEnabled
    ? 'mail_disabled'
    : !wantsAutoOrQueue
      ? 'manual_preview'
      : !input.hasColdEmailBody
        ? 'no_cold_email'
        : input.recipientCount <= 0
          ? 'no_recipient'
          : input.queuedIntervalOutreach && !input.hasOutreachProjectId
            ? 'project_required'
            : null;

  const canDispatch = skipReason === null;

  const mode: PostAnalysisDispatchPlan['mode'] = !canDispatch
    ? 'none'
    : input.queuedIntervalOutreach
      ? 'enqueue'
      : 'http';

  // Kuyruk modu gönderim başarısız olursa kullanıcı Önizleme'de manuel deneyebilmeli
  const queueModeIntended = mailDispatchEnabled && input.queuedIntervalOutreach;

  return {
    mailDispatchEnabled,
    shouldGenerateColdEmail: mailDispatchEnabled,
    shouldDispatch: canDispatch,
    mode,
    stayOnAnalysisUntilDispatch: mode === 'enqueue',
    goToPreviewIfDispatchFails: queueModeIntended,
    requiresProject: queueModeIntended,
    skipReason,
  };
}

export function pickNextPendingJobItem<
  T extends { status?: string; pipeline?: string },
>(items: T[], jobStatus: string, pauseAfterCurrent = false): T | null {
  const list = Array.isArray(items) ? items : [];
  const inProgress = list.find((i) =>
    ['fetching', 'analyzing', 'sending'].includes(String(i.status || ''))
  );
  if (inProgress) return inProgress;
  if (jobStatus === 'paused' || pauseAfterCurrent) return null;
  const sendOnly = list.find(
    (i) => i.status === 'pending' && i.pipeline === 'send_only'
  );
  if (sendOnly) return sendOnly;
  return list.find((i) => i.status === 'pending') || null;
}
