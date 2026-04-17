import type { Express } from "express";
import { db } from "./db";
import {
  merchandiseProducts, merchandiseOrderItems, merchandiseOrderHistory,
  users, clubs, playerProfiles,
} from "@shared/schema";
import { eq, and, inArray, desc, sql, gte, lte, isNull, or, ilike } from "drizzle-orm";
import { z } from "zod";

async function getAdminClubIds(userId: number, userRole: string): Promise<number[]> {
  if (userRole === "OWNER" || userRole === "ADMIN") {
    const all = await db.select({ id: clubs.id }).from(clubs);
    return all.map(c => c.id);
  }
  const owned = await db.select({ id: clubs.id }).from(clubs).where(eq(clubs.ownerId, userId));
  const adminProfiles = await db.select({ clubId: playerProfiles.clubId })
    .from(playerProfiles)
    .where(and(
      eq(playerProfiles.userId, userId),
      eq(playerProfiles.membershipStatus, "APPROVED"),
      inArray(playerProfiles.clubRole, ["OWNER", "ADMIN"]),
    ));
  return [...new Set([...owned.map(c => c.id), ...adminProfiles.map(p => p.clubId)])];
}

async function requireAdmin(req: any, res: any): Promise<boolean> {
  if (!req.isAuthenticated()) { res.sendStatus(401); return false; }
  const u = req.user as any;
  if (u.role === "OWNER" || u.role === "ADMIN") return true;
  const ids = await getAdminClubIds(u.id, u.role);
  if (ids.length === 0) { res.sendStatus(403); return false; }
  return true;
}

function isGodMode(u: any): boolean {
  return u.role === "OWNER" || u.role === "ADMIN";
}

const STATUS_VALUES = ["pending", "approved", "ready", "collected", "cancelled"] as const;
type Status = (typeof STATUS_VALUES)[number];

// Stock-deducting statuses
const DEDUCT_STATUSES: Status[] = ["approved", "collected"];

const variationSchema = z.object({
  size: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  stock: z.number().int().min(0),
});

const productInputSchema = z.object({
  ownerClubId: z.number().int(),
  name: z.string().min(1).max(120),
  description: z.string().optional().nullable(),
  shortDescription: z.string().max(220).optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  price: z.number().int().min(0).optional().nullable(),
  categoryName: z.string().optional().nullable(),
  sizes: z.array(z.string()).optional(),
  genders: z.array(z.string()).optional(),
  styles: z.array(z.string()).optional(),
  materials: z.string().optional().nullable(),
  specifications: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  status: z.enum(["active", "draft", "out_of_stock", "discontinued"]).optional(),
  isFeatured: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  stock: z.number().int().min(0).optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
  variations: z.array(variationSchema).optional(),
  assignedClubIds: z.array(z.number().int()).optional(),
});

export function registerMerchandiseAdminRoutes(app: Express) {
  // ---------- Clubs admin can manage ----------
  app.get("/api/admin/merchandise/clubs", async (req, res) => {
    if (!(await requireAdmin(req, res))) return;
    try {
      const u = req.user as any;
      const ids = await getAdminClubIds(u.id, u.role);
      if (ids.length === 0) return res.json([]);
      const rows = await db.select({ id: clubs.id, name: clubs.name }).from(clubs).where(inArray(clubs.id, ids));
      res.json({ clubs: rows, isGodMode: isGodMode(u) });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ---------- Summary cards ----------
  app.get("/api/admin/merchandise/summary", async (req, res) => {
    if (!(await requireAdmin(req, res))) return;
    try {
      const u = req.user as any;
      const allowed = await getAdminClubIds(u.id, u.role);
      if (allowed.length === 0) return res.json({ totalOrders: 0, pendingOrders: 0, unpaidOrders: 0, revenuePence: 0, lowStockCount: 0, newOrdersCount: 0 });
      const clubFilter = req.query.clubId ? Number(req.query.clubId) : null;
      const filterClubIds = clubFilter && allowed.includes(clubFilter) ? [clubFilter] : allowed;
      if (filterClubIds.length === 0) return res.json({ totalOrders: 0, pendingOrders: 0, unpaidOrders: 0, revenuePence: 0, lowStockCount: 0, newOrdersCount: 0 });

      const orders = await db.select().from(merchandiseOrderItems).where(inArray(merchandiseOrderItems.clubId, filterClubIds));
      const products = await db.select().from(merchandiseProducts).where(inArray(merchandiseProducts.clubId, filterClubIds));

      const totalOrders = orders.length;
      const pendingOrders = orders.filter(o => o.status === "pending" || o.status === "approved" || o.status === "ready").length;
      const unpaidOrders = orders.filter(o => (o.paymentStatus || "Unpaid") === "Unpaid" && o.status !== "cancelled").length;
      const revenuePence = orders
        .filter(o => (o.paymentStatus || "Unpaid") === "Paid" && o.status !== "cancelled")
        .reduce((s, o) => s + ((o.unitPrice || 0) * (o.quantity || 1)), 0);
      const lowStockCount = products.filter(p => p.status === "active" && p.stock <= p.lowStockThreshold).length;
      const newOrdersCount = orders.filter(o => !o.viewedByAdminAt).length;

      res.json({ totalOrders, pendingOrders, unpaidOrders, revenuePence, lowStockCount, newOrdersCount });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Lightweight badge count (for sidebar polling)
  app.get("/api/admin/merchandise/new-count", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const u = req.user as any;
      const allowed = await getAdminClubIds(u.id, u.role);
      if (allowed.length === 0) return res.json({ count: 0 });
      const rows = await db.select({ id: merchandiseOrderItems.id }).from(merchandiseOrderItems)
        .where(and(inArray(merchandiseOrderItems.clubId, allowed), isNull(merchandiseOrderItems.viewedByAdminAt)));
      res.json({ count: rows.length });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Mark all visible orders as seen
  app.post("/api/admin/merchandise/mark-seen", async (req, res) => {
    if (!(await requireAdmin(req, res))) return;
    try {
      const u = req.user as any;
      const allowed = await getAdminClubIds(u.id, u.role);
      if (allowed.length === 0) return res.json({ ok: true, updated: 0 });
      const result = await db.update(merchandiseOrderItems)
        .set({ viewedByAdminAt: new Date() })
        .where(and(inArray(merchandiseOrderItems.clubId, allowed), isNull(merchandiseOrderItems.viewedByAdminAt)))
        .returning({ id: merchandiseOrderItems.id });
      res.json({ ok: true, updated: result.length });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ---------- Products ----------
  app.get("/api/admin/merchandise/products", async (req, res) => {
    if (!(await requireAdmin(req, res))) return;
    try {
      const u = req.user as any;
      const allowed = await getAdminClubIds(u.id, u.role);
      if (allowed.length === 0) return res.json([]);
      const clubFilter = req.query.clubId ? Number(req.query.clubId) : null;
      const filterClubIds = clubFilter && allowed.includes(clubFilter) ? [clubFilter] : allowed;
      if (filterClubIds.length === 0) return res.json([]);

      const products = await db.select().from(merchandiseProducts)
        .where(or(
          inArray(merchandiseProducts.clubId, filterClubIds),
          sql`${merchandiseProducts.assignedClubIds} && ARRAY[${sql.raw(filterClubIds.map(Number).join(','))}]::integer[]`,
        ))
        .orderBy(desc(merchandiseProducts.createdAt));

      const productIds = products.map(p => p.id);
      const orderRows = productIds.length > 0
        ? await db.select({ productId: merchandiseOrderItems.productId, qty: merchandiseOrderItems.quantity, status: merchandiseOrderItems.status }).from(merchandiseOrderItems).where(inArray(merchandiseOrderItems.productId, productIds))
        : [];
      const ordersByProduct = new Map<number, { count: number; units: number }>();
      for (const o of orderRows) {
        const cur = ordersByProduct.get(o.productId) || { count: 0, units: 0 };
        cur.count += 1;
        if (o.status !== "cancelled") cur.units += o.qty;
        ordersByProduct.set(o.productId, cur);
      }

      const allClubIds = [...new Set([...products.flatMap(p => [p.clubId, ...(p.assignedClubIds || [])])])];
      const clubRows = allClubIds.length > 0 ? await db.select({ id: clubs.id, name: clubs.name }).from(clubs).where(inArray(clubs.id, allClubIds)) : [];
      const clubById = new Map(clubRows.map(c => [c.id, c.name]));

      const out = products.map(p => ({
        ...p,
        ownerClubName: clubById.get(p.clubId) || `Club ${p.clubId}`,
        assignedClubNames: (p.assignedClubIds || []).map(id => clubById.get(id) || `Club ${id}`),
        totalOrders: ordersByProduct.get(p.id)?.count || 0,
        unitsOrdered: ordersByProduct.get(p.id)?.units || 0,
        isLowStock: p.stock <= p.lowStockThreshold,
      }));
      res.json(out);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/admin/merchandise/products", async (req, res) => {
    if (!(await requireAdmin(req, res))) return;
    try {
      const u = req.user as any;
      const allowed = await getAdminClubIds(u.id, u.role);
      const body = productInputSchema.parse(req.body);
      if (!allowed.includes(body.ownerClubId)) return res.sendStatus(403);
      const assigned = (body.assignedClubIds || []).filter(id => allowed.includes(id));
      const [created] = await db.insert(merchandiseProducts).values({
        clubId: body.ownerClubId,
        name: body.name,
        description: body.description || null,
        shortDescription: body.shortDescription || null,
        imageUrl: body.imageUrl || null,
        price: body.price ?? null,
        categoryName: body.categoryName || "Other",
        sizes: body.sizes || [],
        genders: body.genders || ["Unisex"],
        styles: body.styles || [],
        materials: body.materials || null,
        specifications: body.specifications || null,
        tags: body.tags || [],
        status: body.status || "active",
        isFeatured: body.isFeatured || false,
        sortOrder: body.sortOrder ?? 0,
        stock: body.stock ?? 0,
        lowStockThreshold: body.lowStockThreshold ?? 5,
        variations: (body.variations || []) as any,
        assignedClubIds: assigned,
        createdBy: u.id,
      }).returning();
      res.json(created);
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: "Invalid data", errors: err.errors });
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/admin/merchandise/products/:id", async (req, res) => {
    if (!(await requireAdmin(req, res))) return;
    try {
      const u = req.user as any;
      const allowed = await getAdminClubIds(u.id, u.role);
      const id = Number(req.params.id);
      const [existing] = await db.select().from(merchandiseProducts).where(eq(merchandiseProducts.id, id));
      if (!existing) return res.sendStatus(404);
      if (!allowed.includes(existing.clubId)) return res.sendStatus(403);

      const body = productInputSchema.partial().parse(req.body);
      const updates: any = { updatedAt: new Date() };
      const map: Record<string, string> = {
        name: "name", description: "description", shortDescription: "shortDescription",
        imageUrl: "imageUrl", price: "price", categoryName: "categoryName",
        sizes: "sizes", genders: "genders", styles: "styles", materials: "materials",
        specifications: "specifications", tags: "tags", status: "status",
        isFeatured: "isFeatured", sortOrder: "sortOrder", stock: "stock",
        lowStockThreshold: "lowStockThreshold", variations: "variations",
      };
      for (const [k, v] of Object.entries(body)) {
        if (v === undefined) continue;
        if (k === "ownerClubId") continue;
        if (k === "assignedClubIds") {
          const list = (v as number[]).filter(cid => allowed.includes(cid));
          updates.assignedClubIds = list;
          continue;
        }
        const target = map[k];
        if (target) updates[target] = v;
      }
      const [updated] = await db.update(merchandiseProducts).set(updates).where(eq(merchandiseProducts.id, id)).returning();
      res.json(updated);
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: "Invalid data", errors: err.errors });
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/admin/merchandise/products/:id", async (req, res) => {
    if (!(await requireAdmin(req, res))) return;
    try {
      const u = req.user as any;
      const allowed = await getAdminClubIds(u.id, u.role);
      const id = Number(req.params.id);
      const [existing] = await db.select().from(merchandiseProducts).where(eq(merchandiseProducts.id, id));
      if (!existing) return res.sendStatus(404);
      if (!allowed.includes(existing.clubId)) return res.sendStatus(403);
      await db.delete(merchandiseOrderItems).where(eq(merchandiseOrderItems.productId, id));
      await db.delete(merchandiseProducts).where(eq(merchandiseProducts.id, id));
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ---------- Orders ----------
  app.get("/api/admin/merchandise/orders", async (req, res) => {
    if (!(await requireAdmin(req, res))) return;
    try {
      const u = req.user as any;
      const allowed = await getAdminClubIds(u.id, u.role);
      if (allowed.length === 0) return res.json({ rows: [], total: 0 });

      const clubFilter = req.query.clubId ? Number(req.query.clubId) : null;
      const status = (req.query.status as string) || "all";
      const payment = (req.query.payment as string) || "all";
      const search = ((req.query.search as string) || "").trim().toLowerCase();
      const dateFrom = req.query.dateFrom ? new Date(String(req.query.dateFrom)) : null;
      const dateTo = req.query.dateTo ? new Date(String(req.query.dateTo)) : null;
      const sortBy = (req.query.sortBy as string) || "createdAt";
      const sortDir = (req.query.sortDir as string) === "asc" ? "asc" : "desc";
      const page = Math.max(1, Number(req.query.page) || 1);
      const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 25));

      const filterClubIds = clubFilter && allowed.includes(clubFilter) ? [clubFilter] : allowed;
      if (filterClubIds.length === 0) return res.json({ rows: [], total: 0 });

      const conditions: any[] = [inArray(merchandiseOrderItems.clubId, filterClubIds)];
      if (status !== "all" && (STATUS_VALUES as readonly string[]).includes(status)) {
        conditions.push(eq(merchandiseOrderItems.status, status as any));
      }
      if (payment === "Paid" || payment === "Unpaid") {
        conditions.push(eq(merchandiseOrderItems.paymentStatus, payment));
      }
      if (dateFrom && !isNaN(+dateFrom)) conditions.push(gte(merchandiseOrderItems.createdAt, dateFrom));
      if (dateTo && !isNaN(+dateTo)) conditions.push(lte(merchandiseOrderItems.createdAt, dateTo));

      const all = await db.select({
        order: merchandiseOrderItems,
        productName: merchandiseProducts.name,
        productImage: merchandiseProducts.imageUrl,
        productPrice: merchandiseProducts.price,
        productStock: merchandiseProducts.stock,
        userName: users.fullName,
        userEmail: users.email,
        clubName: clubs.name,
      }).from(merchandiseOrderItems)
        .innerJoin(merchandiseProducts, eq(merchandiseOrderItems.productId, merchandiseProducts.id))
        .innerJoin(users, eq(merchandiseOrderItems.userId, users.id))
        .innerJoin(clubs, eq(merchandiseOrderItems.clubId, clubs.id))
        .where(and(...conditions));

      let filtered = all;
      if (search) {
        filtered = filtered.filter(r =>
          (r.userName || "").toLowerCase().includes(search) ||
          (r.userEmail || "").toLowerCase().includes(search) ||
          (r.productName || "").toLowerCase().includes(search) ||
          (r.clubName || "").toLowerCase().includes(search) ||
          String(r.order.id).includes(search),
        );
      }

      const sorted = filtered.sort((a, b) => {
        const dir = sortDir === "asc" ? 1 : -1;
        const aVal: any = (a.order as any)[sortBy] ?? "";
        const bVal: any = (b.order as any)[sortBy] ?? "";
        if (aVal instanceof Date || sortBy === "createdAt" || sortBy === "updatedAt") {
          return (new Date(aVal).getTime() - new Date(bVal).getTime()) * dir;
        }
        if (typeof aVal === "number" && typeof bVal === "number") return (aVal - bVal) * dir;
        return String(aVal).localeCompare(String(bVal)) * dir;
      });

      const total = sorted.length;
      const slice = sorted.slice((page - 1) * pageSize, page * pageSize);
      const rows = slice.map(r => {
        const unit = (r.order.unitPrice ?? r.productPrice ?? 0);
        return {
          ...r.order,
          productName: r.productName,
          productImage: r.productImage,
          productStock: r.productStock,
          userName: r.userName,
          userEmail: r.userEmail,
          clubName: r.clubName,
          unitPrice: unit,
          totalPrice: unit * (r.order.quantity || 1),
          isNew: !r.order.viewedByAdminAt,
        };
      });
      res.json({ rows, total, page, pageSize });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.get("/api/admin/merchandise/orders/:id", async (req, res) => {
    if (!(await requireAdmin(req, res))) return;
    try {
      const u = req.user as any;
      const allowed = await getAdminClubIds(u.id, u.role);
      const id = Number(req.params.id);
      const [row] = await db.select({
        order: merchandiseOrderItems,
        productName: merchandiseProducts.name,
        productImage: merchandiseProducts.imageUrl,
        productPrice: merchandiseProducts.price,
        productStock: merchandiseProducts.stock,
        userName: users.fullName,
        userEmail: users.email,
        clubName: clubs.name,
      }).from(merchandiseOrderItems)
        .innerJoin(merchandiseProducts, eq(merchandiseOrderItems.productId, merchandiseProducts.id))
        .innerJoin(users, eq(merchandiseOrderItems.userId, users.id))
        .innerJoin(clubs, eq(merchandiseOrderItems.clubId, clubs.id))
        .where(eq(merchandiseOrderItems.id, id));
      if (!row) return res.sendStatus(404);
      if (!allowed.includes(row.order.clubId)) return res.sendStatus(403);
      const history = await db.select().from(merchandiseOrderHistory).where(eq(merchandiseOrderHistory.orderId, id)).orderBy(desc(merchandiseOrderHistory.changedAt));
      const unit = (row.order.unitPrice ?? row.productPrice ?? 0);
      res.json({
        ...row.order,
        productName: row.productName,
        productImage: row.productImage,
        productStock: row.productStock,
        userName: row.userName,
        userEmail: row.userEmail,
        clubName: row.clubName,
        unitPrice: unit,
        totalPrice: unit * (row.order.quantity || 1),
        history,
      });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Helper: apply a status / payment change inside a transaction with stock logic
  async function applyOrderChange(opts: {
    trx: any; orderId: number; userId: number;
    nextStatus?: Status; nextPayment?: "Paid" | "Unpaid"; note?: string;
  }) {
    const { trx, orderId, userId, nextStatus, nextPayment, note } = opts;
    const [order] = await trx.select().from(merchandiseOrderItems).where(eq(merchandiseOrderItems.id, orderId));
    if (!order) throw new Error("Order not found");
    const [product] = await trx.select().from(merchandiseProducts).where(eq(merchandiseProducts.id, order.productId));
    if (!product) throw new Error("Product not found");

    const updates: any = { updatedAt: new Date() };
    let stockDelta = 0;
    let stockDeducted = order.stockDeducted;

    if (nextStatus && nextStatus !== order.status) {
      const wasDeducting = DEDUCT_STATUSES.includes(order.status as Status);
      const willDeduct = DEDUCT_STATUSES.includes(nextStatus);
      if (!wasDeducting && willDeduct) {
        if (product.stock < order.quantity) throw new Error(`Insufficient stock for ${product.name} (have ${product.stock}, need ${order.quantity}).`);
        stockDelta = -order.quantity;
        stockDeducted = true;
      } else if (wasDeducting && !willDeduct) {
        stockDelta = order.quantity;
        stockDeducted = false;
      }
      updates.status = nextStatus;
    }
    if (nextPayment && nextPayment !== order.paymentStatus) {
      updates.paymentStatus = nextPayment;
    }
    updates.stockDeducted = stockDeducted;

    if (stockDelta !== 0) {
      await trx.update(merchandiseProducts)
        .set({ stock: sql`${merchandiseProducts.stock} + ${stockDelta}` })
        .where(eq(merchandiseProducts.id, product.id));
    }

    const [updated] = await trx.update(merchandiseOrderItems).set(updates).where(eq(merchandiseOrderItems.id, orderId)).returning();

    if (nextStatus && nextStatus !== order.status) {
      await trx.insert(merchandiseOrderHistory).values({
        orderId, fromStatus: order.status, toStatus: nextStatus, changedById: userId, note: note || null,
      });
    }
    if (nextPayment && nextPayment !== order.paymentStatus) {
      await trx.insert(merchandiseOrderHistory).values({
        orderId, toStatus: updated.status, paymentChange: nextPayment, changedById: userId, note: note || "Payment updated",
      });
    }
    return updated;
  }

  app.patch("/api/admin/merchandise/orders/:id", async (req, res) => {
    if (!(await requireAdmin(req, res))) return;
    try {
      const u = req.user as any;
      const allowed = await getAdminClubIds(u.id, u.role);
      const id = Number(req.params.id);
      const [order] = await db.select().from(merchandiseOrderItems).where(eq(merchandiseOrderItems.id, id));
      if (!order) return res.sendStatus(404);
      if (!allowed.includes(order.clubId)) return res.sendStatus(403);

      const body = z.object({
        status: z.enum(STATUS_VALUES).optional(),
        paymentStatus: z.enum(["Paid", "Unpaid"]).optional(),
        size: z.string().optional().nullable(),
        gender: z.string().optional().nullable(),
        style: z.string().optional().nullable(),
        variationLabel: z.string().optional().nullable(),
        quantity: z.number().int().min(1).optional(),
        notes: z.string().optional().nullable(),
        adminNotes: z.string().optional().nullable(),
        unitPrice: z.number().int().min(0).optional().nullable(),
        note: z.string().optional(),
      }).parse(req.body);

      const result = await db.transaction(async (trx) => {
        // Apply non-stock-affecting field updates first
        const directUpdates: any = { updatedAt: new Date() };
        const fields = ["size", "gender", "style", "variationLabel", "quantity", "notes", "adminNotes", "unitPrice"] as const;
        for (const k of fields) if ((body as any)[k] !== undefined) directUpdates[k] = (body as any)[k];
        if (Object.keys(directUpdates).length > 1) {
          await trx.update(merchandiseOrderItems).set(directUpdates).where(eq(merchandiseOrderItems.id, id));
        }
        return applyOrderChange({
          trx, orderId: id, userId: u.id,
          nextStatus: body.status as Status | undefined,
          nextPayment: body.paymentStatus as "Paid" | "Unpaid" | undefined,
          note: body.note,
        });
      });
      res.json(result);
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: "Invalid data", errors: err.errors });
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/admin/merchandise/orders/:id", async (req, res) => {
    if (!(await requireAdmin(req, res))) return;
    try {
      const u = req.user as any;
      const allowed = await getAdminClubIds(u.id, u.role);
      const id = Number(req.params.id);
      const [order] = await db.select().from(merchandiseOrderItems).where(eq(merchandiseOrderItems.id, id));
      if (!order) return res.sendStatus(404);
      if (!allowed.includes(order.clubId)) return res.sendStatus(403);
      // If stock was deducted, restore it on delete
      if (order.stockDeducted) {
        await db.update(merchandiseProducts)
          .set({ stock: sql`${merchandiseProducts.stock} + ${order.quantity}` })
          .where(eq(merchandiseProducts.id, order.productId));
      }
      await db.delete(merchandiseOrderItems).where(eq(merchandiseOrderItems.id, id));
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/admin/merchandise/orders/bulk", async (req, res) => {
    if (!(await requireAdmin(req, res))) return;
    try {
      const u = req.user as any;
      const allowed = await getAdminClubIds(u.id, u.role);
      const body = z.object({
        orderIds: z.array(z.number().int()).min(1),
        action: z.enum(["MARK_PAID", "MARK_UNPAID", "SET_STATUS", "DELETE"]),
        nextStatus: z.enum(STATUS_VALUES).optional(),
      }).parse(req.body);

      const orders = await db.select().from(merchandiseOrderItems).where(inArray(merchandiseOrderItems.id, body.orderIds));
      const valid = orders.filter(o => allowed.includes(o.clubId));
      if (valid.length === 0) return res.json({ ok: true, count: 0 });

      let count = 0;
      if (body.action === "DELETE") {
        await db.transaction(async (trx) => {
          for (const o of valid) {
            if (o.stockDeducted) {
              await trx.update(merchandiseProducts)
                .set({ stock: sql`${merchandiseProducts.stock} + ${o.quantity}` })
                .where(eq(merchandiseProducts.id, o.productId));
            }
            await trx.delete(merchandiseOrderItems).where(eq(merchandiseOrderItems.id, o.id));
            count++;
          }
        });
      } else {
        await db.transaction(async (trx) => {
          for (const o of valid) {
            try {
              await applyOrderChange({
                trx, orderId: o.id, userId: u.id,
                nextPayment: body.action === "MARK_PAID" ? "Paid" : body.action === "MARK_UNPAID" ? "Unpaid" : undefined,
                nextStatus: body.action === "SET_STATUS" ? body.nextStatus : undefined,
                note: "Bulk action",
              });
              count++;
            } catch (e) { /* skip individual failures (e.g. insufficient stock) */ }
          }
        });
      }
      res.json({ ok: true, count });
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: "Invalid data", errors: err.errors });
      res.status(500).json({ message: err.message });
    }
  });
}
