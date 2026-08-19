export type PostAnalysisDispatchInput = {
  shouldSendCompanyEmail: boolean;
  autoSendOutreachAfterAnalysis: boolean;
  queuedIntervalOutreach: boolean;
  hasColdEmailBody: boolean;
  recipientCount: number;
  hasOutreachProjectId: boolean;
};

export type PostAnalysisDispatchPlan = {
  mailDispatchEnabled: boolean;
  shouldGenerateColdEmail: boolean;
  shouldDispatch: boolean;
  mode: 'enqueue' | 'http' | 'none';
  stayOnAnalysisUntilDispatch: boolean;
  goToPreviewIfDispatchFails: boolean;
  requiresProject: boolean;
};

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
  const canDispatch =
    mailDispatchEnabled &&
    wantsAutoOrQueue &&
    input.hasColdEmailBody &&
    input.recipientCount > 0;

  const mode: PostAnalysisDispatchPlan['mode'] = !canDispatch
    ? 'none'
    : input.queuedIntervalOutreach
      ? 'enqueue'
      : 'http';

  return {
    mailDispatchEnabled,
    shouldGenerateColdEmail: mailDispatchEnabled,
    shouldDispatch: canDispatch,
    mode,
    stayOnAnalysisUntilDispatch: mode === 'enqueue',
    goToPreviewIfDispatchFails: mode === 'enqueue',
    requiresProject: mode === 'enqueue',
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
