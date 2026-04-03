async function getUtilization(_query) {
  return [];
}

async function getBookingAnalytics(_query) {
  return [];
}

async function getDepartmentAnalytics(_query) {
  return [];
}

async function exportAnalytics(_query) {
  return {
    format: "csv",
    url: null,
  };
}

module.exports = {
  getUtilization,
  getBookingAnalytics,
  getDepartmentAnalytics,
  exportAnalytics,
};
