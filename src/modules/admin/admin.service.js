const repo = require("./admin.repo");

async function listUsers() {
  return repo.listUsers();
}

async function createBlackout(payload) {
  return repo.createBlackout(payload);
}

async function listBlackouts() {
  return repo.listBlackouts();
}

async function deleteBlackout(id) {
  return repo.deleteBlackout(id);
}

async function overrideBooking(id, payload) {
  return repo.overrideBooking(id, payload);
}

module.exports = {
  listUsers,
  createBlackout,
  listBlackouts,
  deleteBlackout,
  overrideBooking,
};
