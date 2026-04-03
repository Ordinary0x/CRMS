const repo = require("./audit.repo");

async function listAuditLogs(query) {
  return repo.list(query);
}

async function getBookingAuditTrail(id) {
  return repo.bookingTrail(id);
}

module.exports = {
  listAuditLogs,
  getBookingAuditTrail,
};
