async function list(_firebaseUid) {
  return [];
}

async function markRead(id) {
  return {
    notification_id: Number(id),
    read: true,
  };
}

module.exports = {
  list,
  markRead,
};
