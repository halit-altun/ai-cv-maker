function pickNextPendingJobItem(items, jobStatus, pauseAfterCurrent = false) {
  const list = Array.isArray(items) ? items : [];
  const inProgress = list.find((i) =>
    ["fetching", "analyzing", "sending"].includes(String(i.status || ""))
  );
  const inProgressSendOnly = list.find(
    (i) =>
      ["fetching", "analyzing", "sending"].includes(String(i.status || "")) &&
      i.pipeline === "send_only"
  );
  if (inProgressSendOnly) return inProgressSendOnly;
  if (jobStatus === "paused" || pauseAfterCurrent) {
    if (inProgress) return inProgress;
    return null;
  }
  const sendOnly = list.find(
    (i) => i.status === "pending" && i.pipeline === "send_only"
  );
  if (sendOnly) return sendOnly;
  if (inProgress) return inProgress;
  return list.find((i) => i.status === "pending") || null;
}

/**
 * Company-based tekil gönderimler (send_only) uzun bulk işlerin arkasında beklememeli:
 * kullanıcı ekranda sonucu bekliyor.
 */
function pendingSendOnlyJobFilter() {
  return {
    status: { $in: ["pending", "running"] },
    items: {
      $elemMatch: { status: "pending", pipeline: "send_only" },
    },
  };
}

function enqueueLiveJobFilter(clientId, userId) {
  return {
    clientId,
    userId,
    status: { $in: ["pending", "running"] },
  };
}

function enqueuePausedJobFilter(clientId, userId) {
  return {
    clientId,
    userId,
    status: "paused",
  };
}

function enqueueSendOnlyLiveJobFilter(clientId, userId) {
  return {
    clientId,
    userId,
    status: { $in: ["pending", "running"] },
    items: {
      $not: {
        $elemMatch: {
          pipeline: { $ne: "send_only" },
          status: { $in: ["pending", "fetching", "analyzing", "sending"] },
        },
      },
    },
  };
}

function enqueueSendOnlyPausedJobFilter(clientId, userId) {
  return {
    ...enqueuePausedJobFilter(clientId, userId),
    items: {
      $not: {
        $elemMatch: {
          pipeline: { $ne: "send_only" },
          status: { $in: ["pending", "fetching", "analyzing", "sending"] },
        },
      },
    },
  };
}

function resumePausedJobOnEnqueue(item) {
  return {
    $push: { items: item },
    $set: { status: "pending", pauseAfterCurrent: false, pausedAt: null },
  };
}

module.exports = {
  pickNextPendingJobItem,
  pendingSendOnlyJobFilter,
  enqueueSendOnlyLiveJobFilter,
  enqueueLiveJobFilter,
  enqueuePausedJobFilter,
  enqueueSendOnlyPausedJobFilter,
  resumePausedJobOnEnqueue,
};
