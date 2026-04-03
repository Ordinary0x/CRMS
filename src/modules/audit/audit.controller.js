const service = require("./audit.service");

async function listAuditLogs(req, res, next) {
  try {
    const result = await service.listAuditLogs(req.query);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function getBookingAuditTrail(req, res, next) {
  try {
    const result = await service.getBookingAuditTrail(req.params.id);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listAuditLogs,
  getBookingAuditTrail,
};
