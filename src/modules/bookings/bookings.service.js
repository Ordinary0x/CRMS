const repo = require("./bookings.repo");

async function createBooking(user, payload) {
  return repo.create(user, payload);
}

async function listBookings(user, query) {
  return repo.list(user, query);
}

async function getBookingById(id) {
  return repo.getById(id);
}

async function cancelBooking(id) {
  return repo.cancel(id);
}

async function getConflicts(query) {
  return repo.getConflicts(query);
}

module.exports = {
  createBooking,
  listBookings,
  getBookingById,
  cancelBooking,
  getConflicts,
};
