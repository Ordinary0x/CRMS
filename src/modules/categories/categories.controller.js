const service = require("./categories.service");

async function listCategories(_req, res, next) {
  try {
    const result = await service.listCategories();
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function createCategory(req, res, next) {
  try {
    const result = await service.createCategory(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function updateCategory(req, res, next) {
  try {
    const result = await service.updateCategory(req.params.id, req.body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listCategories,
  createCategory,
  updateCategory,
};
