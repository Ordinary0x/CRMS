const repo = require("./analytics.repo");

async function getUtilization(query) {
  return repo.getUtilization(query);
}

async function getBookingAnalytics(query) {
  return repo.getBookingAnalytics(query);
}

async function getDepartmentAnalytics(query) {
  return repo.getDepartmentAnalytics(query);
}

async function exportAnalytics(query) {
  return repo.exportAnalytics(query);
}

module.exports = {
  getUtilization,
  getBookingAnalytics,
  getDepartmentAnalytics,
  exportAnalytics,
};
