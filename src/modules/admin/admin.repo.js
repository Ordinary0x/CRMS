async function listUsers() {
  return [];
}

async function createBlackout(payload) {
  return {
    blackout_id: 1,
    ...payload,
  };
}

async function listBlackouts() {
  return [];
}

async function deleteBlackout(id) {
  return {
    blackout_id: Number(id),
    deleted: true,
  };
}

async function overrideBooking(id, payload) {
  return {
    booking_id: Number(id),
    overridden: true,
    ...payload,
  };
}

module.exports = {
  listUsers,
  createBlackout,
  listBlackouts,
  deleteBlackout,
  overrideBooking,
};
