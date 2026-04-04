import type { Request, Response, NextFunction } from "express";
import { pool } from "@workspace/db";
import { logger } from "../lib/logger";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "crmbs-dev-secret-change-in-production";

interface TokenPayload {
  uid: string;
  email?: string;
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      firebaseUid?: string;
      firebaseEmail?: string;
      user?: {
        user_id: number;
        firebase_uid: string;
        first_name: string;
        last_name: string;
        email: string;
        role: string;
        is_active: boolean;
        priority_level: number;
        department_id: number | null;
      };
    }
  }
}

export { JWT_SECRET };

export async function verifyToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "No token" });
    return;
  }

  const token = header.split(" ")[1];

  try {
    let uid: string;
    let email: string | undefined;

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
      uid = decoded.uid;
      email = decoded.email;
    } catch {
      res.status(401).json({ error: "Invalid token" });
      return;
    }

    req.firebaseUid = uid;
    req.firebaseEmail = email;

    const client = await pool.connect();
    try {
      const result = await client.query(
        "SELECT * FROM users WHERE firebase_uid = $1",
        [uid]
      );

      if (!result.rows[0]) {
        res.status(403).json({ error: "User not registered" });
        return;
      }

      if (!result.rows[0].is_active) {
        res.status(403).json({ error: "Account inactive", code: "ACCOUNT_INACTIVE" });
        return;
      }

      req.user = result.rows[0];
      next();
    } finally {
      client.release();
    }
  } catch (e) {
    logger.error({ err: e }, "Token verification error");
    res.status(401).json({ error: "Invalid token" });
  }
}

export async function optionalVerifyToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    next();
    return;
  }

  const token = header.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    if (decoded) {
      req.firebaseUid = decoded.uid;
      const client = await pool.connect();
      try {
        const result = await client.query(
          "SELECT * FROM users WHERE firebase_uid = $1",
          [decoded.uid]
        );
        if (result.rows[0]) {
          req.user = result.rows[0];
        }
      } finally {
        client.release();
      }
    }
  } catch {
    // ignore errors for optional auth
  }
  next();
}
