const service = require("./approvals.service");

async function listPendingApprovals(_req, res, next) {
  try {
    const result = await service.listPendingApprovals();
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function stepOneDecision(req, res, next) {
  try {
    const result = await service.stepOneDecision(req.params.id, req.body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function stepTwoDecision(req, res, next) {
  try {
    const result = await service.stepTwoDecision(req.params.id, req.body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listPendingApprovals,
  stepOneDecision,
  stepTwoDecision,
};
