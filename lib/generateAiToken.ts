// C:\Users\adamm\Projects\wageflow01\lib\generateAiToken.ts
import crypto from "crypto";
import { SignJWT } from "jose";

export type TokenPayload = {
  companyId: string;
  userId: string;
  scopes: string[];
  requestId?: string;
};

export async function generateAiToken(payload: TokenPayload): Promise<string> {
  const secret = process.env.WAGEFLOW_AI_SIGNING_SECRET;
  
  if (!secret || secret.trim() === "") {
    throw new Error("WAGEFLOW_AI_SIGNING_SECRET is not configured");
  }

  let key = Buffer.from(secret.trim(), "base64");
  if (!key || key.length < 32) {
    key = Buffer.from(secret.trim(), "utf8");
  }

  const now = Math.floor(Date.now() / 1000);
  const jti = crypto.randomUUID().replace(/-/g, "");

  const jwt = await new SignJWT({
    company_id: payload.companyId,
    user_id: payload.userId,
    scope: payload.scopes.join(" "),
    jti,
    request_id: payload.requestId,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer("wageflow")
    .setAudience("wageflow-ai")
    .setIssuedAt(now)
    .setExpirationTime(now + 300) // 5 minutes
    .sign(key);

  return jwt;
}
