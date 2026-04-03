const repo = require("./categories.repo");

async function listCategories() {
  return repo.list();
}

async function createCategory(payload) {
  return repo.create(payload);
}

async function updateCategory(id, payload) {
  return repo.update(id, payload);
}

module.exports = {
  listCategories,
  createCategory,
  updateCategory,
};
