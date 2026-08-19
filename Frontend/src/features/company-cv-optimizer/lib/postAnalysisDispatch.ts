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
