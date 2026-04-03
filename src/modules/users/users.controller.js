const service = require("./users.service");

async function getMe(req, res, next) {
  try {
    const result = await service.getMe(req.user);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function updateRole(req, res, next) {
  try {
    const result = await service.updateRole(req.params.id, req.body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function deactivateUser(req, res, next) {
  try {
    const result = await service.deactivateUser(req.params.id);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMe,
  updateRole,
  deactivateUser,
};
