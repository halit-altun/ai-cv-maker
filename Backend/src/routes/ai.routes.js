const express = require("express");
const { geminiGenerateHandler } = require("../controllers/ai.controller");
const { requireAuth } = require("../middlewares/auth.middleware");
const { requireClientId } = require("../middlewares/client-id.middleware");
const { estimateCompanyBasedTokens, calculateGeminiCost } = require("../utils/token-calculator");

const router = express.Router();

router.use(requireAuth, requireClientId);

router.post("/gemini", geminiGenerateHandler);

/**
 * Token hesaplama endpoint'i (company-based için)
 * POST /api/ai/estimate-tokens
 */
router.post("/estimate-tokens", (req, res) => {
  try {
    const estimate = estimateCompanyBasedTokens(req.body || {});
    const cost = calculateGeminiCost(estimate.inputTokens, estimate.outputTokens, "paid");

    return res.json({
      ok: true,
      ...estimate,
      cost,
      summary: {
        totalTokens: estimate.totalTokens,
        costPerRequest: `$${cost.totalCost.toFixed(4)}`,
        costPer1000: `$${cost.costPer1000Requests.toFixed(2)}`,
      },
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: error.message || "Token hesaplanamadı",
    });
  }
});

module.exports = router;
