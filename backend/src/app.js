require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const userRoutes = require("./routes/userRoutes");
const reportRoutes = require("./routes/reportRoutes");
const analysisRoutes = require("./routes/analysisRoutes");
const { getExternalEnvironmentData } = require("./services/externalEnvironmentService");

const app = express();
const projectRoot = path.resolve(__dirname, "..", "..");
const frontendDir = path.join(projectRoot, "frontend");
const landingDir = path.join(projectRoot, "backend", "sql", "site-ecovision-ai");

app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use("/css", express.static(path.join(frontendDir, "css")));
app.use("/js", express.static(path.join(frontendDir, "js")));

app.get("/", (req, res) => {
  res.sendFile(path.join(landingDir, "ecovision-ai-apresentacao.html"));
});

app.get("/ecovision", (req, res) => {
  res.sendFile(path.join(landingDir, "ecovision-ai-apresentacao.html"));
});

app.get("/app", (req, res) => {
  res.sendFile(path.join(frontendDir, "index.html"));
});

app.get("/health", (req, res) => {
  res.json({
    name: "EcoVision AI",
    status: "online",
    routes: ["/", "/ecovision", "/app", "/health", "/external/environment", "/users", "/reports", "/analysis"]
  });
});

app.get("/external/environment", async (req, res) => {
  const data = await getExternalEnvironmentData();
  res.json(data);
});

app.use("/users", userRoutes);
app.use("/reports", reportRoutes);
app.use("/analysis", analysisRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Rota não encontrada." });
});

module.exports = app;
