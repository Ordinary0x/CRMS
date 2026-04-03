function startAnalyticsRefreshWorker() {
  setInterval(() => {
    console.log("analytics refresh worker tick");
  }, 300000);
}

module.exports = {
  startAnalyticsRefreshWorker,
};
