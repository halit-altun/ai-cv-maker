const express = require("express");
const {
  sendCompanyEmailHandler,
  checkDomainHandler,
  quotaHandler,
  listLogsHandler,
  listCompaniesHandler,
  getLogHandler,
  createAiErrorLogHandler,
  createAnalysisOnlyLogHandler,
  verifyEmailsHandler,
  emailVerifyQuotaHandler,
  checkDeliverabilityHandler,
} = require("../controllers/outreach.controller");
const { requireAuth } = require("../middlewares/auth.middleware");
const { requireClientId } = require("../middlewares/client-id.middleware");

const router = express.Router();

router.use(requireAuth, requireClientId);

router.post("/company-email", sendCompanyEmailHandler);
router.post("/verify-emails", verifyEmailsHandler);
router.post("/ai-error", createAiErrorLogHandler);
router.post("/analysis-only", createAnalysisOnlyLogHandler);
router.post("/check-deliverability", checkDeliverabilityHandler);
router.get("/check-domain", checkDomainHandler);
router.get("/quota", quotaHandler);
router.get("/emailverify-quota", emailVerifyQuotaHandler);
router.get("/logs", listLogsHandler);
router.get("/companies", listCompaniesHandler);
router.get("/logs/:id", getLogHandler);

module.exports = router;
