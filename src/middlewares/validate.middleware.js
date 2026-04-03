function validate(_schema) {
  return (_req, _res, next) => {
    next();
  };
}

module.exports = validate;
