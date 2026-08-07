const express = require("express");
const {
  optimizeBundleHandler,
} = require("../controllers/company-based.controller");
const { requireAuth } = require("../middlewares/auth.middleware");
const { requireClientId } = require("../middlewares/client-id.middleware");

const router = express.Router();

router.use(requireAuth, requireClientId);

router.post("/optimize-bundle", optimizeBundleHandler);

module.exports = router;
