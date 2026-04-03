const requestCounter = new Map();

function nowMinuteBucket() {
  return Math.floor(Date.now() / 60000);
}

function rateLimitMiddleware(req, res, next) {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const key = `${ip}:${nowMinuteBucket()}`;
  const current = requestCounter.get(key) || 0;

  if (current >= 120) {
    res.status(429).json({ message: "Too many requests" });
    return;
  }

  requestCounter.set(key, current + 1);
  next();
}

module.exports = rateLimitMiddleware;
