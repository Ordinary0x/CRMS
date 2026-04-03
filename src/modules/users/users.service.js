const repo = require("./users.repo");

async function getMe(user) {
  return repo.getByFirebaseUid(user.firebaseUid);
}

async function updateRole(id, payload) {
  return repo.updateRole(id, payload.role);
}

async function deactivateUser(id) {
  return repo.deactivate(id);
}

module.exports = {
  getMe,
  updateRole,
  deactivateUser,
};
