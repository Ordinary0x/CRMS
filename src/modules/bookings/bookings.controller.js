const service = require("./bookings.service");

async function createBooking(req, res, next) {
  try {
    const result = await service.createBooking(req.user, req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function listBookings(req, res, next) {
  try {
    const result = await service.listBookings(req.user, req.query);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function getBookingById(req, res, next) {
  try {
    const result = await service.getBookingById(req.params.id);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function cancelBooking(req, res, next) {
  try {
    const result = await service.cancelBooking(req.params.id);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function getConflicts(req, res, next) {
  try {
    const result = await service.getConflicts(req.query);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createBooking,
  listBookings,
  getBookingById,
  cancelBooking,
  getConflicts,
};
