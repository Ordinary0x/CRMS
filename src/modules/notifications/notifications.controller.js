const service = require("./notifications.service");

async function listNotifications(req, res, next) {
  try {
    const result = await service.listNotifications(req.user);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function markAsRead(req, res, next) {
  try {
    const result = await service.markAsRead(req.params.id);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listNotifications,
  markAsRead,
};
