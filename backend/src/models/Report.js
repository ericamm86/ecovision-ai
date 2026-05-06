const db = require("../config/db");
const fileStore = require("../config/fileStore");

const useFileDb = process.env.USE_FILE_DB === "true";

function withUserName(report, users) {
  const user = users.find((item) => item.id === report.user_id);
  return {
    ...report,
    user_name: user?.name || null
  };
}

async function create({ title, description, location, category, severity, userId, evidenceImage }) {
  if (useFileDb) {
    const data = fileStore.read();
    const report = {
      id: fileStore.nextId(data.reports),
      title,
      description,
      location,
      category,
      severity,
      status: "pendente",
      user_id: userId,
      evidence_image: evidenceImage || "",
      created_at: new Date().toISOString()
    };

    data.reports.push(report);
    fileStore.write(data);

    return report;
  }

  const result = await db.query(
    `INSERT INTO reports (title, description, location, category, severity, user_id, evidence_image)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [title, description, location, category, severity, userId, evidenceImage || ""]
  );

  return result.rows[0];
}

async function findAll(filters = {}) {
  if (useFileDb) {
    const data = fileStore.read();
    return data.reports
      .filter((report) => !filters.status || report.status === filters.status)
      .filter((report) => !filters.severity || report.severity === filters.severity)
      .filter((report) => {
        return !filters.category || report.category.toLowerCase() === filters.category.toLowerCase();
      })
      .filter((report) => {
        return !filters.location || report.location.toLowerCase().includes(filters.location.toLowerCase());
      })
      .map((report) => withUserName(report, data.users))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  const values = [];
  const conditions = [];

  if (filters.status) {
    values.push(filters.status);
    conditions.push(`reports.status = $${values.length}`);
  }

  if (filters.severity) {
    values.push(filters.severity);
    conditions.push(`reports.severity = $${values.length}`);
  }

  if (filters.category) {
    values.push(filters.category);
    conditions.push(`LOWER(reports.category) = LOWER($${values.length})`);
  }

  if (filters.location) {
    values.push(`%${filters.location}%`);
    conditions.push(`reports.location ILIKE $${values.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await db.query(
    `SELECT reports.*, users.name AS user_name
     FROM reports
     LEFT JOIN users ON users.id = reports.user_id
     ${whereClause}
     ORDER BY reports.created_at DESC`,
    values
  );

  return result.rows;
}

async function updateStatus(id, status) {
  if (useFileDb) {
    const data = fileStore.read();
    const report = data.reports.find((item) => item.id === id);

    if (!report) {
      return null;
    }

    report.status = status;
    fileStore.write(data);
    return report;
  }

  const result = await db.query(
    `UPDATE reports
     SET status = $1
     WHERE id = $2
     RETURNING *`,
    [status, id]
  );

  return result.rows[0];
}

async function getStats() {
  if (useFileDb) {
    const data = fileStore.read();
    const locations = new Set(data.reports.map((report) => report.location));

    return {
      total_reports: data.reports.length,
      high_severity: data.reports.filter((report) => report.severity === "alta").length,
      pending_reports: data.reports.filter((report) => report.status === "pendente").length,
      monitored_locations: locations.size
    };
  }

  const result = await db.query(`
    SELECT
      COUNT(*)::int AS total_reports,
      COUNT(*) FILTER (WHERE severity = 'alta')::int AS high_severity,
      COUNT(*) FILTER (WHERE status = 'pendente')::int AS pending_reports,
      COUNT(DISTINCT location)::int AS monitored_locations
    FROM reports
  `);

  return result.rows[0];
}

module.exports = {
  create,
  findAll,
  updateStatus,
  getStats
};
