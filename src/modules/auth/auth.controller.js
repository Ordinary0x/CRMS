const service = require("./auth.service");

async function login(req, res, next) {
  try {
    const result = await service.login(req.headers.authorization || "");
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  login,
};
