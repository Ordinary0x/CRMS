function allowRoles(...roles) {
  const allowedRoles = new Set(roles);

  return (req, _res, next) => {
    if (!req.user || !allowedRoles.has(req.user.role)) {
      const error = new Error("Forbidden");
      error.status = 403;
      next(error);
      return;
    }

    next();
  };
}

module.exports = allowRoles;
