function pickNextPendingJobItem(items, jobStatus, pauseAfterCurrent = false) {
  const list = Array.isArray(items) ? items : [];
  const inProgress = list.find((i) =>
    ["fetching", "analyzing", "sending"].includes(String(i.status || ""))
  );
  if (inProgress) return inProgress;
  if (jobStatus === "paused" || pauseAfterCurrent) return null;
  const sendOnly = list.find(
    (i) => i.status === "pending" && i.pipeline === "send_only"
  );
  if (sendOnly) return sendOnly;
  return list.find((i) => i.status === "pending") || null;
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

function resumePausedJobOnEnqueue(item) {
  return {
    $push: { items: item },
    $set: { status: "pending", pauseAfterCurrent: false, pausedAt: null },
  };
}

module.exports = {
  pickNextPendingJobItem,
  enqueueLiveJobFilter,
  enqueuePausedJobFilter,
  resumePausedJobOnEnqueue,
};
