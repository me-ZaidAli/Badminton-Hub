import type { Express } from "express";
import { db } from "./db";
import { communityEvents, communityEventParticipants, foodEntries, foodInterests, communityPosts, communityComments, communityLikes, communityReviews, users, playerProfiles } from "@shared/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { canPerform } from "./rbac";

export function registerCommunityRoutes(app: Express) {

  app.get("/api/community/events", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const clubId = Number(req.query.clubId);
    if (!clubId) return res.status(400).json({ message: "clubId required" });

    const events = await db.select().from(communityEvents)
      .where(and(eq(communityEvents.clubId, clubId), eq(communityEvents.isVisible, true)))
      .orderBy(desc(communityEvents.createdAt));

    const eventIds = events.map(e => e.id);
    let participantCounts: Record<number, number> = {};
    let reviewAverages: Record<number, { avg: number; count: number }> = {};

    if (eventIds.length > 0) {
      const counts = await db.select({
        eventId: communityEventParticipants.eventId,
        count: sql<number>`count(*)::int`,
      }).from(communityEventParticipants)
        .where(inArray(communityEventParticipants.eventId, eventIds))
        .groupBy(communityEventParticipants.eventId);
      for (const c of counts) participantCounts[c.eventId] = c.count;

      const reviews = await db.select({
        eventId: communityReviews.eventId,
        avg: sql<number>`round(avg(${communityReviews.rating})::numeric, 1)::float`,
        count: sql<number>`count(*)::int`,
      }).from(communityReviews)
        .where(and(inArray(communityReviews.eventId, eventIds), sql`${communityReviews.eventId} IS NOT NULL`))
        .groupBy(communityReviews.eventId);
      for (const r of reviews) {
        if (r.eventId) reviewAverages[r.eventId] = { avg: r.avg, count: r.count };
      }
    }

    const creatorIds = [...new Set(events.map(e => e.createdBy))];
    const creatorMap: Record<number, string> = {};
    if (creatorIds.length > 0) {
      const creators = await db.select({ id: users.id, fullName: users.fullName }).from(users)
        .where(inArray(users.id, creatorIds));
      for (const c of creators) creatorMap[c.id] = c.fullName;
    }

    const result = events.map(e => ({
      ...e,
      participantCount: participantCounts[e.id] || 0,
      rating: reviewAverages[e.id] || { avg: 0, count: 0 },
      creatorName: creatorMap[e.createdBy] || "Unknown",
    }));

    res.json(result);
  });

  app.get("/api/community/events/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const eventId = Number(req.params.id);
    const [event] = await db.select().from(communityEvents).where(eq(communityEvents.id, eventId));
    if (!event) return res.status(404).json({ message: "Event not found" });

    const participants = await db.select({
      id: communityEventParticipants.id,
      userId: communityEventParticipants.userId,
      fullName: users.fullName,
      createdAt: communityEventParticipants.createdAt,
    }).from(communityEventParticipants)
      .innerJoin(users, eq(communityEventParticipants.userId, users.id))
      .where(eq(communityEventParticipants.eventId, eventId));

    const reviews = await db.select({
      eventId: communityReviews.eventId,
      avg: sql<number>`round(avg(${communityReviews.rating})::numeric, 1)::float`,
      count: sql<number>`count(*)::int`,
    }).from(communityReviews)
      .where(eq(communityReviews.eventId, eventId))
      .groupBy(communityReviews.eventId);

    const [creator] = await db.select({ fullName: users.fullName }).from(users).where(eq(users.id, event.createdBy));

    const isJoined = participants.some(p => p.userId === req.user!.id);

    res.json({
      ...event,
      participants,
      participantCount: participants.length,
      rating: reviews[0] ? { avg: reviews[0].avg, count: reviews[0].count } : { avg: 0, count: 0 },
      creatorName: creator?.fullName || "Unknown",
      isJoined,
    });
  });

  app.post("/api/community/events", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { clubId, ...data } = req.body;
    const allowed = await canPerform({ id: req.user!.id, role: req.user!.role }, "MANAGE_SESSIONS", clubId);
    if (!allowed) return res.status(403).json({ message: "Not authorized" });

    if (data.eventDate) {
      data.eventDate = new Date(data.eventDate);
    }
    const [event] = await db.insert(communityEvents).values({
      clubId,
      ...data,
      createdBy: req.user!.id,
    }).returning();

    res.status(201).json(event);
  });

  app.patch("/api/community/events/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const eventId = Number(req.params.id);
    const [event] = await db.select().from(communityEvents).where(eq(communityEvents.id, eventId));
    if (!event) return res.status(404).json({ message: "Event not found" });

    const allowed = await canPerform({ id: req.user!.id, role: req.user!.role }, "MANAGE_SESSIONS", event.clubId);
    if (!allowed) return res.status(403).json({ message: "Not authorized" });

    const { id, createdAt, createdBy, clubId, ...updates } = req.body;
    if (updates.eventDate) {
      updates.eventDate = new Date(updates.eventDate);
    }
    const [updated] = await db.update(communityEvents).set(updates).where(eq(communityEvents.id, eventId)).returning();
    res.json(updated);
  });

  app.delete("/api/community/events/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const eventId = Number(req.params.id);
    const [event] = await db.select().from(communityEvents).where(eq(communityEvents.id, eventId));
    if (!event) return res.status(404).json({ message: "Event not found" });

    const allowed = await canPerform({ id: req.user!.id, role: req.user!.role }, "MANAGE_CLUB", event.clubId);
    if (!allowed) return res.status(403).json({ message: "Not authorized" });

    await db.delete(communityComments).where(
      inArray(communityComments.postId,
        db.select({ id: communityPosts.id }).from(communityPosts).where(eq(communityPosts.eventId, eventId))
      )
    );
    await db.delete(communityLikes).where(
      inArray(communityLikes.postId,
        db.select({ id: communityPosts.id }).from(communityPosts).where(eq(communityPosts.eventId, eventId))
      )
    );
    await db.delete(communityPosts).where(eq(communityPosts.eventId, eventId));
    await db.delete(communityReviews).where(eq(communityReviews.eventId, eventId));
    const foodIds = (await db.select({ id: foodEntries.id }).from(foodEntries).where(eq(foodEntries.eventId, eventId))).map(f => f.id);
    if (foodIds.length > 0) {
      await db.delete(foodInterests).where(inArray(foodInterests.foodEntryId, foodIds));
      await db.delete(communityReviews).where(inArray(communityReviews.foodEntryId, foodIds));
    }
    await db.delete(foodEntries).where(eq(foodEntries.eventId, eventId));
    await db.delete(communityEventParticipants).where(eq(communityEventParticipants.eventId, eventId));
    await db.delete(communityEvents).where(eq(communityEvents.id, eventId));
    res.json({ message: "Deleted" });
  });

  app.post("/api/community/events/:id/join", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const eventId = Number(req.params.id);
    const [event] = await db.select().from(communityEvents).where(eq(communityEvents.id, eventId));
    if (!event) return res.status(404).json({ message: "Event not found" });

    const existing = await db.select().from(communityEventParticipants)
      .where(and(eq(communityEventParticipants.eventId, eventId), eq(communityEventParticipants.userId, req.user!.id)));
    if (existing.length > 0) return res.status(400).json({ message: "Already joined" });

    if (event.maxParticipants) {
      const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(communityEventParticipants)
        .where(eq(communityEventParticipants.eventId, eventId));
      if (count >= event.maxParticipants) return res.status(400).json({ message: "Event is full" });
    }

    const [participant] = await db.insert(communityEventParticipants).values({
      eventId,
      userId: req.user!.id,
    }).returning();

    res.status(201).json(participant);
  });

  app.delete("/api/community/events/:id/leave", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const eventId = Number(req.params.id);
    await db.delete(communityEventParticipants)
      .where(and(eq(communityEventParticipants.eventId, eventId), eq(communityEventParticipants.userId, req.user!.id)));
    res.json({ message: "Left event" });
  });

  app.get("/api/community/events/:id/food", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const eventId = Number(req.params.id);

    const entries = await db.select({
      id: foodEntries.id,
      eventId: foodEntries.eventId,
      clubId: foodEntries.clubId,
      userId: foodEntries.userId,
      dishName: foodEntries.dishName,
      country: foodEntries.country,
      countryFlag: foodEntries.countryFlag,
      category: foodEntries.category,
      imageUrl: foodEntries.imageUrl,
      isHalal: foodEntries.isHalal,
      isVegetarian: foodEntries.isVegetarian,
      isVegan: foodEntries.isVegan,
      containsAlcohol: foodEntries.containsAlcohol,
      allergens: foodEntries.allergens,
      ingredients: foodEntries.ingredients,
      isApproved: foodEntries.isApproved,
      createdAt: foodEntries.createdAt,
      creatorName: users.fullName,
    }).from(foodEntries)
      .innerJoin(users, eq(foodEntries.userId, users.id))
      .where(eq(foodEntries.eventId, eventId))
      .orderBy(desc(foodEntries.createdAt));

    const entryIds = entries.map(e => e.id);
    let interestCounts: Record<number, number> = {};
    let userInterests: number[] = [];

    if (entryIds.length > 0) {
      const counts = await db.select({
        foodEntryId: foodInterests.foodEntryId,
        count: sql<number>`count(*)::int`,
      }).from(foodInterests)
        .where(inArray(foodInterests.foodEntryId, entryIds))
        .groupBy(foodInterests.foodEntryId);
      for (const c of counts) interestCounts[c.foodEntryId] = c.count;

      const myInterests = await db.select({ foodEntryId: foodInterests.foodEntryId })
        .from(foodInterests)
        .where(and(inArray(foodInterests.foodEntryId, entryIds), eq(foodInterests.userId, req.user!.id)));
      userInterests = myInterests.map(i => i.foodEntryId);
    }

    const reviewData = entryIds.length > 0 ? await db.select({
      foodEntryId: communityReviews.foodEntryId,
      avg: sql<number>`round(avg(${communityReviews.rating})::numeric, 1)::float`,
      count: sql<number>`count(*)::int`,
    }).from(communityReviews)
      .where(and(inArray(communityReviews.foodEntryId, entryIds), sql`${communityReviews.foodEntryId} IS NOT NULL`))
      .groupBy(communityReviews.foodEntryId) : [];

    const reviewMap: Record<number, { avg: number; count: number }> = {};
    for (const r of reviewData) {
      if (r.foodEntryId) reviewMap[r.foodEntryId] = { avg: r.avg, count: r.count };
    }

    const result = entries.map(e => ({
      ...e,
      interestCount: interestCounts[e.id] || 0,
      isInterested: userInterests.includes(e.id),
      rating: reviewMap[e.id] || { avg: 0, count: 0 },
    }));

    res.json(result);
  });

  app.post("/api/community/food", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const [entry] = await db.insert(foodEntries).values({
      ...req.body,
      userId: req.user!.id,
    }).returning();
    res.status(201).json(entry);
  });

  app.delete("/api/community/food/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = Number(req.params.id);
    const [entry] = await db.select().from(foodEntries).where(eq(foodEntries.id, id));
    if (!entry) return res.status(404).json({ message: "Not found" });

    if (entry.userId !== req.user!.id) {
      const allowed = await canPerform({ id: req.user!.id, role: req.user!.role }, "MANAGE_CLUB", entry.clubId);
      if (!allowed) return res.status(403).json({ message: "Not authorized" });
    }

    await db.delete(foodEntries).where(eq(foodEntries.id, id));
    res.json({ message: "Deleted" });
  });

  app.post("/api/community/food/:id/interest", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const foodEntryId = Number(req.params.id);

    const existing = await db.select().from(foodInterests)
      .where(and(eq(foodInterests.foodEntryId, foodEntryId), eq(foodInterests.userId, req.user!.id)));

    if (existing.length > 0) {
      await db.delete(foodInterests)
        .where(and(eq(foodInterests.foodEntryId, foodEntryId), eq(foodInterests.userId, req.user!.id)));
      return res.json({ interested: false });
    }

    await db.insert(foodInterests).values({ foodEntryId, userId: req.user!.id });
    res.json({ interested: true });
  });

  app.get("/api/community/food/:id/interests", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const foodEntryId = Number(req.params.id);

    const interests = await db.select({
      id: foodInterests.id,
      userId: foodInterests.userId,
      fullName: users.fullName,
      createdAt: foodInterests.createdAt,
    }).from(foodInterests)
      .innerJoin(users, eq(foodInterests.userId, users.id))
      .where(eq(foodInterests.foodEntryId, foodEntryId));

    res.json(interests);
  });

  app.get("/api/community/posts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const clubId = Number(req.query.clubId);
    const eventId = req.query.eventId ? Number(req.query.eventId) : undefined;
    const page = Number(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    let conditions = [eq(communityPosts.clubId, clubId)];
    if (eventId) conditions.push(eq(communityPosts.eventId, eventId));

    const posts = await db.select({
      id: communityPosts.id,
      clubId: communityPosts.clubId,
      eventId: communityPosts.eventId,
      userId: communityPosts.userId,
      content: communityPosts.content,
      images: communityPosts.images,
      createdAt: communityPosts.createdAt,
      authorName: users.fullName,
    }).from(communityPosts)
      .innerJoin(users, eq(communityPosts.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(communityPosts.createdAt))
      .limit(limit)
      .offset(offset);

    const postIds = posts.map(p => p.id);
    let likeCounts: Record<number, number> = {};
    let commentCounts: Record<number, number> = {};
    let userLikes: number[] = [];

    if (postIds.length > 0) {
      const likes = await db.select({
        postId: communityLikes.postId,
        count: sql<number>`count(*)::int`,
      }).from(communityLikes)
        .where(inArray(communityLikes.postId, postIds))
        .groupBy(communityLikes.postId);
      for (const l of likes) likeCounts[l.postId] = l.count;

      const comments = await db.select({
        postId: communityComments.postId,
        count: sql<number>`count(*)::int`,
      }).from(communityComments)
        .where(inArray(communityComments.postId, postIds))
        .groupBy(communityComments.postId);
      for (const c of comments) commentCounts[c.postId] = c.count;

      const myLikes = await db.select({ postId: communityLikes.postId })
        .from(communityLikes)
        .where(and(inArray(communityLikes.postId, postIds), eq(communityLikes.userId, req.user!.id)));
      userLikes = myLikes.map(l => l.postId);
    }

    const result = posts.map(p => ({
      ...p,
      likeCount: likeCounts[p.id] || 0,
      commentCount: commentCounts[p.id] || 0,
      isLiked: userLikes.includes(p.id),
    }));

    res.json(result);
  });

  app.post("/api/community/posts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const [post] = await db.insert(communityPosts).values({
      ...req.body,
      userId: req.user!.id,
    }).returning();
    res.status(201).json(post);
  });

  app.delete("/api/community/posts/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = Number(req.params.id);
    const [post] = await db.select().from(communityPosts).where(eq(communityPosts.id, id));
    if (!post) return res.status(404).json({ message: "Not found" });

    if (post.userId !== req.user!.id) {
      const allowed = await canPerform({ id: req.user!.id, role: req.user!.role }, "MANAGE_CLUB", post.clubId);
      if (!allowed) return res.status(403).json({ message: "Not authorized" });
    }

    await db.delete(communityPosts).where(eq(communityPosts.id, id));
    res.json({ message: "Deleted" });
  });

  app.post("/api/community/posts/:id/like", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const postId = Number(req.params.id);

    const existing = await db.select().from(communityLikes)
      .where(and(eq(communityLikes.postId, postId), eq(communityLikes.userId, req.user!.id)));

    if (existing.length > 0) {
      await db.delete(communityLikes)
        .where(and(eq(communityLikes.postId, postId), eq(communityLikes.userId, req.user!.id)));
      return res.json({ liked: false });
    }

    await db.insert(communityLikes).values({ postId, userId: req.user!.id });
    res.json({ liked: true });
  });

  app.get("/api/community/posts/:id/comments", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const postId = Number(req.params.id);

    const comments = await db.select({
      id: communityComments.id,
      postId: communityComments.postId,
      userId: communityComments.userId,
      content: communityComments.content,
      createdAt: communityComments.createdAt,
      authorName: users.fullName,
    }).from(communityComments)
      .innerJoin(users, eq(communityComments.userId, users.id))
      .where(eq(communityComments.postId, postId))
      .orderBy(communityComments.createdAt);

    res.json(comments);
  });

  app.post("/api/community/posts/:id/comments", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const postId = Number(req.params.id);
    const [comment] = await db.insert(communityComments).values({
      postId,
      userId: req.user!.id,
      content: req.body.content,
    }).returning();
    res.status(201).json(comment);
  });

  app.delete("/api/community/comments/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = Number(req.params.id);
    const [comment] = await db.select().from(communityComments).where(eq(communityComments.id, id));
    if (!comment) return res.status(404).json({ message: "Not found" });

    if (comment.userId !== req.user!.id) {
      const [post] = await db.select().from(communityPosts).where(eq(communityPosts.id, comment.postId));
      if (post) {
        const allowed = await canPerform({ id: req.user!.id, role: req.user!.role }, "MANAGE_CLUB", post.clubId);
        if (!allowed) return res.status(403).json({ message: "Not authorized" });
      }
    }

    await db.delete(communityComments).where(eq(communityComments.id, id));
    res.json({ message: "Deleted" });
  });

  app.get("/api/community/reviews", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const eventId = req.query.eventId ? Number(req.query.eventId) : undefined;
    const foodEntryId = req.query.foodEntryId ? Number(req.query.foodEntryId) : undefined;

    let conditions: any[] = [];
    if (eventId) conditions.push(eq(communityReviews.eventId, eventId));
    if (foodEntryId) conditions.push(eq(communityReviews.foodEntryId, foodEntryId));

    if (conditions.length === 0) return res.json([]);

    const reviews = await db.select({
      id: communityReviews.id,
      eventId: communityReviews.eventId,
      foodEntryId: communityReviews.foodEntryId,
      userId: communityReviews.userId,
      rating: communityReviews.rating,
      comment: communityReviews.comment,
      createdAt: communityReviews.createdAt,
      authorName: users.fullName,
    }).from(communityReviews)
      .innerJoin(users, eq(communityReviews.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(communityReviews.createdAt));

    res.json(reviews);
  });

  app.post("/api/community/reviews", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { rating, comment, eventId, foodEntryId, clubId } = req.body;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ message: "Rating must be 1-5" });

    const [review] = await db.insert(communityReviews).values({
      clubId,
      eventId: eventId || null,
      foodEntryId: foodEntryId || null,
      userId: req.user!.id,
      rating,
      comment: comment || null,
    }).returning();

    res.status(201).json(review);
  });

  app.delete("/api/community/reviews/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = Number(req.params.id);
    const [review] = await db.select().from(communityReviews).where(eq(communityReviews.id, id));
    if (!review) return res.status(404).json({ message: "Not found" });

    if (review.userId !== req.user!.id) {
      const allowed = await canPerform({ id: req.user!.id, role: req.user!.role }, "MANAGE_CLUB", review.clubId);
      if (!allowed) return res.status(403).json({ message: "Not authorized" });
    }

    await db.delete(communityReviews).where(eq(communityReviews.id, id));
    res.json({ message: "Deleted" });
  });

  app.patch("/api/community/food/:id/approve", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = Number(req.params.id);
    const [entry] = await db.select().from(foodEntries).where(eq(foodEntries.id, id));
    if (!entry) return res.status(404).json({ message: "Not found" });

    const allowed = await canPerform({ id: req.user!.id, role: req.user!.role }, "MANAGE_CLUB", entry.clubId);
    if (!allowed) return res.status(403).json({ message: "Not authorized" });

    const [updated] = await db.update(foodEntries)
      .set({ isApproved: req.body.isApproved })
      .where(eq(foodEntries.id, id))
      .returning();

    res.json(updated);
  });
}
