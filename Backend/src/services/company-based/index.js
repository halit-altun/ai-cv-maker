module.exports = {
  runFullOptimizationBundle: require("./fullOptimizationBundle.service")
    .runFullOptimizationBundle,
  extractPdfTextFromBase64: require("./extractPdfText").extractPdfTextFromBase64,
  renderOptimizedCvPdfViaFrontend: require("./renderPdfClient")
    .renderOptimizedCvPdfViaFrontend,
  applyAdaptedCvFromBundle: require("./applyAdaptedCv").applyAdaptedCvFromBundle,
  buildAdaptationNotes: require("./applyAdaptedCv").buildAdaptationNotes,
};
