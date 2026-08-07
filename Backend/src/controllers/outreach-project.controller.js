const {
  listProjects,
  createProject,
  selectProject,
  deleteProject,
  getProjectDashboard,
} = require("../services/outreach-project.service");
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

async function listProjectsHandler(req, res, next) {
  try {
    const result = await listProjects(req.clientId, req.user?.id);
    return res.json({ ok: true, ...result });
  } catch (error) {
    if (sendError(res, error)) return undefined;
    return next(error);
  }
}

async function createProjectHandler(req, res, next) {
  try {
    const project = await createProject(req.clientId, req.user?.id, req.body?.name);
    return res.status(201).json({ ok: true, project });
  } catch (error) {
    if (sendError(res, error)) return undefined;
    return next(error);
  }
}

async function selectProjectHandler(req, res, next) {
  try {
    const project = await selectProject(req.clientId, req.user?.id, req.params.id);
    return res.json({ ok: true, project, lastSelectedId: project.id });
  } catch (error) {
    if (sendError(res, error)) return undefined;
    return next(error);
  }
}

async function deleteProjectHandler(req, res, next) {
  try {
    const result = await deleteProject(req.clientId, req.params.id);
    return res.json({ ok: true, ...result });
  } catch (error) {
    if (sendError(res, error)) return undefined;
    return next(error);
  }
}

async function projectDashboardHandler(req, res, next) {
  try {
    const result = await getProjectDashboard(req.clientId, req.params.id, {
      range: req.query?.range,
      from: req.query?.from,
      to: req.query?.to,
    });
    return res.json({ ok: true, ...result });
  } catch (error) {
    if (sendError(res, error)) return undefined;
    return next(error);
  }
}

module.exports = {
  listProjectsHandler,
  createProjectHandler,
  selectProjectHandler,
  deleteProjectHandler,
  projectDashboardHandler,
};
