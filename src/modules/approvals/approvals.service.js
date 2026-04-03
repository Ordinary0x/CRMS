const repo = require("./approvals.repo");

async function listPendingApprovals() {
  return repo.listPending();
}

async function stepOneDecision(id, payload) {
  return repo.recordStepDecision(id, 1, payload);
}

async function stepTwoDecision(id, payload) {
  return repo.recordStepDecision(id, 2, payload);
}

module.exports = {
  listPendingApprovals,
  stepOneDecision,
  stepTwoDecision,
};
