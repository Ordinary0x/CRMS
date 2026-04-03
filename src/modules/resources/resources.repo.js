async function list(_query) {
  return [];
}

async function create(payload) {
  return {
    resource_id: 1,
    ...payload,
  };
}

async function getById(id) {
  return {
    resource_id: Number(id),
  };
}

async function update(id, payload) {
  return {
    resource_id: Number(id),
    ...payload,
  };
}

async function getSlots(id, query) {
  return {
    resource_id: Number(id),
    date: query.date || null,
    busy_slots: [],
    available_slots: [],
  };
}

async function createUnavailability(id, payload) {
  return {
    resource_id: Number(id),
    ...payload,
  };
}

module.exports = {
  list,
  create,
  getById,
  update,
  getSlots,
  createUnavailability,
};
