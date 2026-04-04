import type { Request, Response, NextFunction } from "express";

export function checkRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: "Forbidden", code: "INSUFFICIENT_ROLE" });
      return;
    }
    next();
  };
}
