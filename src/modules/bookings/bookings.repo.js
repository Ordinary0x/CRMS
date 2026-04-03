async function create(user, payload) {
  return {
    booking_id: 1,
    requested_by: user.firebaseUid,
    ...payload,
    status: "pending",
  };
}

async function list(_user, _query) {
  return [];
}

async function getById(id) {
  return {
    booking_id: Number(id),
  };
}

async function cancel(id) {
  return {
    booking_id: Number(id),
    status: "cancelled",
  };
}

async function getConflicts(_query) {
  return {
    conflicts: [],
  };
}

module.exports = {
  create,
  list,
  getById,
  cancel,
  getConflicts,
};
