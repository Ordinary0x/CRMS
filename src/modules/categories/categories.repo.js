async function list() {
  return [];
}

async function create(payload) {
  return {
    category_id: 1,
    ...payload,
  };
}

async function update(id, payload) {
  return {
    category_id: Number(id),
    ...payload,
  };
}

module.exports = {
  list,
  create,
  update,
};
