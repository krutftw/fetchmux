import { timingSafeEqual } from "node:crypto";

export type AuthenticationResult = "allowed" | "missing_configuration" | "unauthorized";

export function authenticateBearer(
  authorization: string | undefined,
  apiKeys: readonly string[],
  authDisabled: boolean,
): AuthenticationResult {
  if (authDisabled) return "allowed";
  if (apiKeys.length === 0) return "missing_configuration";
  if (!authorization?.startsWith("Bearer ")) return "unauthorized";
  const token = authorization.slice("Bearer ".length);
  if (!token) return "unauthorized";
  return apiKeys.some((apiKey) => equalSecret(token, apiKey)) ? "allowed" : "unauthorized";
}

function equalSecret(candidate: string, expected: string): boolean {
  const candidateBuffer = Buffer.from(candidate);
  const expectedBuffer = Buffer.from(expected);
  if (candidateBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(candidateBuffer, expectedBuffer);
}
