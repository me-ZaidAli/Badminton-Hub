import { db } from "./db";
import { tickets, ticketAuditLogs, notifications } from "@shared/schema";
import { eq, and, lt, isNull, inArray } from "drizzle-orm";

const INACTIVE_DAYS = 14;

export async function autoCloseInactiveTickets() {
  const cutoff = new Date(Date.now() - INACTIVE_DAYS * 24 * 60 * 60 * 1000);

  const staleTickets = await db
    .select()
    .from(tickets)
    .where(
      and(
        isNull(tickets.deletedAt),
        isNull(tickets.closedAt),
        inArray(tickets.status, ["AWAITING_USER", "RESPONDED", "RESOLVED"]),
        lt(tickets.lastActivityAt, cutoff)
      )
    );

  if (staleTickets.length === 0) return 0;

  for (const ticket of staleTickets) {
    const now = new Date();
    await db
      .update(tickets)
      .set({ status: "CLOSED", closedAt: now })
      .where(eq(tickets.id, ticket.id));

    await db.insert(ticketAuditLogs).values({
      ticketId: ticket.id,
      actorUserId: null,
      action: `Auto-closed after ${INACTIVE_DAYS} days of inactivity`,
      fromStatus: ticket.status,
      toStatus: "CLOSED",
    });

    await db.insert(notifications).values({
      userId: ticket.createdByUserId,
      type: "TICKET",
      title: "Ticket Auto-Closed",
      message: `Your ticket ${ticket.ticketNumber} was automatically closed after ${INACTIVE_DAYS} days of inactivity. You can reopen it if needed.`,
    });
  }

  return staleTickets.length;
}
