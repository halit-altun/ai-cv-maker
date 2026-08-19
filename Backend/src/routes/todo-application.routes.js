const express = require("express");
const {
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
  uploadProjectCvHandler,
  deleteProjectCvHandler,
  updateProjectPrefsHandler,
} = require("../controllers/todo-application.controller");
const { requireAuth } = require("../middlewares/auth.middleware");
const { requireClientId } = require("../middlewares/client-id.middleware");

const router = express.Router();

router.use(requireAuth, requireClientId);

/** Proje altındaki firma satırları */
router.get("/items", listItemsHandler);
router.post("/items", createItemsHandler);
router.patch("/items/:id", updateItemHandler);
router.delete("/items/:id", deleteItemHandler);
router.post("/items/bulk-delete", deleteItemsBulkHandler);

/** Proje özeti + CV + firma sonuçları */
router.get("/projects/:projectId/summary", projectSummaryHandler);
router.get("/projects/:projectId/company-results", projectCompanyResultsHandler);
router.get("/projects/:projectId/cv", getProjectCvHandler);
router.put("/projects/:projectId/cv", uploadProjectCvHandler);
router.delete("/projects/:projectId/cv", deleteProjectCvHandler);
router.patch("/projects/:projectId/settings", updateProjectPrefsHandler);

/** Arka plan işleri */
router.post("/jobs", startJobHandler);
router.post("/jobs/enqueue-company-send", enqueueCompanySendHandler);
router.get("/jobs", listJobsHandler);
router.get("/jobs/:id", getJobHandler);
router.post("/jobs/:id/pause", pauseJobHandler);
router.post("/jobs/:id/resume", resumeJobHandler);
router.post("/jobs/:id/cancel", cancelJobHandler);

module.exports = router;
