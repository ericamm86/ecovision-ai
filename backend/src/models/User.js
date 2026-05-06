const db = require("../config/db");
const fileStore = require("../config/fileStore");

const useFileDb = process.env.USE_FILE_DB === "true";

async function create({ name, email, passwordHash }) {
  if (useFileDb) {
    const data = fileStore.read();
    const user = {
      id: fileStore.nextId(data.users),
      name,
      email,
      password_hash: passwordHash,
      created_at: new Date().toISOString()
    };

    data.users.push(user);
    fileStore.write(data);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      created_at: user.created_at
    };
  }

  const result = await db.query(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, name, email, created_at`,
    [name, email, passwordHash]
  );

  return result.rows[0];
}

async function findByEmail(email) {
  if (useFileDb) {
    const data = fileStore.read();
    return data.users.find((user) => user.email.toLowerCase() === email.toLowerCase());
  }

  const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
  return result.rows[0];
}

async function findAll() {
  if (useFileDb) {
    const data = fileStore.read();
    return data.users
      .map(({ password_hash, ...user }) => user)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  const result = await db.query(
    "SELECT id, name, email, created_at FROM users ORDER BY created_at DESC"
  );
  return result.rows;
}

module.exports = {
  create,
  findByEmail,
  findAll
};
