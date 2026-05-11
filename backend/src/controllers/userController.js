const userService = require("../services/userService");

function handleError(res, error, fallbackMessage) {
  const statusCode = error.statusCode || 500;

  return res.status(statusCode).json({
    message: statusCode === 500 ? fallbackMessage : error.message,
    error: statusCode === 500 ? error.message : undefined
  });
}

async function register(req, res) {
  try {
    const data = await userService.registerUser(req.body);
    return res.status(201).json(data);
  } catch (error) {
    return handleError(res, error, "Erro ao cadastrar usuario.");
  }
}

async function login(req, res) {
  try {
    const data = await userService.loginUser(req.body);
    return res.json(data);
  } catch (error) {
    return handleError(res, error, "Erro ao autenticar usuario.");
  }
}

async function list(req, res) {
  try {
    const users = await userService.listUsers();
    return res.json(users);
  } catch (error) {
    return handleError(res, error, "Erro ao listar usuarios.");
  }
}

module.exports = {
  register,
  login,
  list
};
