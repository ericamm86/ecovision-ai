const jwtSecret = process.env.JWT_SECRET || process.env.ECOVISION_SESSION_SECRET || "ecovision-demo-secret";

module.exports = {
  jwtSecret
};
