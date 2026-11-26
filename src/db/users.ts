import { db } from './index.ts';
import { users } from './schema.ts';

export async function getOrCreateUser(
  uid: string,
  email: string,
  displayName?: string | null
) {
  try {
    const cleanEmail = email.trim() || `${uid}@firebase.local`;
    const cleanName = displayName?.trim() || null;

    const result = await db
      .insert(users)
      .values({
        uid,
        email: cleanEmail,
        displayName: cleanName,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email: cleanEmail,
          displayName: cleanName,
          updatedAt: new Date(),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Failed to upsert user record:', error);
    throw new Error('Unable to synchronize user account right now.', {
      cause: error,
    });
  }
}
