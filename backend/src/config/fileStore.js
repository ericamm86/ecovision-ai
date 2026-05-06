const fs = require("fs");
const path = require("path");

const dataDir = path.join(__dirname, "..", "..", "data");
const dbPath = path.join(dataDir, "dev-db.json");

const initialData = {
  users: [],
  reports: [
    {
      id: 1,
      title: "Cerrado sob pressão no entorno do Plano Piloto",
      description: "Área com vegetação degradada e sinais de descarte irregular próximo a uma via de acesso.",
      location: "Plano Piloto, Brasília - DF",
      category: "Queimada",
      severity: "alta",
      status: "pendente",
      evidence_image: "",
      user_id: null,
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      title: "Resíduos próximos ao Lago Paranoá",
      description: "Ponto de descarte identificado em área sensível, com risco de impacto em drenagem urbana.",
      location: "Lago Paranoá, Brasília - DF",
      category: "Resíduos",
      severity: "media",
      status: "pendente",
      evidence_image: "",
      user_id: null,
      created_at: new Date().toISOString()
    },
    {
      id: 3,
      title: "Eixo Monumental com alerta de qualidade do ar",
      description: "Sensores indicam concentração elevada de partículas em horário de pico.",
      location: "Eixo Monumental, Brasília - DF",
      category: "Poluição",
      severity: "media",
      status: "pendente",
      evidence_image: "",
      user_id: null,
      created_at: new Date().toISOString()
    }
  ]
};

function ensureStore() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify(initialData, null, 2));
  }
}

function read() {
  ensureStore();
  return JSON.parse(fs.readFileSync(dbPath, "utf8"));
}

function write(data) {
  ensureStore();
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

function nextId(items) {
  return items.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
}

module.exports = {
  read,
  write,
  nextId
};
