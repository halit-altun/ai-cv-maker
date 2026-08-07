const express = require("express");
const {
  getDashboardHandler,
  getDashboardInsightsHandler,
} = require("../controllers/dashboard.controller");
const { requireAuth } = require("../middlewares/auth.middleware");
const { requireClientId } = require("../middlewares/client-id.middleware");

const router = express.Router();

router.use(requireAuth, requireClientId);

router.get("/", getDashboardHandler);
router.get("/insights", getDashboardInsightsHandler);

module.exports = router;
