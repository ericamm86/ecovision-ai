const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { jwtSecret } = require("../config/auth");

function createError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeUserInput({ name, email, password } = {}) {
  return {
    name: String(name || "").trim(),
    email: String(email || "").trim().toLowerCase(),
    password: String(password || "")
  };
}

function buildAuthResponse(user) {
  const publicUser = {
    id: user.id,
    name: user.name,
    email: user.email
  };

  const token = jwt.sign(publicUser, jwtSecret, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d"
  });

  return {
    token,
    user: publicUser
  };
}

async function registerUser(payload) {
  const { name, email, password } = normalizeUserInput(payload);

  if (!name || !email || !password) {
    throw createError(400, "Nome, email e senha sao obrigatorios.");
  }

  const existingUser = await User.findByEmail(email);
  if (existingUser) {
    throw createError(409, "Email ja cadastrado.");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, passwordHash });

  return buildAuthResponse(user);
}

async function loginUser(payload) {
  const { email, password } = normalizeUserInput(payload);

  if (!email || !password) {
    throw createError(400, "Email e senha sao obrigatorios.");
  }

  const user = await User.findByEmail(email);
  if (!user) {
    throw createError(401, "Credenciais invalidas.");
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) {
    throw createError(401, "Credenciais invalidas.");
  }

  return buildAuthResponse(user);
}

async function listUsers() {
  return User.findAll();
}

module.exports = {
  registerUser,
  loginUser,
  listUsers
};
