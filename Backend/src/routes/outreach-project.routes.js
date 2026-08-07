const express = require("express");
const {
  listProjectsHandler,
  createProjectHandler,
  selectProjectHandler,
  deleteProjectHandler,
  projectDashboardHandler,
} = require("../controllers/outreach-project.controller");
const { requireAuth } = require("../middlewares/auth.middleware");
const { requireClientId } = require("../middlewares/client-id.middleware");

const router = express.Router();

router.use(requireAuth, requireClientId);

router.get("/", listProjectsHandler);
router.post("/", createProjectHandler);
router.post("/:id/select", selectProjectHandler);
router.delete("/:id", deleteProjectHandler);
router.get("/:id/dashboard", projectDashboardHandler);

module.exports = router;
