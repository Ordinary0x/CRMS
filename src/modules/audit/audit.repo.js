async function list(_query) {
  return [];
}

async function bookingTrail(id) {
  return {
    booking_id: Number(id),
    events: [],
  };
}

module.exports = {
  list,
  bookingTrail,
};
