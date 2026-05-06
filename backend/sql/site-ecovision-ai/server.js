const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const http = require("node:http");
const path = require("node:path");
const { URL } = require("node:url");

const preferredPort = Number(process.env.PORT || 3000);
const rootDir = __dirname;
const dataDir = path.join(rootDir, "data");
const dbPath = path.join(dataDir, "ecovision-db.json");
const sessionSecret = process.env.ECOVISION_SESSION_SECRET || "ecovision-dev-secret-change-me";
const sessionTtlMs = 1000 * 60 * 60 * 8;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml"
};

async function ensureDb() {
  await fs.mkdir(dataDir, { recursive: true });

  try {
    await fs.access(dbPath);
  } catch (error) {
    await writeDb({ users: [], sessions: [], reports: seedReports(), interestEvents: [] });
  }
}

async function readDb() {
  await ensureDb();
  const db = JSON.parse(await fs.readFile(dbPath, "utf8"));
  db.users ||= [];
  db.sessions ||= [];
  db.reports ||= seedReports();
  db.interestEvents ||= [];
  return db;
}

async function writeDb(db) {
  await fs.writeFile(dbPath, `${JSON.stringify(db, null, 2)}\n`, "utf8");
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
    ...headers
  });
  res.end(body);
}

function sendJson(res, status, payload, headers = {}) {
  send(res, status, JSON.stringify(payload), {
    "Content-Type": "application/json; charset=utf-8",
    ...headers
  });
}

function redirect(res, location) {
  send(res, 302, "", { Location: location });
}

function parseCookies(req) {
  return Object.fromEntries(
    (req.headers.cookie || "")
      .split(";")
      .map((cookie) => cookie.trim().split("="))
      .filter(([key, value]) => key && value)
      .map(([key, value]) => [key, decodeURIComponent(value)])
  );
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.pbkdf2Sync(String(password), salt, 210000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedPassword) {
  const [salt, originalHash] = String(storedPassword).split(":");
  const testHash = hashPassword(password, salt).split(":")[1];
  return crypto.timingSafeEqual(Buffer.from(originalHash, "hex"), Buffer.from(testHash, "hex"));
}

function sign(value) {
  return crypto.createHmac("sha256", sessionSecret).update(value).digest("hex");
}

function createSessionCookie(sessionId) {
  return `ecovision_session=${encodeURIComponent(createSessionToken(sessionId))}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${sessionTtlMs / 1000}`;
}

function clearSessionCookie() {
  return "ecovision_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0";
}

function readSessionToken(req) {
  const authorization = req.headers.authorization || "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : parseCookies(req).ecovision_session;

  if (!token) return null;

  const [sessionId, signature] = token.split(".");
  if (!sessionId || !signature || signature !== sign(sessionId)) return null;
  return sessionId;
}

function createSessionToken(sessionId) {
  return `${sessionId}.${sign(sessionId)}`;
}

async function getCurrentUser(req) {
  const sessionId = readSessionToken(req);
  if (!sessionId) return null;

  const db = await readDb();
  const now = Date.now();
  const session = db.sessions.find((item) => item.id === sessionId && new Date(item.expiresAt).getTime() > now);
  if (!session) return null;

  return db.users.find((user) => user.id === session.userId) || null;
}

async function readJsonBody(req) {
  let body = "";

  for await (const chunk of req) {
    body += chunk;
    if (body.length > 1_000_000) {
      throw new Error("Payload muito grande.");
    }
  }

  return body ? JSON.parse(body) : {};
}

async function serveFile(res, fileName) {
  const filePath = path.join(rootDir, fileName);
  const ext = path.extname(filePath);
  const content = await fs.readFile(filePath);
  send(res, 200, content, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
}

async function register(req, res) {
  const payload = await readJsonBody(req);
  const name = String(payload.name || "").trim();
  const email = normalizeEmail(payload.email);
  const password = String(payload.password || "");

  if (name.length < 2) return sendJson(res, 400, { message: "Informe seu nome." });
  if (!email.includes("@")) return sendJson(res, 400, { message: "Informe um e-mail válido." });
  if (password.length < 6) return sendJson(res, 400, { message: "A senha precisa ter pelo menos 6 caracteres." });

  const db = await readDb();
  if (db.users.some((user) => user.email === email)) {
    return sendJson(res, 409, { message: "Este e-mail já está cadastrado." });
  }

  const user = {
    id: crypto.randomUUID(),
    name,
    email,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString()
  };

  const session = {
    id: crypto.randomUUID(),
    userId: user.id,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + sessionTtlMs).toISOString()
  };

  db.users.push(user);
  db.sessions.push(session);
  await writeDb(db);

  sendJson(res, 201, { user: publicUser(user), token: createSessionToken(session.id) }, { "Set-Cookie": createSessionCookie(session.id) });
}

async function login(req, res) {
  const payload = await readJsonBody(req);
  const email = normalizeEmail(payload.email);
  const password = String(payload.password || "");
  const db = await readDb();
  const user = db.users.find((item) => item.email === email);

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return sendJson(res, 401, { message: "E-mail ou senha inválidos." });
  }

  const session = {
    id: crypto.randomUUID(),
    userId: user.id,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + sessionTtlMs).toISOString()
  };

  db.sessions = db.sessions.filter((item) => new Date(item.expiresAt).getTime() > Date.now());
  db.sessions.push(session);
  await writeDb(db);

  sendJson(res, 200, { user: publicUser(user), token: createSessionToken(session.id) }, { "Set-Cookie": createSessionCookie(session.id) });
}

async function logout(req, res) {
  const sessionId = readSessionToken(req);
  const db = await readDb();
  db.sessions = db.sessions.filter((session) => session.id !== sessionId);
  await writeDb(db);
  sendJson(res, 200, { ok: true }, { "Set-Cookie": clearSessionCookie() });
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt
  };
}

function seedReports() {
  return [
    {
      id: crypto.randomUUID(),
      title: "Cerrado sob pressão no entorno do Plano Piloto",
      description: "Área com vegetação degradada e sinais de descarte irregular próximo a uma via de acesso.",
      location: "Plano Piloto, Brasília - DF",
      category: "Desmatamento",
      severity: "alta",
      status: "em_analise",
      evidence_image: "",
      user_id: null,
      user_name: "EcoVision AI",
      created_at: new Date().toISOString()
    },
    {
      id: crypto.randomUUID(),
      title: "Resíduos próximos ao Lago Paranoá",
      description: "Ponto de descarte identificado em área sensível, com risco de impacto em drenagem urbana.",
      location: "Lago Paranoá, Brasília - DF",
      category: "Resíduos",
      severity: "media",
      status: "pendente",
      evidence_image: "",
      user_id: null,
      user_name: "EcoVision AI",
      created_at: new Date().toISOString()
    }
  ];
}

function createReport(payload, user) {
  return {
    id: crypto.randomUUID(),
    title: String(payload.title || "").trim(),
    description: String(payload.description || "").trim(),
    location: String(payload.location || "").trim(),
    category: String(payload.category || "Poluição").trim(),
    severity: String(payload.severity || "media"),
    status: "pendente",
    evidence_image: String(payload.evidenceImage || payload.evidence_image || ""),
    user_id: user?.id || null,
    user_name: user?.name || "Sem responsável",
    created_at: new Date().toISOString()
  };
}

function reportMatchesFilters(report, filters) {
  return Object.entries(filters).every(([key, value]) => {
    if (!value) return true;
    const reportValue = String(report[key] || "").toLowerCase();
    return reportValue.includes(String(value).toLowerCase());
  });
}

function calculateReportStats(reports) {
  return {
    total_reports: reports.length,
    high_severity: reports.filter((report) => report.severity === "alta").length,
    pending_reports: reports.filter((report) => report.status === "pendente").length,
    monitored_locations: new Set(reports.map((report) => report.location)).size
  };
}

function analyzeEnvironmentalText(payload) {
  const text = `${payload.title || ""} ${payload.description || ""} ${payload.category || ""}`.toLowerCase();
  const rules = [
    { word: "queimada", score: 28 },
    { word: "fogo", score: 28 },
    { word: "desmatamento", score: 24 },
    { word: "cerrado", score: 18 },
    { word: "resíduo", score: 16 },
    { word: "residuos", score: 16 },
    { word: "esgoto", score: 18 },
    { word: "poluição", score: 16 },
    { word: "poluicao", score: 16 },
    { word: "lago", score: 14 }
  ];
  const matched = rules.filter((rule) => text.includes(rule.word));
  const score = Math.min(100, 24 + matched.reduce((total, rule) => total + rule.score, 0));
  const risk = score >= 70 ? "alto" : score >= 45 ? "medio" : "baixo";
  const recommendation = risk === "alto"
    ? "Priorizar vistoria técnica, acionar órgãos responsáveis e anexar evidências adicionais."
    : risk === "medio"
      ? "Manter em análise, acompanhar reincidência e solicitar mais evidências quando necessário."
      : "Registrar ocorrência e manter monitoramento preventivo.";

  return {
    risk,
    score,
    recommendation,
    keywords: matched.map((rule) => rule.word)
  };
}

async function saveInterest(req, res) {
  const payload = await readJsonBody(req);
  const user = await getCurrentUser(req);
  const db = await readDb();

  const event = {
    id: crypto.randomUUID(),
    userId: user?.id || null,
    project: String(payload.project || "EcoVision AI"),
    source: String(payload.source || "landing-page"),
    action: String(payload.action || "interest"),
    createdAt: new Date().toISOString()
  };

  db.interestEvents.push(event);
  await writeDb(db);
  sendJson(res, 201, { event });
}

async function listReports(req, res, url) {
  const user = await getCurrentUser(req);
  if (!user) return sendJson(res, 401, { message: "Não autenticado." });

  const db = await readDb();
  const filters = {
    status: url.searchParams.get("status") || "",
    severity: url.searchParams.get("severity") || "",
    category: url.searchParams.get("category") || "",
    location: url.searchParams.get("location") || ""
  };

  sendJson(res, 200, db.reports.filter((report) => reportMatchesFilters(report, filters)));
}

async function createReportHandler(req, res) {
  const user = await getCurrentUser(req);
  if (!user) return sendJson(res, 401, { message: "Não autenticado." });

  const payload = await readJsonBody(req);
  if (!String(payload.title || "").trim()) return sendJson(res, 400, { message: "Informe o título da denúncia." });
  if (!String(payload.description || "").trim()) return sendJson(res, 400, { message: "Informe a descrição da denúncia." });
  if (!String(payload.location || "").trim()) return sendJson(res, 400, { message: "Informe a localização." });

  const db = await readDb();
  const report = createReport(payload, user);
  db.reports.unshift(report);
  await writeDb(db);
  sendJson(res, 201, report);
}

async function updateReportStatus(req, res, reportId) {
  const user = await getCurrentUser(req);
  if (!user) return sendJson(res, 401, { message: "Não autenticado." });

  const payload = await readJsonBody(req);
  const allowedStatuses = ["pendente", "em_analise", "resolvida", "arquivada"];
  if (!allowedStatuses.includes(payload.status)) return sendJson(res, 400, { message: "Status inválido." });

  const db = await readDb();
  const report = db.reports.find((item) => item.id === reportId);
  if (!report) return sendJson(res, 404, { message: "Denúncia não encontrada." });

  report.status = payload.status;
  report.updated_at = new Date().toISOString();
  await writeDb(db);
  sendJson(res, 200, report);
}

async function reportStats(req, res) {
  const user = await getCurrentUser(req);
  if (!user) return sendJson(res, 401, { message: "Não autenticado." });

  const db = await readDb();
  sendJson(res, 200, calculateReportStats(db.reports));
}

async function analyzeHandler(req, res) {
  const user = await getCurrentUser(req);
  if (!user) return sendJson(res, 401, { message: "Não autenticado." });

  sendJson(res, 200, analyzeEnvironmentalText(await readJsonBody(req)));
}

async function route(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const user = await getCurrentUser(req);

  if (req.method === "OPTIONS") return send(res, 204, "");

  if (req.method === "GET" && url.pathname === "/") return redirect(res, "/ecovision");
  if (req.method === "GET" && url.pathname === "/app") return serveFile(res, "app.html");
  if (req.method === "GET" && (url.pathname.startsWith("/css/") || url.pathname.startsWith("/js/"))) {
    return serveFile(res, url.pathname.slice(1));
  }
  if (req.method === "GET" && url.pathname === "/ecovision") return serveFile(res, "ecovision-ai-apresentacao.html");
  if (req.method === "GET" && url.pathname === "/login") return user ? redirect(res, "/dashboard") : serveFile(res, "login.html");
  if (req.method === "GET" && url.pathname === "/dashboard") return user ? serveFile(res, "dashboard.html") : redirect(res, "/login");
  if (req.method === "GET" && url.pathname === "/api/me") return user ? sendJson(res, 200, { user: publicUser(user) }) : sendJson(res, 401, { message: "Não autenticado." });
  if (req.method === "POST" && url.pathname === "/api/register") return register(req, res);
  if (req.method === "POST" && url.pathname === "/api/login") return login(req, res);
  if (req.method === "POST" && url.pathname === "/api/logout") return logout(req, res);
  if (req.method === "POST" && url.pathname === "/api/interest") return saveInterest(req, res);
  if (req.method === "POST" && url.pathname === "/users/register") return register(req, res);
  if (req.method === "POST" && url.pathname === "/users/login") return login(req, res);
  if (req.method === "GET" && url.pathname === "/reports/stats") return reportStats(req, res);
  if (req.method === "GET" && url.pathname === "/reports") return listReports(req, res, url);
  if (req.method === "POST" && url.pathname === "/reports") return createReportHandler(req, res);
  if (req.method === "POST" && url.pathname === "/analysis") return analyzeHandler(req, res);

  const statusMatch = url.pathname.match(/^\/reports\/([^/]+)\/status$/);
  if (req.method === "PATCH" && statusMatch) return updateReportStatus(req, res, statusMatch[1]);

  if (req.method === "GET" && ["/ecovision-ai-apresentacao.html", "/index.html", "/app.html"].includes(url.pathname)) {
    return serveFile(res, url.pathname.slice(1));
  }

  sendJson(res, 404, { message: "Rota não encontrada." });
}

function createServer() {
  return http.createServer((req, res) => {
    route(req, res).catch((error) => {
      console.error(error);
      sendJson(res, 500, { message: "Erro interno do EcoVision AI." });
    });
  });
}

function listen(port) {
  const server = createServer();

  server
    .listen(port, () => {
      console.log(`EcoVision AI rodando em http://localhost:${port}`);
    })
    .on("error", (error) => {
      if (error.code === "EADDRINUSE" && port < preferredPort + 20) {
        console.log(`Porta ${port} ocupada. Tentando ${port + 1}...`);
        listen(port + 1);
        return;
      }

      throw error;
    });
}

listen(preferredPort);
