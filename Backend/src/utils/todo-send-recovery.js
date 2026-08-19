/** Doğrulama + SMTP kuyruğa yazma bu süreden uzun sürebilir; bitmeden “gönderildi” sayma. */
const LIVE_SEND_GRACE_MS = 4 * 60 * 1000;

const ASSUMED_SENT_STEP = "sent_assumed_after_interrupt";

function isLiveDispatchInProgress(item, now = Date.now()) {
  if (String(item?.status || "") !== "sending") return false;
  const started = item.mailDispatchStartedAt || item.startedAt;
  if (!started) return false;
  const t = new Date(started).getTime();
  if (!Number.isFinite(t)) return false;
  return now - t < LIVE_SEND_GRACE_MS;
}

function hasMailEvidence({ queueDoc, logDoc, item } = {}) {
  if (queueDoc) return true;
  if (logDoc) return true;
  if (item?.outreachLogId) return true;
  if (Array.isArray(item?.mailIds) && item.mailIds.length > 0) return true;
  if (Number(item?.sentCount || 0) > 0) return true;
  if (Number(item?.queuedCount || 0) > 0) return true;
  return false;
}

/**
 * sending durumunda ne yapılacağı.
 * mailDispatchStartedAt tek başına kanıt değildir — doğrulama bitmeden de yazılır.
 */
function decideSendingRecovery({ item, queueDoc, logDoc, now = Date.now() } = {}) {
  if (isLiveDispatchInProgress(item, now)) {
    return { action: "wait", reason: "live_dispatch" };
  }
  if (hasMailEvidence({ queueDoc, logDoc, item })) {
    return { action: "recover_from_evidence", reason: "queue_or_log" };
  }
  const body = String(item?.coldEmailBody || "").trim();
  const recipients = Array.isArray(item?.selectedRecipients)
    ? item.selectedRecipients
    : [];
  if (body && recipients.length > 0) {
    return { action: "resume_send", reason: "no_mail_evidence" };
  }
  return { action: "fail_interrupted", reason: "incomplete_item" };
}

function shouldReopenAssumedSentItem(item) {
  if (!item) return false;
  if (String(item.step || "") !== ASSUMED_SENT_STEP) return false;
  if (hasMailEvidence({ item })) return false;
  const body = String(item.coldEmailBody || "").trim();
  const recipients = Array.isArray(item.selectedRecipients)
    ? item.selectedRecipients
    : [];
  return Boolean(body && recipients.length > 0);
}

function reopenAssumedSentItem(item) {
  item.status = "pending";
  item.step = "queued_send_only";
  item.completedAt = undefined;
  item.errorMessage = "";
  item.errorCode = "";
  item.mailDispatchStartedAt = undefined;
  return item;
}

module.exports = {
  LIVE_SEND_GRACE_MS,
  ASSUMED_SENT_STEP,
  isLiveDispatchInProgress,
  hasMailEvidence,
  decideSendingRecovery,
  shouldReopenAssumedSentItem,
  reopenAssumedSentItem,
};
