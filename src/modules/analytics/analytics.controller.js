const service = require("./analytics.service");

async function getUtilization(req, res, next) {
  try {
    const result = await service.getUtilization(req.query);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function getBookingAnalytics(req, res, next) {
  try {
    const result = await service.getBookingAnalytics(req.query);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function getDepartmentAnalytics(req, res, next) {
  try {
    const result = await service.getDepartmentAnalytics(req.query);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function exportAnalytics(req, res, next) {
  try {
    const result = await service.exportAnalytics(req.query);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getUtilization,
  getBookingAnalytics,
  getDepartmentAnalytics,
  exportAnalytics,
};
