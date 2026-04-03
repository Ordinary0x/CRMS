const service = require("./admin.service");

async function listUsers(_req, res, next) {
  try {
    const result = await service.listUsers();
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function createBlackout(req, res, next) {
  try {
    const result = await service.createBlackout(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function listBlackouts(_req, res, next) {
  try {
    const result = await service.listBlackouts();
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function deleteBlackout(req, res, next) {
  try {
    const result = await service.deleteBlackout(req.params.id);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function overrideBooking(req, res, next) {
  try {
    const result = await service.overrideBooking(req.params.id, req.body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listUsers,
  createBlackout,
  listBlackouts,
  deleteBlackout,
  overrideBooking,
};
