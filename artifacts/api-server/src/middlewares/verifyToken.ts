import type { Request, Response, NextFunction } from "express";
import { pool } from "@workspace/db";
import { logger } from "../lib/logger";

interface FirebaseTokenPayload {
  uid: string;
  email?: string;
  iat?: number;
  exp?: number;
}

async function verifyFirebaseToken(token: string): Promise<FirebaseTokenPayload | null> {
  // Decode the JWT without verification for development
  // In production, use Firebase Admin SDK
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8"));
    if (!payload.user_id && !payload.sub) return null;
    return {
      uid: payload.user_id || payload.sub,
      email: payload.email,
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch (e) {
    return null;
  }
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

export async function verifyToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "No token" });
    return;
  }

  const token = header.split(" ")[1];

  try {
    const decoded = await verifyFirebaseToken(token);
    if (!decoded) {
      res.status(401).json({ error: "Invalid token" });
      return;
    }

    req.firebaseUid = decoded.uid;
    req.firebaseEmail = decoded.email;

    const client = await pool.connect();
    try {
      const result = await client.query(
        "SELECT * FROM users WHERE firebase_uid = $1",
        [decoded.uid]
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
    const decoded = await verifyFirebaseToken(token);
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
