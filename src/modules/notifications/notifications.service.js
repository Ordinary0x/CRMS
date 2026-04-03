const repo = require("./notifications.repo");

async function listNotifications(user) {
  return repo.list(user.firebaseUid);
}

async function markAsRead(id) {
  return repo.markRead(id);
}

module.exports = {
  listNotifications,
  markAsRead,
};
