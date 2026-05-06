const Report = require("../models/Report");

const allowedStatuses = ["pendente", "em_analise", "resolvida", "arquivada"];
const allowedSeverities = ["baixa", "media", "alta"];
const allowedImagePattern = /^data:image\/(png|jpe?g|webp);base64,/i;
const maxEvidenceImageSize = 3 * 1024 * 1024;

function normalizeFilters(query) {
  return {
    status: allowedStatuses.includes(query.status) ? query.status : "",
    severity: allowedSeverities.includes(query.severity) ? query.severity : "",
    category: query.category || "",
    location: query.location || ""
  };
}

async function create(req, res) {
  try {
    const { title, description, location, category, severity = "media", evidenceImage = "" } = req.body;

    if (!title || !description || !location || !category) {
      return res.status(400).json({
        message: "Título, descrição, localização e categoria são obrigatórios."
      });
    }

    if (evidenceImage && !allowedImagePattern.test(evidenceImage)) {
      return res.status(400).json({ message: "A evidência deve ser uma imagem PNG, JPG ou WebP." });
    }

    if (evidenceImage && evidenceImage.length > maxEvidenceImageSize) {
      return res.status(400).json({ message: "A imagem deve ter no máximo 3 MB." });
    }

    const report = await Report.create({
      title,
      description,
      location,
      category,
      severity,
      userId: req.user.id,
      evidenceImage
    });

    return res.status(201).json(report);
  } catch (error) {
    return res.status(500).json({ message: "Erro ao criar denúncia.", error: error.message });
  }
}

async function list(req, res) {
  try {
    const reports = await Report.findAll(normalizeFilters(req.query));
    return res.json(reports);
  } catch (error) {
    return res.status(500).json({ message: "Erro ao listar denúncias.", error: error.message });
  }
}

async function updateStatus(req, res) {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "Id da denúncia inválido." });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Status inválido." });
    }

    const report = await Report.updateStatus(id, status);

    if (!report) {
      return res.status(404).json({ message: "Denúncia não encontrada." });
    }

    return res.json(report);
  } catch (error) {
    return res.status(500).json({ message: "Erro ao atualizar status.", error: error.message });
  }
}

async function stats(req, res) {
  try {
    const data = await Report.getStats();
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ message: "Erro ao buscar indicadores.", error: error.message });
  }
}

module.exports = {
  create,
  list,
  updateStatus,
  stats
};
