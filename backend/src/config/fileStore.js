const fs = require("fs");
const os = require("os");
const path = require("path");

const dataDir = process.env.VERCEL ? os.tmpdir() : path.join(__dirname, "..", "..", "data");
const dbPath = path.join(dataDir, process.env.VERCEL ? "ecovision-dev-db.json" : "dev-db.json");

const initialData = {
  users: [
    {
      id: 1,
      name: "Ana Verde",
      email: "ana@ecovision.com",
      password_hash: "$2a$10$v/8CGYTZIt5WZLg4gduMDeqrC6qu3SsdOMmwIumoT98cnpIqPr.cW",
      created_at: new Date().toISOString()
    }
  ],
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
