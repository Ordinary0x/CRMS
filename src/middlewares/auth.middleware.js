const { verifyIdToken } = require("../config/firebase-admin");

async function authMiddleware(req, _res, next) {
  try {
    const authHeader = req.headers.authorization || "";

    if (!authHeader.startsWith("Bearer ")) {
      const error = new Error("Missing or invalid Authorization header");
      error.status = 401;
      throw error;
    }

    const token = authHeader.slice(7);
    const decoded = await verifyIdToken(token);

    req.user = {
      firebaseUid: decoded.uid,
      email: decoded.email,
      role: "student",
      priorityLevel: 4,
    };

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = authMiddleware;
