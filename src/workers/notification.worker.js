function startNotificationWorker() {
  setInterval(() => {
    console.log("notification worker tick");
  }, 60000);
}

module.exports = {
  startNotificationWorker,
};
