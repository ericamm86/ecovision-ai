const { analyzeReport } = require("../services/analysisService");

async function analyze(req, res) {
  const result = analyzeReport(req.body);
  return res.json(result);
}

module.exports = {
  analyze
};
