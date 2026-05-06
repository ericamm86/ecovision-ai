const riskWords = {
  alta: ["desmatamento", "queimada", "incêndio", "contaminação", "óleo", "tóxica"],
  media: ["lixo", "esgoto", "poluição", "erosão", "odor", "alagamento"],
  baixa: ["ruído", "podas", "entulho", "fumaça"]
};

function normalize(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function analyzeReport({ title = "", description = "", category = "" }) {
  const content = normalize(`${title} ${description} ${category}`);

  const matchedHigh = riskWords.alta.filter((word) => content.includes(normalize(word)));
  const matchedMedium = riskWords.media.filter((word) => content.includes(normalize(word)));
  const matchedLow = riskWords.baixa.filter((word) => content.includes(normalize(word)));

  let risk = "baixo";
  let score = 35;
  let recommendation = "Registrar, acompanhar e orientar a comunidade local.";

  if (matchedHigh.length > 0) {
    risk = "alto";
    score = 90;
    recommendation = "Priorizar vistoria, acionar órgãos ambientais e coletar evidências.";
  } else if (matchedMedium.length > 0) {
    risk = "medio";
    score = 65;
    recommendation = "Encaminhar para triagem técnica e monitorar reincidência.";
  } else if (matchedLow.length > 0) {
    score = 45;
  }

  return {
    risk,
    score,
    keywords: [...matchedHigh, ...matchedMedium, ...matchedLow],
    recommendation
  };
}

module.exports = {
  analyzeReport
};
