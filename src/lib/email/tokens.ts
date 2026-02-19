/**
 * JWT Token Utilities for Assessor Decision Links
 *
 * Creates signed tokens embedded in email action buttons.
 * Each token contains: submission_id, assessor_email, expiry.
 * When clicked, the decision is recorded in Supabase.
 */

import { SignJWT, jwtVerify } from "jose";

const getSecret = () => {
  const secret = process.env.JWT_SIGNING_SECRET;
  if (!secret) throw new Error("JWT_SIGNING_SECRET not set");
  return new TextEncoder().encode(secret);
};

export interface DecisionTokenPayload {
  sub: string;          // submission_id
  iss: string;          // "evalent"
  email: string;        // assessor email
  school_id: string;
  student_name: string;
  grade: number;
}

/**
 * Create a signed JWT for a decision link.
 * Expires in 30 days.
 */
export async function createDecisionToken(
  payload: Omit<DecisionTokenPayload, "iss">
): Promise<string> {
  const token = await new SignJWT({ ...payload, iss: "evalent" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret());

  return token;
}

/**
 * Verify and decode a decision token.
 * Returns the payload if valid, throws if expired or tampered.
 */
export async function verifyDecisionToken(
  token: string
): Promise<DecisionTokenPayload> {
  const { payload } = await jwtVerify(token, getSecret(), {
    issuer: "evalent",
  });

  return payload as unknown as DecisionTokenPayload;
}
