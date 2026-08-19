const {
  listTodoItems,
  createTodoItems,
  updateTodoItem,
  deleteTodoItem,
  deleteTodoItemsBulk,
  startTodoJob,
  enqueueCompanySend,
  listTodoJobs,
  getTodoJob,
  setTodoJobStatus,
  getProjectTodoSummary,
  getProjectCompanyResults,
  getTodoProjectSettings,
  updateTodoProjectPrefs,
  upsertTodoProjectCv,
  clearTodoProjectCv,
} = require("../services/todo-application.service");
const { isAppError } = require("../utils/app-error");

function sendError(res, error) {
  if (isAppError(error)) {
    return res.status(error.statusCode || 500).json({
      ok: false,
      message: error.message,
      code: error.code,
      details: error.details ?? undefined,
    });
  }
  return null;
}

async function listItemsHandler(req, res, next) {
  try {
    const projectId = req.query?.projectId;
    if (!projectId) {
      return res.status(400).json({
        ok: false,
        message: "projectId zorunlu.",
        code: "PROJECT_REQUIRED",
      });
    }
    const items = await listTodoItems(req.clientId, projectId);
    return res.json({ ok: true, items });
  } catch (error) {
    if (sendError(res, error)) return undefined;
    return next(error);
  }
}

async function createItemsHandler(req, res, next) {
  try {
    const projectId = req.body?.projectId;
    const itemsInput = req.body?.items ?? req.body?.item;
    if (!projectId) {
      return res.status(400).json({
        ok: false,
        message: "projectId zorunlu.",
        code: "PROJECT_REQUIRED",
      });
    }
    const items = await createTodoItems(
      req.clientId,
      req.user?.id,
      projectId,
      itemsInput
    );
    return res.status(201).json({ ok: true, items });
  } catch (error) {
    if (sendError(res, error)) return undefined;
    return next(error);
  }
}

async function updateItemHandler(req, res, next) {
  try {
    const item = await updateTodoItem(req.clientId, req.params.id, req.body || {});
    return res.json({ ok: true, item });
  } catch (error) {
    if (sendError(res, error)) return undefined;
    return next(error);
  }
}

async function deleteItemHandler(req, res, next) {
  try {
    const result = await deleteTodoItem(req.clientId, req.params.id);
    return res.json(result);
  } catch (error) {
    if (sendError(res, error)) return undefined;
    return next(error);
  }
}

async function deleteItemsBulkHandler(req, res, next) {
  try {
    const result = await deleteTodoItemsBulk(
      req.clientId,
      req.body?.projectId,
      req.body?.itemIds
    );
    return res.json(result);
  } catch (error) {
    if (sendError(res, error)) return undefined;
    return next(error);
  }
}

async function projectSummaryHandler(req, res, next) {
  try {
    const summary = await getProjectTodoSummary(req.clientId, req.params.projectId);
    return res.json({ ok: true, ...summary });
  } catch (error) {
    if (sendError(res, error)) return undefined;
    return next(error);
  }
}

async function projectCompanyResultsHandler(req, res, next) {
  try {
    const result = await getProjectCompanyResults(req.clientId, req.params.projectId, {
      limit: req.query?.limit,
    });
    return res.json({ ok: true, ...result });
  } catch (error) {
    if (sendError(res, error)) return undefined;
    return next(error);
  }
}

/**
 * Analiz et / toplu iş başlat.
 * mode: analyze_and_send (mail dahil, proje CV zorunlu) | analyze_only
 */
async function startJobHandler(req, res, next) {
  try {
    const job = await startTodoJob(req.clientId, req.user?.id, req.body || {});
    return res.status(201).json({
      ok: true,
      message:
        job.mode === "analyze_only"
          ? "Toplu analiz işi başlatıldı. Sayfa kapansa da devam eder."
          : "Toplu başvuru işi başlatıldı. Proje CV’si ile sırayla gönderilir; sayfa kapansa da devam eder.",
      job,
    });
  } catch (error) {
    if (sendError(res, error)) return undefined;
    return next(error);
  }
}

/** Kuyruğa alma sonucunu kullanıcıya tek cümlede net anlat (bekleme, sıra, uyarılar). */
function buildEnqueueMessage(result) {
  const parts = [
    result.dispatchedImmediately
      ? `${result.queuedRecipientCount} alıcı, otomatik gönderimle aynı doğrulamadan geçti; SMTP sırası Profilim aralığına göre tek işte planlandı.`
      : `${result.queuedRecipientCount} alıcı aralıklı gönderim kuyruğuna alındı.`,
  ];

  if (Number(result.sentCount || 0) > 0) {
    parts.push(`${result.sentCount} mail hemen gönderildi.`);
  }
  if (Number(result.queuedCount || 0) > 0) {
    parts.push(`${result.queuedCount} mail profil aralığına göre sıraya yazıldı.`);
  }

  if (Array.isArray(result.warnings) && result.warnings.length) {
    parts.push(...result.warnings);
  }

  return parts.join(" ");
}

async function enqueueCompanySendHandler(req, res, next) {
  try {
    const result = await enqueueCompanySend(
      req.clientId,
      req.user?.id,
      req.body || {}
    );
    return res.status(201).json({
      ok: true,
      message: buildEnqueueMessage(result),
      ...result,
    });
  } catch (error) {
    if (sendError(res, error)) return undefined;
    return next(error);
  }
}

async function getProjectCvHandler(req, res, next) {
  try {
    const cv = await getTodoProjectSettings(req.clientId, req.params.projectId);
    return res.json({ ok: true, cv });
  } catch (error) {
    if (sendError(res, error)) return undefined;
    return next(error);
  }
}

async function updateProjectPrefsHandler(req, res, next) {
  try {
    const cv = await updateTodoProjectPrefs(
      req.clientId,
      req.user?.id,
      req.params.projectId,
      req.body || {}
    );
    return res.json({
      ok: true,
      message: "Proje tercihleri kaydedildi.",
      cv,
      settings: {
        bulkSendHistoryFilter: cv.bulkSendHistoryFilter,
      },
    });
  } catch (error) {
    if (sendError(res, error)) return undefined;
    return next(error);
  }
}

async function uploadProjectCvHandler(req, res, next) {
  try {
    const cv = await upsertTodoProjectCv(
      req.clientId,
      req.user?.id,
      req.params.projectId,
      req.body || {}
    );
    return res.json({
      ok: true,
      message: "Proje CV’si kaydedildi.",
      cv,
    });
  } catch (error) {
    if (sendError(res, error)) return undefined;
    return next(error);
  }
}

async function deleteProjectCvHandler(req, res, next) {
  try {
    const cv = await clearTodoProjectCv(req.clientId, req.params.projectId);
    return res.json({ ok: true, message: "Proje CV’si silindi.", cv });
  } catch (error) {
    if (sendError(res, error)) return undefined;
    return next(error);
  }
}

async function listJobsHandler(req, res, next) {
  try {
    const jobs = await listTodoJobs(req.clientId, {
      projectId: req.query?.projectId,
      limit: req.query?.limit,
    });
    return res.json({ ok: true, jobs });
  } catch (error) {
    if (sendError(res, error)) return undefined;
    return next(error);
  }
}

async function getJobHandler(req, res, next) {
  try {
    const job = await getTodoJob(req.clientId, req.params.id, {
      refreshTracking: req.query?.refreshTracking !== "false",
    });
    return res.json({ ok: true, job });
  } catch (error) {
    if (sendError(res, error)) return undefined;
    return next(error);
  }
}

async function pauseJobHandler(req, res, next) {
  try {
    const job = await setTodoJobStatus(req.clientId, req.params.id, "paused");
    return res.json({ ok: true, job });
  } catch (error) {
    if (sendError(res, error)) return undefined;
    return next(error);
  }
}

async function resumeJobHandler(req, res, next) {
  try {
    const job = await setTodoJobStatus(req.clientId, req.params.id, "running");
    return res.json({ ok: true, job });
  } catch (error) {
    if (sendError(res, error)) return undefined;
    return next(error);
  }
}

async function cancelJobHandler(req, res, next) {
  try {
    const job = await setTodoJobStatus(req.clientId, req.params.id, "cancelled");
    return res.json({ ok: true, job });
  } catch (error) {
    if (sendError(res, error)) return undefined;
    return next(error);
  }
}

module.exports = {
  listItemsHandler,
  createItemsHandler,
  updateItemHandler,
  deleteItemHandler,
  deleteItemsBulkHandler,
  projectSummaryHandler,
  projectCompanyResultsHandler,
  startJobHandler,
  enqueueCompanySendHandler,
  listJobsHandler,
  getJobHandler,
  pauseJobHandler,
  resumeJobHandler,
  cancelJobHandler,
  getProjectCvHandler,
  updateProjectPrefsHandler,
  uploadProjectCvHandler,
  deleteProjectCvHandler,
};
