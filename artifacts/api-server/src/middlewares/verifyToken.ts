import type { Request, Response, NextFunction } from "express";
import { pool } from "@workspace/db";
import { logger } from "../lib/logger";
import jwt from "jsonwebtoken";
import { createRemoteJWKSet, jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "crmbs-dev-secret-change-in-production";
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "dbms-9403e";
const FIREBASE_ISSUER = `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`;
const FIREBASE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);

interface TokenPayload {
  uid: string;
  email?: string;
  iat?: number;
  exp?: number;
}

async function decodeBearerToken(token: string): Promise<TokenPayload | null> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    if (!decoded?.uid) return null;
    return { uid: decoded.uid, email: decoded.email };
  } catch {
    // try Firebase token verification
  }

  try {
    const { payload } = await jwtVerify(token, FIREBASE_JWKS, {
      issuer: FIREBASE_ISSUER,
      audience: FIREBASE_PROJECT_ID,
    });

    const uid =
      typeof payload.user_id === "string"
        ? payload.user_id
        : typeof payload.sub === "string"
          ? payload.sub
          : null;

    if (!uid) return null;

    return {
      uid,
      email: typeof payload.email === "string" ? payload.email : undefined,
    };
  } catch {
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

export { JWT_SECRET };

async function verifyTokenInternal(
  req: Request,
  res: Response,
  next: NextFunction,
  allowInactive: boolean,
): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "No token" });
    return;
  }

  const token = header.split(" ")[1];

  try {
    const decoded = await decodeBearerToken(token);
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

      if (!allowInactive && !result.rows[0].is_active) {
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

export async function verifyToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  return verifyTokenInternal(req, res, next, false);
}

export async function verifyTokenAllowInactive(req: Request, res: Response, next: NextFunction): Promise<void> {
  return verifyTokenInternal(req, res, next, true);
}

export async function optionalVerifyToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    next();
    return;
  }

  const token = header.split(" ")[1];
  try {
    const decoded = await decodeBearerToken(token);
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
