async function listPending() {
  return [];
}

async function recordStepDecision(id, step, payload) {
  return {
    booking_id: Number(id),
    step,
    ...payload,
  };
}

module.exports = {
  listPending,
  recordStepDecision,
};
