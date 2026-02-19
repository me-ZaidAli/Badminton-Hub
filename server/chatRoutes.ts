import type { Express } from "express";
import { db } from "./db";
import { chats, chatMembers, chatMessages, chatReactions, chatReports, chatAuditLogs, users, sessions, clubs, playerProfiles, notifications, chatTypeEnum } from "@shared/schema";
import { eq, and, sql, desc, asc, inArray, or, isNull } from "drizzle-orm";
import { z } from "zod";
import { sendChatNotificationEmail } from "./email";

function requireAuth(req: any, res: any): boolean {
  if (!req.isAuthenticated?.() || !req.user) {
    res.status(401).json({ message: "Not authenticated" });
    return false;
  }
  return true;
}

async function getUserChatRole(chatId: number, userId: number): Promise<string | null> {
  const [member] = await db.select().from(chatMembers).where(and(eq(chatMembers.chatId, chatId), eq(chatMembers.userId, userId)));
  return member?.role || null;
}

async function isUserChatAdmin(chatId: number, userId: number): Promise<boolean> {
  const role = await getUserChatRole(chatId, userId);
  return role === "ADMIN" || role === "ORGANISER";
}

async function isUserSuperAdmin(userId: number): Promise<boolean> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  return user?.role === "OWNER";
}

async function canPostInChat(chatId: number, userId: number): Promise<{ allowed: boolean; reason?: string }> {
  const [chat] = await db.select().from(chats).where(eq(chats.id, chatId));
  if (!chat) return { allowed: false, reason: "Chat not found" };
  if (chat.isLocked) return { allowed: false, reason: "This chat is locked" };

  const [member] = await db.select().from(chatMembers).where(and(eq(chatMembers.chatId, chatId), eq(chatMembers.userId, userId)));
  if (!member) return { allowed: false, reason: "You are not a member of this chat" };

  if (member.isMuted) {
    if (member.mutedUntil && new Date(member.mutedUntil) > new Date()) {
      return { allowed: false, reason: "You are currently muted in this chat" };
    }
    if (!member.mutedUntil) {
      return { allowed: false, reason: "You are permanently muted in this chat" };
    }
  }

  if (chat.isReadOnlyForPlayers && member.role === "MEMBER") {
    return { allowed: false, reason: "This chat is read-only for players" };
  }

  if (chat.isJuniorLinked) {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (user && !user.isJunior && member.role === "MEMBER") {
      return { allowed: false, reason: "Only junior members can post in junior-linked chats. Admins can still moderate." };
    }
  }

  return { allowed: true };
}

async function logChatAudit(chatId: number, actorId: number, action: string, opts?: { targetUserId?: number; targetMessageId?: number; reason?: string; metadata?: any }) {
  await db.insert(chatAuditLogs).values({
    chatId,
    actorId,
    action,
    targetUserId: opts?.targetUserId || null,
    targetMessageId: opts?.targetMessageId || null,
    reason: opts?.reason || null,
    metadata: opts?.metadata || null,
  });
}

async function postSystemMessage(chatId: number, body: string, eventType: string) {
  const [msg] = await db.insert(chatMessages).values({
    chatId,
    senderId: null,
    body,
    messageType: "SYSTEM",
    systemEventType: eventType,
  }).returning();
  return msg;
}

async function createChatNotification(userId: number, title: string, body: string, linkUrl?: string) {
  try {
    await db.insert(notifications).values({
      userId,
      type: "CHAT_MESSAGE",
      title,
      message: body,
      linkUrl: linkUrl || "/inbox",
    });
  } catch (err) {
    console.error("[CHAT] Failed to create notification:", err);
  }
}

export function registerChatRoutes(app: Express) {

  // Moderation: get queue (MUST be before /api/chats/:id to avoid route conflict)
  app.get("/api/chats/moderation/queue", async (req, res) => {
    if (!requireAuth(req, res)) return;
    try {
      const userId = req.user!.id;
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user || (user.role !== "OWNER" && user.role !== "ADMIN")) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const reports = await db.select({
        id: chatReports.id,
        messageId: chatReports.messageId,
        reporterId: chatReports.reporterId,
        reason: chatReports.reason,
        status: chatReports.status,
        createdAt: chatReports.createdAt,
        reporterName: users.fullName,
        messageBody: chatMessages.body,
        messageSenderId: chatMessages.senderId,
        chatId: chatMessages.chatId,
      }).from(chatReports)
        .innerJoin(chatMessages, eq(chatReports.messageId, chatMessages.id))
        .innerJoin(users, eq(chatReports.reporterId, users.id))
        .where(eq(chatReports.status, "OPEN"))
        .orderBy(desc(chatReports.createdAt));

      const mutedUsers = await db.select({
        memberId: chatMembers.id,
        userId: chatMembers.userId,
        chatId: chatMembers.chatId,
        isMuted: chatMembers.isMuted,
        mutedUntil: chatMembers.mutedUntil,
        muteReason: chatMembers.muteReason,
        userName: users.fullName,
        chatName: chats.name,
      }).from(chatMembers)
        .innerJoin(users, eq(chatMembers.userId, users.id))
        .innerJoin(chats, eq(chatMembers.chatId, chats.id))
        .where(eq(chatMembers.isMuted, true));

      const lockedChats = await db.select().from(chats).where(eq(chats.isLocked, true));

      const auditLogs = await db.select({
        id: chatAuditLogs.id,
        chatId: chatAuditLogs.chatId,
        actorId: chatAuditLogs.actorId,
        action: chatAuditLogs.action,
        reason: chatAuditLogs.reason,
        metadata: chatAuditLogs.metadata,
        createdAt: chatAuditLogs.createdAt,
        actorName: users.fullName,
        chatName: chats.name,
      }).from(chatAuditLogs)
        .innerJoin(users, eq(chatAuditLogs.actorId, users.id))
        .innerJoin(chats, eq(chatAuditLogs.chatId, chats.id))
        .orderBy(desc(chatAuditLogs.createdAt))
        .limit(100);

      res.json({ reports, mutedUsers, lockedChats, auditLogs });
    } catch (err: any) {
      console.error("Error fetching moderation queue:", err);
      res.status(500).json({ message: "Failed to fetch moderation queue" });
    }
  });

  // Moderation: resolve report (MUST be before /api/chats/:id)
  app.patch("/api/chats/moderation/reports/:id", async (req, res) => {
    if (!requireAuth(req, res)) return;
    try {
      const reportId = parseInt(req.params.id);
      const userId = req.user!.id;
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user || (user.role !== "OWNER" && user.role !== "ADMIN")) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { status, resolution } = req.body;
      if (!status || !resolution) return res.status(400).json({ message: "Status and resolution are required" });

      await db.update(chatReports).set({
        status,
        resolvedById: userId,
        resolvedAt: new Date(),
        resolution,
      }).where(eq(chatReports.id, reportId));

      res.json({ success: true });
    } catch (err: any) {
      console.error("Error resolving report:", err);
      res.status(500).json({ message: "Failed to resolve report" });
    }
  });

  // List chats for current user
  app.get("/api/chats", async (req, res) => {
    if (!requireAuth(req, res)) return;
    try {
      const userId = req.user!.id;
      const memberships = await db.select().from(chatMembers).where(eq(chatMembers.userId, userId));
      if (memberships.length === 0) return res.json([]);

      const chatIds = memberships.map(m => m.chatId);
      const chatList = await db.select().from(chats).where(inArray(chats.id, chatIds));

      const enriched = await Promise.all(chatList.map(async (chat) => {
        const membership = memberships.find(m => m.chatId === chat.id);
        const memberCount = await db.select({ count: sql<number>`count(*)` }).from(chatMembers).where(eq(chatMembers.chatId, chat.id));

        const [lastMsg] = await db.select({
          body: chatMessages.body,
          createdAt: chatMessages.createdAt,
          messageType: chatMessages.messageType,
          senderName: users.fullName,
        }).from(chatMessages)
          .leftJoin(users, eq(chatMessages.senderId, users.id))
          .where(and(eq(chatMessages.chatId, chat.id), isNull(chatMessages.deletedAt)))
          .orderBy(desc(chatMessages.createdAt))
          .limit(1);

        const [unread] = await db.select({ count: sql<number>`count(*)` }).from(chatMessages)
          .where(and(
            eq(chatMessages.chatId, chat.id),
            isNull(chatMessages.deletedAt),
            sql`${chatMessages.createdAt} > ${membership!.joinedAt}`,
            membership!.joinedAt ? sql`${chatMessages.createdAt} > COALESCE((SELECT MAX(created_at) FROM chat_messages WHERE chat_id = ${chat.id} AND sender_id = ${userId}), ${membership!.joinedAt})` : sql`true`
          ));

        let pinnedMessage = null;
        if (chat.pinnedMessageId) {
          const [pm] = await db.select({
            id: chatMessages.id,
            body: chatMessages.body,
            senderName: users.fullName,
          }).from(chatMessages)
            .leftJoin(users, eq(chatMessages.senderId, users.id))
            .where(eq(chatMessages.id, chat.pinnedMessageId));
          pinnedMessage = pm || null;
        }

        return {
          ...chat,
          myRole: membership?.role,
          isMuted: membership?.isMuted || false,
          memberCount: Number(memberCount[0]?.count || 0),
          lastMessage: lastMsg || null,
          unreadCount: Number(unread?.count || 0),
          pinnedMessage,
        };
      }));

      res.json(enriched.sort((a, b) => {
        const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : new Date(a.createdAt).getTime();
        const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : new Date(b.createdAt).getTime();
        return bTime - aTime;
      }));
    } catch (err: any) {
      console.error("Error fetching chats:", err);
      res.status(500).json({ message: "Failed to fetch chats" });
    }
  });

  // Get single chat details
  app.get("/api/chats/:id", async (req, res) => {
    if (!requireAuth(req, res)) return;
    try {
      const chatId = parseInt(req.params.id);
      const userId = req.user!.id;
      const [chat] = await db.select().from(chats).where(eq(chats.id, chatId));
      if (!chat) return res.status(404).json({ message: "Chat not found" });

      const [membership] = await db.select().from(chatMembers).where(and(eq(chatMembers.chatId, chatId), eq(chatMembers.userId, userId)));
      const isSA = await isUserSuperAdmin(userId);
      if (!membership && !isSA) return res.status(403).json({ message: "Not a member of this chat" });

      const members = await db.select({
        id: chatMembers.id,
        userId: chatMembers.userId,
        role: chatMembers.role,
        isMuted: chatMembers.isMuted,
        mutedUntil: chatMembers.mutedUntil,
        muteReason: chatMembers.muteReason,
        joinedAt: chatMembers.joinedAt,
        fullName: users.fullName,
        userRole: users.role,
      }).from(chatMembers)
        .innerJoin(users, eq(chatMembers.userId, users.id))
        .where(eq(chatMembers.chatId, chatId));

      let pinnedMessage = null;
      if (chat.pinnedMessageId) {
        const [pm] = await db.select({
          id: chatMessages.id,
          body: chatMessages.body,
          senderName: users.fullName,
          createdAt: chatMessages.createdAt,
        }).from(chatMessages)
          .leftJoin(users, eq(chatMessages.senderId, users.id))
          .where(eq(chatMessages.id, chat.pinnedMessageId));
        pinnedMessage = pm || null;
      }

      res.json({
        ...chat,
        myRole: membership?.role || (isSA ? "ADMIN" : null),
        members,
        pinnedMessage,
      });
    } catch (err: any) {
      console.error("Error fetching chat:", err);
      res.status(500).json({ message: "Failed to fetch chat" });
    }
  });

  // Create a new chat
  app.post("/api/chats", async (req, res) => {
    if (!requireAuth(req, res)) return;
    try {
      const userId = req.user!.id;
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) return res.status(404).json({ message: "User not found" });

      const isAdminOrOwner = user.role === "OWNER" || user.role === "ADMIN" || user.role === "ORGANISER";
      if (!isAdminOrOwner) return res.status(403).json({ message: "Only admins, organisers, or owners can create chats" });

      const { name, type, clubId, sessionId, description, isJuniorLinked, memberIds } = req.body;
      if (!name || !type) return res.status(400).json({ message: "Name and type are required" });

      const [chat] = await db.insert(chats).values({
        name,
        type,
        clubId: clubId || null,
        sessionId: sessionId || null,
        description: description || null,
        isJuniorLinked: isJuniorLinked || false,
        isReadOnlyForPlayers: isJuniorLinked || false,
        createdById: userId,
      }).returning();

      await db.insert(chatMembers).values({
        chatId: chat.id,
        userId,
        role: "ADMIN",
      });

      if (memberIds && Array.isArray(memberIds) && memberIds.length > 0) {
        for (const memberId of memberIds) {
          if (memberId !== userId) {
            await db.insert(chatMembers).values({
              chatId: chat.id,
              userId: memberId,
              role: "MEMBER",
            });
            await postSystemMessage(chat.id, `You've been added to the ${name} chat`, "MEMBER_ADDED");
            await createChatNotification(memberId, "Added to chat", `You've been added to the ${name} chat`, `/inbox?chat=${chat.id}`);
          }
        }
      }

      await logChatAudit(chat.id, userId, "CHAT_CREATED", { metadata: { name, type } });
      res.status(201).json(chat);
    } catch (err: any) {
      console.error("Error creating chat:", err);
      res.status(500).json({ message: "Failed to create chat" });
    }
  });

  // Get chat messages
  app.get("/api/chats/:id/messages", async (req, res) => {
    if (!requireAuth(req, res)) return;
    try {
      const chatId = parseInt(req.params.id);
      const userId = req.user!.id;
      const limit = parseInt(req.query.limit as string) || 50;
      const before = req.query.before ? parseInt(req.query.before as string) : null;

      const [membership] = await db.select().from(chatMembers).where(and(eq(chatMembers.chatId, chatId), eq(chatMembers.userId, userId)));
      const isSA = await isUserSuperAdmin(userId);
      if (!membership && !isSA) return res.status(403).json({ message: "Not a member of this chat" });

      let query = db.select({
        id: chatMessages.id,
        chatId: chatMessages.chatId,
        senderId: chatMessages.senderId,
        body: chatMessages.body,
        messageType: chatMessages.messageType,
        systemEventType: chatMessages.systemEventType,
        isPinned: chatMessages.isPinned,
        deletedAt: chatMessages.deletedAt,
        createdAt: chatMessages.createdAt,
        senderName: users.fullName,
        senderRole: users.role,
      }).from(chatMessages)
        .leftJoin(users, eq(chatMessages.senderId, users.id))
        .where(before
          ? and(eq(chatMessages.chatId, chatId), sql`${chatMessages.id} < ${before}`)
          : eq(chatMessages.chatId, chatId)
        )
        .orderBy(desc(chatMessages.id))
        .limit(limit);

      const messages = await query;

      const messageIds = messages.map(m => m.id);
      let reactions: any[] = [];
      if (messageIds.length > 0) {
        reactions = await db.select({
          id: chatReactions.id,
          messageId: chatReactions.messageId,
          userId: chatReactions.userId,
          emoji: chatReactions.emoji,
          userName: users.fullName,
        }).from(chatReactions)
          .innerJoin(users, eq(chatReactions.userId, users.id))
          .where(inArray(chatReactions.messageId, messageIds));
      }

      const memberRoles = await db.select({
        userId: chatMembers.userId,
        role: chatMembers.role,
      }).from(chatMembers).where(eq(chatMembers.chatId, chatId));
      const roleMap = Object.fromEntries(memberRoles.map(m => [m.userId, m.role]));

      const enriched = messages.map(msg => ({
        ...msg,
        body: msg.deletedAt ? "[Message deleted]" : msg.body,
        chatRole: msg.senderId ? roleMap[msg.senderId] || null : null,
        reactions: reactions.filter(r => r.messageId === msg.id),
      })).reverse();

      res.json(enriched);
    } catch (err: any) {
      console.error("Error fetching messages:", err);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Post a message
  app.post("/api/chats/:id/messages", async (req, res) => {
    if (!requireAuth(req, res)) return;
    try {
      const chatId = parseInt(req.params.id);
      const userId = req.user!.id;

      const postCheck = await canPostInChat(chatId, userId);
      if (!postCheck.allowed) return res.status(403).json({ message: postCheck.reason });

      const { body } = req.body;
      if (!body || !body.trim()) return res.status(400).json({ message: "Message body is required" });

      const [msg] = await db.insert(chatMessages).values({
        chatId,
        senderId: userId,
        body: body.trim(),
        messageType: "USER",
      }).returning();

      await db.update(chats).set({ updatedAt: new Date() }).where(eq(chats.id, chatId));

      const members = await db.select().from(chatMembers).where(and(eq(chatMembers.chatId, chatId), sql`${chatMembers.userId} != ${userId}`));
      const [sender] = await db.select().from(users).where(eq(users.id, userId));

      for (const member of members) {
        if (!member.isMuted) {
          await createChatNotification(member.userId, `New message in chat`, `${sender?.fullName || 'Someone'}: ${body.substring(0, 80)}`, `/inbox?chat=${chatId}`);
        }
      }

      res.status(201).json(msg);
    } catch (err: any) {
      console.error("Error posting message:", err);
      res.status(500).json({ message: "Failed to post message" });
    }
  });

  // Add member to chat
  app.post("/api/chats/:id/members", async (req, res) => {
    if (!requireAuth(req, res)) return;
    try {
      const chatId = parseInt(req.params.id);
      const userId = req.user!.id;
      const isAdmin = await isUserChatAdmin(chatId, userId) || await isUserSuperAdmin(userId);
      if (!isAdmin) return res.status(403).json({ message: "Only chat admins can add members" });

      const { userIds, role } = req.body;
      if (!userIds || !Array.isArray(userIds)) return res.status(400).json({ message: "userIds array is required" });

      const [chat] = await db.select().from(chats).where(eq(chats.id, chatId));
      if (!chat) return res.status(404).json({ message: "Chat not found" });

      const added: number[] = [];
      for (const uid of userIds) {
        const [existing] = await db.select().from(chatMembers).where(and(eq(chatMembers.chatId, chatId), eq(chatMembers.userId, uid)));
        if (existing) continue;

        await db.insert(chatMembers).values({
          chatId,
          userId: uid,
          role: role || "MEMBER",
        });
        added.push(uid);

        await postSystemMessage(chatId, `You've been added to the ${chat.name} chat`, "MEMBER_ADDED");
        await createChatNotification(uid, "Added to chat", `You've been added to the ${chat.name} chat`, `/inbox?chat=${chatId}`);
        await logChatAudit(chatId, userId, "MEMBER_ADDED", { targetUserId: uid });
      }

      res.json({ added });
    } catch (err: any) {
      console.error("Error adding members:", err);
      res.status(500).json({ message: "Failed to add members" });
    }
  });

  // Remove member from chat
  app.delete("/api/chats/:id/members/:userId", async (req, res) => {
    if (!requireAuth(req, res)) return;
    try {
      const chatId = parseInt(req.params.id);
      const targetUserId = parseInt(req.params.userId);
      const actorId = req.user!.id;
      const isAdmin = await isUserChatAdmin(chatId, actorId) || await isUserSuperAdmin(actorId);
      if (!isAdmin) return res.status(403).json({ message: "Only chat admins can remove members" });

      const { reason } = req.body || {};

      await db.delete(chatMembers).where(and(eq(chatMembers.chatId, chatId), eq(chatMembers.userId, targetUserId)));
      await logChatAudit(chatId, actorId, "MEMBER_REMOVED", { targetUserId, reason: reason || "Removed by admin" });

      res.json({ success: true });
    } catch (err: any) {
      console.error("Error removing member:", err);
      res.status(500).json({ message: "Failed to remove member" });
    }
  });

  // Update member role
  app.patch("/api/chats/:id/members/:userId/role", async (req, res) => {
    if (!requireAuth(req, res)) return;
    try {
      const chatId = parseInt(req.params.id);
      const targetUserId = parseInt(req.params.userId);
      const actorId = req.user!.id;
      const isAdmin = await isUserChatAdmin(chatId, actorId) || await isUserSuperAdmin(actorId);
      if (!isAdmin) return res.status(403).json({ message: "Only chat admins can change roles" });

      const { role } = req.body;
      if (!["ADMIN", "ORGANISER", "COACH", "MEMBER"].includes(role)) return res.status(400).json({ message: "Invalid role" });

      await db.update(chatMembers).set({ role }).where(and(eq(chatMembers.chatId, chatId), eq(chatMembers.userId, targetUserId)));
      await logChatAudit(chatId, actorId, "ROLE_CHANGED", { targetUserId, metadata: { newRole: role } });

      res.json({ success: true });
    } catch (err: any) {
      console.error("Error updating role:", err);
      res.status(500).json({ message: "Failed to update role" });
    }
  });

  // Pin/unpin message
  app.patch("/api/chats/:id/pin/:messageId", async (req, res) => {
    if (!requireAuth(req, res)) return;
    try {
      const chatId = parseInt(req.params.id);
      const messageId = parseInt(req.params.messageId);
      const actorId = req.user!.id;
      const isAdmin = await isUserChatAdmin(chatId, actorId) || await isUserSuperAdmin(actorId);
      if (!isAdmin) return res.status(403).json({ message: "Only chat admins can pin messages" });

      const [chat] = await db.select().from(chats).where(eq(chats.id, chatId));
      const newPinId = chat?.pinnedMessageId === messageId ? null : messageId;

      await db.update(chats).set({ pinnedMessageId: newPinId }).where(eq(chats.id, chatId));
      if (newPinId) {
        await db.update(chatMessages).set({ isPinned: true }).where(eq(chatMessages.id, messageId));
      } else {
        await db.update(chatMessages).set({ isPinned: false }).where(eq(chatMessages.id, messageId));
      }

      await logChatAudit(chatId, actorId, newPinId ? "MESSAGE_PINNED" : "MESSAGE_UNPINNED", { targetMessageId: messageId });
      res.json({ pinnedMessageId: newPinId });
    } catch (err: any) {
      console.error("Error pinning message:", err);
      res.status(500).json({ message: "Failed to pin message" });
    }
  });

  // Lock/unlock chat
  app.patch("/api/chats/:id/lock", async (req, res) => {
    if (!requireAuth(req, res)) return;
    try {
      const chatId = parseInt(req.params.id);
      const actorId = req.user!.id;
      const isAdmin = await isUserChatAdmin(chatId, actorId) || await isUserSuperAdmin(actorId);
      if (!isAdmin) return res.status(403).json({ message: "Only chat admins can lock/unlock chats" });

      const { locked, reason } = req.body;
      await db.update(chats).set({ isLocked: !!locked }).where(eq(chats.id, chatId));
      await logChatAudit(chatId, actorId, locked ? "CHAT_LOCKED" : "CHAT_UNLOCKED", { reason });

      if (locked) {
        await postSystemMessage(chatId, "This chat has been locked by an admin", "CHAT_LOCKED");
      }

      res.json({ isLocked: !!locked });
    } catch (err: any) {
      console.error("Error locking chat:", err);
      res.status(500).json({ message: "Failed to lock/unlock chat" });
    }
  });

  // Mute/unmute user in chat
  app.patch("/api/chats/:id/mute/:userId", async (req, res) => {
    if (!requireAuth(req, res)) return;
    try {
      const chatId = parseInt(req.params.id);
      const targetUserId = parseInt(req.params.userId);
      const actorId = req.user!.id;
      const isAdmin = await isUserChatAdmin(chatId, actorId) || await isUserSuperAdmin(actorId);
      if (!isAdmin) return res.status(403).json({ message: "Only chat admins can mute users" });

      const { muted, reason, duration } = req.body;
      const mutedUntil = duration ? new Date(Date.now() + duration * 60000) : null;

      await db.update(chatMembers).set({
        isMuted: !!muted,
        mutedUntil,
        muteReason: reason || null,
      }).where(and(eq(chatMembers.chatId, chatId), eq(chatMembers.userId, targetUserId)));

      await logChatAudit(chatId, actorId, muted ? "USER_MUTED" : "USER_UNMUTED", {
        targetUserId,
        reason,
        metadata: { duration: duration || "permanent" },
      });

      res.json({ success: true });
    } catch (err: any) {
      console.error("Error muting user:", err);
      res.status(500).json({ message: "Failed to mute user" });
    }
  });

  // Self-mute chat notifications
  app.patch("/api/chats/:id/self-mute", async (req, res) => {
    if (!requireAuth(req, res)) return;
    try {
      const chatId = parseInt(req.params.id);
      const userId = req.user!.id;
      const { muted } = req.body;

      const [member] = await db.select().from(chatMembers).where(and(eq(chatMembers.chatId, chatId), eq(chatMembers.userId, userId)));
      if (!member) return res.status(403).json({ message: "Not a member" });

      await db.update(chatMembers).set({ isMuted: !!muted }).where(and(eq(chatMembers.chatId, chatId), eq(chatMembers.userId, userId)));
      res.json({ isMuted: !!muted });
    } catch (err: any) {
      console.error("Error self-muting:", err);
      res.status(500).json({ message: "Failed to update mute" });
    }
  });

  // Delete message (admin only)
  app.delete("/api/chats/:id/messages/:messageId", async (req, res) => {
    if (!requireAuth(req, res)) return;
    try {
      const chatId = parseInt(req.params.id);
      const messageId = parseInt(req.params.messageId);
      const actorId = req.user!.id;
      const isAdmin = await isUserChatAdmin(chatId, actorId) || await isUserSuperAdmin(actorId);
      if (!isAdmin) return res.status(403).json({ message: "Only admins can delete messages" });

      const { reason } = req.body || {};
      if (!reason) return res.status(400).json({ message: "Reason is required for message deletion" });

      await db.update(chatMessages).set({
        deletedAt: new Date(),
        deletedById: actorId,
        deleteReason: reason,
      }).where(eq(chatMessages.id, messageId));

      await logChatAudit(chatId, actorId, "MESSAGE_DELETED", { targetMessageId: messageId, reason });
      res.json({ success: true });
    } catch (err: any) {
      console.error("Error deleting message:", err);
      res.status(500).json({ message: "Failed to delete message" });
    }
  });

  // Add reaction
  app.post("/api/chats/:id/messages/:messageId/reactions", async (req, res) => {
    if (!requireAuth(req, res)) return;
    try {
      const messageId = parseInt(req.params.messageId);
      const chatId = parseInt(req.params.id);
      const userId = req.user!.id;

      const [member] = await db.select().from(chatMembers).where(and(eq(chatMembers.chatId, chatId), eq(chatMembers.userId, userId)));
      if (!member) return res.status(403).json({ message: "Not a member" });

      const { emoji } = req.body;
      if (!emoji) return res.status(400).json({ message: "Emoji is required" });

      const [existing] = await db.select().from(chatReactions).where(and(eq(chatReactions.messageId, messageId), eq(chatReactions.userId, userId), eq(chatReactions.emoji, emoji)));
      if (existing) {
        await db.delete(chatReactions).where(eq(chatReactions.id, existing.id));
        return res.json({ removed: true });
      }

      const [reaction] = await db.insert(chatReactions).values({ messageId, userId, emoji }).returning();
      res.json(reaction);
    } catch (err: any) {
      console.error("Error adding reaction:", err);
      res.status(500).json({ message: "Failed to add reaction" });
    }
  });

  // Report message
  app.post("/api/chats/:id/report", async (req, res) => {
    if (!requireAuth(req, res)) return;
    try {
      const chatId = parseInt(req.params.id);
      const userId = req.user!.id;
      const { messageId, reason } = req.body;
      if (!messageId || !reason) return res.status(400).json({ message: "Message ID and reason are required" });

      const [report] = await db.insert(chatReports).values({
        messageId,
        reporterId: userId,
        reason,
      }).returning();

      await logChatAudit(chatId, userId, "MESSAGE_REPORTED", { targetMessageId: messageId, reason });
      res.json(report);
    } catch (err: any) {
      console.error("Error reporting message:", err);
      res.status(500).json({ message: "Failed to report message" });
    }
  });

  // Get available users for adding to a chat
  app.get("/api/chats/:id/available-users", async (req, res) => {
    if (!requireAuth(req, res)) return;
    try {
      const chatId = parseInt(req.params.id);
      const [chat] = await db.select().from(chats).where(eq(chats.id, chatId));
      if (!chat) return res.status(404).json({ message: "Chat not found" });

      const existingMembers = await db.select({ userId: chatMembers.userId }).from(chatMembers).where(eq(chatMembers.chatId, chatId));
      const existingIds = existingMembers.map(m => m.userId);

      let availableUsers;
      if (chat.clubId) {
        availableUsers = await db.select({
          id: users.id,
          fullName: users.fullName,
          role: users.role,
        }).from(users)
          .innerJoin(playerProfiles, eq(users.id, playerProfiles.userId))
          .where(and(
            eq(playerProfiles.clubId, chat.clubId),
            existingIds.length > 0 ? sql`${users.id} NOT IN (${sql.join(existingIds.map(id => sql`${id}`), sql`, `)})` : sql`true`
          ));
      } else {
        availableUsers = await db.select({
          id: users.id,
          fullName: users.fullName,
          role: users.role,
        }).from(users)
          .where(existingIds.length > 0 ? sql`${users.id} NOT IN (${sql.join(existingIds.map(id => sql`${id}`), sql`, `)})` : sql`true`);
      }

      res.json(availableUsers);
    } catch (err: any) {
      console.error("Error fetching available users:", err);
      res.status(500).json({ message: "Failed to fetch available users" });
    }
  });

  // Get chat audit logs
  app.get("/api/chats/:id/audit-logs", async (req, res) => {
    if (!requireAuth(req, res)) return;
    try {
      const chatId = parseInt(req.params.id);
      const userId = req.user!.id;
      const isAdmin = await isUserChatAdmin(chatId, userId) || await isUserSuperAdmin(userId);
      if (!isAdmin) return res.status(403).json({ message: "Admin access required" });

      const logs = await db.select({
        id: chatAuditLogs.id,
        action: chatAuditLogs.action,
        actorId: chatAuditLogs.actorId,
        reason: chatAuditLogs.reason,
        metadata: chatAuditLogs.metadata,
        createdAt: chatAuditLogs.createdAt,
        actorName: users.fullName,
      }).from(chatAuditLogs)
        .innerJoin(users, eq(chatAuditLogs.actorId, users.id))
        .where(eq(chatAuditLogs.chatId, chatId))
        .orderBy(desc(chatAuditLogs.createdAt))
        .limit(100);

      res.json(logs);
    } catch (err: any) {
      console.error("Error fetching audit logs:", err);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });
}

// Helper for auto-creating session chats
export async function autoCreateSessionChat(sessionId: number, sessionName: string, clubId: number, createdById: number, isJunior: boolean = false) {
  const [existing] = await db.select().from(chats).where(and(eq(chats.sessionId, sessionId), eq(chats.type, "SESSION")));
  if (existing) return existing;

  const [chat] = await db.insert(chats).values({
    name: `${sessionName} Chat`,
    type: "SESSION",
    clubId,
    sessionId,
    isJuniorLinked: isJunior,
    isReadOnlyForPlayers: isJunior,
    createdById,
  }).returning();

  await db.insert(chatMembers).values({
    chatId: chat.id,
    userId: createdById,
    role: "ADMIN",
  });

  return chat;
}

export async function addUserToSessionChat(sessionId: number, userId: number, userName: string) {
  const [chat] = await db.select().from(chats).where(and(eq(chats.sessionId, sessionId), eq(chats.type, "SESSION")));
  if (!chat) return;

  const [existing] = await db.select().from(chatMembers).where(and(eq(chatMembers.chatId, chat.id), eq(chatMembers.userId, userId)));
  if (existing) return;

  await db.insert(chatMembers).values({
    chatId: chat.id,
    userId,
    role: "MEMBER",
  });

  await postSystemMessage(chat.id, `You've been added to the ${chat.name} chat`, "MEMBER_ADDED");
  await createChatNotification(userId, "Added to session chat", `You've been added to the ${chat.name} chat`, `/inbox?chat=${chat.id}`);
}

export async function removeUserFromSessionChat(sessionId: number, userId: number) {
  const [chat] = await db.select().from(chats).where(and(eq(chats.sessionId, sessionId), eq(chats.type, "SESSION")));
  if (!chat) return;
  await db.delete(chatMembers).where(and(eq(chatMembers.chatId, chat.id), eq(chatMembers.userId, userId)));
}

export async function sendSystemChatMessage(chatId: number, body: string, eventType: string, notifyMembers: boolean = true) {
  await postSystemMessage(chatId, body, eventType);
  if (notifyMembers) {
    const members = await db.select().from(chatMembers).where(eq(chatMembers.chatId, chatId));
    for (const member of members) {
      if (!member.isMuted) {
        await createChatNotification(member.userId, "System notification", body, `/inbox?chat=${chatId}`);
      }
    }
  }
}
