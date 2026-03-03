import { db } from "./db";
import { users } from "@shared/schema";
import { eq, isNotNull, isNull, and, ne } from "drizzle-orm";

export async function syncParentChildLinks(): Promise<void> {
  try {
    const juniorsWithGuardianEmail = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        parentUserId: users.parentUserId,
        parentGuardianEmail: users.parentGuardianEmail,
      })
      .from(users)
      .where(
        and(
          eq(users.isJunior, true),
          isNotNull(users.parentGuardianEmail),
          ne(users.parentGuardianEmail, "")
        )
      );

    let linked = 0;
    for (const junior of juniorsWithGuardianEmail) {
      if (!junior.parentGuardianEmail) continue;

      const normalizedEmail = junior.parentGuardianEmail.trim().toLowerCase();
      if (!normalizedEmail || normalizedEmail.endsWith("@junior.local")) continue;

      const [parentUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, normalizedEmail));

      if (parentUser && parentUser.id !== junior.id && parentUser.id !== junior.parentUserId) {
        await db
          .update(users)
          .set({ parentUserId: parentUser.id })
          .where(eq(users.id, junior.id));
        linked++;
        console.log(
          `[PARENT LINK] Linked junior "${junior.fullName}" (${junior.id}) to parent ${parentUser.id} via email ${normalizedEmail}`
        );
      }
    }

    if (linked > 0) {
      console.log(`[PARENT LINK] Synced ${linked} parent-child link(s).`);
    } else {
      console.log("[PARENT LINK] All parent-child links up to date.");
    }
  } catch (err) {
    console.error("[PARENT LINK] Error syncing parent-child links:", err);
  }
}
