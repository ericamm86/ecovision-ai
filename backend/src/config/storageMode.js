function hasUsableDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return false;
  }

  try {
    const { hostname } = new URL(databaseUrl);
    const isLocalDatabase = ["localhost", "127.0.0.1", "::1"].includes(hostname);

    return !(process.env.VERCEL && isLocalDatabase);
  } catch (error) {
    return false;
  }
}

function shouldUseFileDb() {
  return process.env.USE_FILE_DB === "true" || !hasUsableDatabaseUrl();
}

module.exports = {
  shouldUseFileDb
};
