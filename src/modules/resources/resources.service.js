const repo = require("./resources.repo");

async function listResources(query) {
  return repo.list(query);
}

async function createResource(payload) {
  return repo.create(payload);
}

async function getResourceById(id) {
  return repo.getById(id);
}

async function updateResource(id, payload) {
  return repo.update(id, payload);
}

async function getResourceSlots(id, query) {
  return repo.getSlots(id, query);
}

async function createUnavailability(id, payload) {
  return repo.createUnavailability(id, payload);
}

module.exports = {
  listResources,
  createResource,
  getResourceById,
  updateResource,
  getResourceSlots,
  createUnavailability,
};
