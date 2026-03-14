import { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || "evalent-partner-secret"
);

export async function getPartnerFromCookie(req: NextRequest) {
  const token = req.cookies.get("evalent_partner")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as { partnerId: string; email: string };
  } catch {
    return null;
  }
}
