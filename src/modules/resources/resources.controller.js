const service = require("./resources.service");

async function listResources(req, res, next) {
  try {
    const result = await service.listResources(req.query);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function createResource(req, res, next) {
  try {
    const result = await service.createResource(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function getResourceById(req, res, next) {
  try {
    const result = await service.getResourceById(req.params.id);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function updateResource(req, res, next) {
  try {
    const result = await service.updateResource(req.params.id, req.body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function getResourceSlots(req, res, next) {
  try {
    const result = await service.getResourceSlots(req.params.id, req.query);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function createUnavailability(req, res, next) {
  try {
    const result = await service.createUnavailability(req.params.id, req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listResources,
  createResource,
  getResourceById,
  updateResource,
  getResourceSlots,
  createUnavailability,
};
