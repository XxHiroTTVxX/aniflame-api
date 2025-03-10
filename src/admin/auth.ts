import { createHash } from "crypto";

const sessions = new Map<string, { userId: number, expires: number }>();

export function createSession(userId: number): string {
  const sessionId = createHash('sha256')
    .update(userId + Date.now().toString())
    .digest('hex');
  
  sessions.set(sessionId, {
    userId,
    expires: Date.now() + 1000 * 60 * 60 // 1 hour
  });

  return sessionId;
}

export function verifySession(sessionId: string): boolean {
  const session = sessions.get(sessionId);
  if (!session || session.expires < Date.now()) {
    sessions.delete(sessionId);
    return false;
  }
  return true;
} 