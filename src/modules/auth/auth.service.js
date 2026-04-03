const repo = require("./auth.repo");

async function login(authHeader) {
  return repo.upsertFromToken(authHeader);
}

module.exports = {
  login,
};
