import PDFDocument from "pdfkit";
import { format } from "date-fns";

export interface SupplierSheetOrder {
  id: number;
  size: string | null;
  gender: string | null;
  style: string | null;
  quantity: number;
  notes: string | null;
  adminNotes: string | null;
  status: string;
  paymentStatus: string | null;
  createdAt: Date | string;
  userName: string;
  userEmail: string | null;
  product: {
    id: number;
    name: string;
    description: string | null;
    shortDescription: string | null;
    materials: string | null;
    specifications: string | null;
    categoryName: string | null;
    price: number | null;
  };
}

export interface SupplierSheetMeta {
  clubName: string;
  generatedByName: string;
  generatedAt: Date;
}

const BRAND_PURPLE = "#7c3aed";
const BRAND_DARK = "#1f1147";
const MUTED = "#6b7280";
const BORDER = "#e5e7eb";
const ZEBRA = "#f9fafb";
const PAGE_MARGIN = 48;

function formatPrice(pence: number | null | undefined) {
  if (pence == null) return "—";
  return `£${(pence / 100).toFixed(2)}`;
}

function variantKey(o: SupplierSheetOrder) {
  const parts = [o.size, o.gender, o.style].filter(Boolean);
  return parts.length ? parts.join(" / ") : "Standard";
}

interface ProductGroup {
  product: SupplierSheetOrder["product"];
  totalQty: number;
  totalValuePence: number;
  variants: Map<string, { qty: number; orderCount: number }>;
  orders: SupplierSheetOrder[];
}

function groupByProduct(orders: SupplierSheetOrder[]): ProductGroup[] {
  const map = new Map<number, ProductGroup>();
  for (const o of orders) {
    let g = map.get(o.product.id);
    if (!g) {
      g = { product: o.product, totalQty: 0, totalValuePence: 0, variants: new Map(), orders: [] };
      map.set(o.product.id, g);
    }
    g.totalQty += o.quantity;
    g.totalValuePence += (o.product.price ?? 0) * o.quantity;
    const k = variantKey(o);
    const v = g.variants.get(k) || { qty: 0, orderCount: 0 };
    v.qty += o.quantity;
    v.orderCount += 1;
    g.variants.set(k, v);
    g.orders.push(o);
  }
  return Array.from(map.values()).sort((a, b) => a.product.name.localeCompare(b.product.name));
}

export function generateSupplierOrderSheet(orders: SupplierSheetOrder[], meta: SupplierSheetMeta): PDFKit.PDFDocument {
  const doc = new PDFDocument({
    size: "A4",
    bufferPages: true,
    margins: { top: PAGE_MARGIN, bottom: 64, left: PAGE_MARGIN, right: PAGE_MARGIN },
    info: {
      Title: `Supplier Order Sheet — ${meta.clubName}`,
      Author: meta.generatedByName,
      Subject: "Merchandise Supplier Order",
      CreationDate: meta.generatedAt,
    },
  });

  const groups = groupByProduct(orders);
  const totalQty = orders.reduce((s, o) => s + o.quantity, 0);
  const totalValuePence = groups.reduce((s, g) => s + g.totalValuePence, 0);

  drawHeader(doc, meta, orders.length, totalQty, totalValuePence, groups.length);
  drawSummarySection(doc, groups);
  drawDetailsSection(doc, groups);
  drawAllPagesFooter(doc, meta);

  return doc;
}

function drawHeader(
  doc: PDFKit.PDFDocument,
  meta: SupplierSheetMeta,
  orderCount: number,
  totalQty: number,
  totalValuePence: number,
  productCount: number,
) {
  const pageW = doc.page.width;
  const x = PAGE_MARGIN;

  doc.save();
  doc.rect(0, 0, pageW, 110).fill(BRAND_DARK);
  doc.rect(0, 0, pageW, 6).fill(BRAND_PURPLE);
  doc.restore();

  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(22)
    .text("Supplier Order Sheet", x, 24, { width: pageW - x * 2 });
  doc.fillColor("#cbd5e1").font("Helvetica").fontSize(11)
    .text(meta.clubName, x, 56);
  doc.fillColor("#94a3b8").fontSize(9)
    .text(`Generated ${format(meta.generatedAt, "EEE d MMM yyyy 'at' HH:mm")} by ${meta.generatedByName}`, x, 74);

  doc.y = 130;

  const cardY = doc.y;
  const cardH = 56;
  const cards = [
    { label: "Orders", value: String(orderCount) },
    { label: "Products", value: String(productCount) },
    { label: "Total units", value: String(totalQty) },
    { label: "Est. value", value: formatPrice(totalValuePence) },
  ];
  const cardGap = 8;
  const cardW = (pageW - PAGE_MARGIN * 2 - cardGap * (cards.length - 1)) / cards.length;
  cards.forEach((c, i) => {
    const cx = PAGE_MARGIN + i * (cardW + cardGap);
    doc.save();
    doc.roundedRect(cx, cardY, cardW, cardH, 8).fill("#f5f3ff");
    doc.restore();
    doc.fillColor(MUTED).font("Helvetica").fontSize(8)
      .text(c.label.toUpperCase(), cx + 12, cardY + 10, { width: cardW - 24, characterSpacing: 0.5 });
    doc.fillColor(BRAND_DARK).font("Helvetica-Bold").fontSize(16)
      .text(c.value, cx + 12, cardY + 24, { width: cardW - 24 });
  });
  doc.y = cardY + cardH + 18;
}

function ensureSpace(doc: PDFKit.PDFDocument, needed: number) {
  if (doc.y + needed > doc.page.height - 80) {
    doc.addPage();
  }
}

function sectionTitle(doc: PDFKit.PDFDocument, title: string, subtitle?: string) {
  ensureSpace(doc, 60);
  doc.fillColor(BRAND_PURPLE).font("Helvetica-Bold").fontSize(13)
    .text(title.toUpperCase(), PAGE_MARGIN, doc.y, { characterSpacing: 1 });
  if (subtitle) {
    doc.fillColor(MUTED).font("Helvetica").fontSize(9)
      .text(subtitle, PAGE_MARGIN, doc.y);
  }
  const lineY = doc.y + 4;
  doc.moveTo(PAGE_MARGIN, lineY).lineTo(doc.page.width - PAGE_MARGIN, lineY).strokeColor(BRAND_PURPLE).lineWidth(1.2).stroke();
  doc.y = lineY + 10;
}

function drawSummarySection(doc: PDFKit.PDFDocument, groups: ProductGroup[]) {
  sectionTitle(doc, "Order Summary", "Aggregated quantities to send to the supplier, grouped by product and variant.");

  for (const g of groups) {
    drawProductSummaryBlock(doc, g);
  }
}

function drawProductSummaryBlock(doc: PDFKit.PDFDocument, g: ProductGroup) {
  const pageW = doc.page.width;
  const innerW = pageW - PAGE_MARGIN * 2;
  ensureSpace(doc, 110);

  const startY = doc.y;
  const headerH = 28;
  doc.save();
  doc.roundedRect(PAGE_MARGIN, startY, innerW, headerH, 6).fill("#ede9fe");
  doc.restore();
  doc.fillColor(BRAND_DARK).font("Helvetica-Bold").fontSize(11)
    .text(g.product.name, PAGE_MARGIN + 12, startY + 8, { width: innerW * 0.6, ellipsis: true });
  const rightText = `${g.totalQty} unit${g.totalQty === 1 ? "" : "s"}  ·  ${formatPrice(g.totalValuePence)}`;
  doc.fillColor(BRAND_PURPLE).font("Helvetica-Bold").fontSize(10)
    .text(rightText, PAGE_MARGIN + innerW * 0.6, startY + 10, { width: innerW * 0.4 - 12, align: "right" });
  doc.y = startY + headerH + 6;

  const metaParts: string[] = [];
  if (g.product.categoryName) metaParts.push(g.product.categoryName);
  if (g.product.price != null) metaParts.push(`Unit price ${formatPrice(g.product.price)}`);
  if (metaParts.length) {
    doc.fillColor(MUTED).font("Helvetica").fontSize(8.5)
      .text(metaParts.join("  ·  "), PAGE_MARGIN + 12, doc.y);
    doc.moveDown(0.2);
  }

  if (g.product.shortDescription || g.product.description) {
    const desc = (g.product.shortDescription || g.product.description || "").trim();
    if (desc) {
      doc.fillColor("#374151").font("Helvetica").fontSize(9)
        .text(desc, PAGE_MARGIN + 12, doc.y, { width: innerW - 24 });
      doc.moveDown(0.2);
    }
  }
  if (g.product.materials) {
    doc.fillColor(MUTED).font("Helvetica-Oblique").fontSize(8.5)
      .text(`Materials: ${g.product.materials}`, PAGE_MARGIN + 12, doc.y, { width: innerW - 24 });
  }
  if (g.product.specifications) {
    doc.fillColor(MUTED).font("Helvetica-Oblique").fontSize(8.5)
      .text(`Specs: ${g.product.specifications}`, PAGE_MARGIN + 12, doc.y, { width: innerW - 24 });
  }
  doc.moveDown(0.4);

  // Variant breakdown table
  const tableX = PAGE_MARGIN + 12;
  const tableW = innerW - 24;
  const cols = [
    { label: "Variant (Size / Gender / Style)", w: tableW * 0.6 },
    { label: "Orders", w: tableW * 0.2, align: "right" as const },
    { label: "Qty needed", w: tableW * 0.2, align: "right" as const },
  ];
  ensureSpace(doc, 20 + g.variants.size * 18);

  // Header
  let hy = doc.y;
  doc.save();
  doc.rect(tableX, hy, tableW, 20).fill("#f3f4f6");
  doc.restore();
  let cx = tableX + 8;
  doc.fillColor(BRAND_DARK).font("Helvetica-Bold").fontSize(8.5);
  cols.forEach(c => {
    doc.text(c.label.toUpperCase(), cx, hy + 6, { width: c.w - 16, align: c.align || "left", characterSpacing: 0.3 });
    cx += c.w;
  });
  doc.y = hy + 20;

  // Rows
  const variantRows = Array.from(g.variants.entries()).sort((a, b) => b[1].qty - a[1].qty);
  variantRows.forEach((row, idx) => {
    ensureSpace(doc, 18);
    const ry = doc.y;
    if (idx % 2 === 1) {
      doc.save();
      doc.rect(tableX, ry, tableW, 18).fill(ZEBRA);
      doc.restore();
    }
    let rx = tableX + 8;
    const values = [row[0], String(row[1].orderCount), String(row[1].qty)];
    doc.fillColor("#111827").font("Helvetica").fontSize(9.5);
    cols.forEach((c, i) => {
      const isQty = i === 2;
      if (isQty) doc.font("Helvetica-Bold").fillColor(BRAND_DARK);
      else doc.font("Helvetica").fillColor("#111827");
      doc.text(values[i], rx, ry + 4, { width: c.w - 16, align: c.align || "left" });
      rx += c.w;
    });
    doc.y = ry + 18;
  });

  // border for the whole table
  const borderH = doc.y - hy;
  doc.save();
  doc.lineWidth(0.5).strokeColor(BORDER).rect(tableX, hy, tableW, borderH).stroke();
  doc.restore();

  doc.moveDown(1.2);
}

function drawDetailsSection(doc: PDFKit.PDFDocument, groups: ProductGroup[]) {
  doc.addPage();
  sectionTitle(doc, "Detailed Order List", "Per-customer breakdown so each item can be matched on arrival.");

  for (const g of groups) {
    ensureSpace(doc, 50);
    doc.fillColor(BRAND_DARK).font("Helvetica-Bold").fontSize(11)
      .text(g.product.name, PAGE_MARGIN, doc.y);
    doc.fillColor(MUTED).font("Helvetica").fontSize(8.5)
      .text(`${g.orders.length} order${g.orders.length === 1 ? "" : "s"} · ${g.totalQty} unit${g.totalQty === 1 ? "" : "s"}`, PAGE_MARGIN, doc.y);
    doc.moveDown(0.3);

    const innerW = doc.page.width - PAGE_MARGIN * 2;
    const tableX = PAGE_MARGIN;
    const tableW = innerW;
    const cols = [
      { label: "#", w: 30 },
      { label: "Customer", w: tableW * 0.22 },
      { label: "Date", w: tableW * 0.10 },
      { label: "Variant", w: tableW * 0.18 },
      { label: "Qty", w: 36, align: "right" as const },
      { label: "Status", w: tableW * 0.10 },
      { label: "Notes / Customisation", w: 0, flex: true },
    ];
    const fixedW = cols.reduce((s, c) => s + (c.flex ? 0 : c.w!), 0);
    cols.forEach(c => { if (c.flex) c.w = tableW - fixedW; });

    // Header
    let hy = doc.y;
    doc.save();
    doc.rect(tableX, hy, tableW, 20).fill(BRAND_PURPLE);
    doc.restore();
    let cx = tableX + 6;
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(8);
    cols.forEach(c => {
      doc.text(c.label.toUpperCase(), cx, hy + 6, { width: (c.w as number) - 8, align: c.align || "left", characterSpacing: 0.4 });
      cx += c.w as number;
    });
    doc.y = hy + 20;

    g.orders
      .slice()
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .forEach((o, idx) => {
        // Estimate row height from notes
        const noteText = [o.notes, o.adminNotes ? `[admin] ${o.adminNotes}` : null].filter(Boolean).join("  •  ") || "—";
        const noteCol = cols[cols.length - 1];
        const noteHeight = doc.heightOfString(noteText, { width: (noteCol.w as number) - 8 });
        const customerCol = cols[1];
        const customerText = `${o.userName}${o.userEmail ? `\n${o.userEmail}` : ""}`;
        const customerHeight = doc.heightOfString(customerText, { width: (customerCol.w as number) - 8 });
        const rowH = Math.max(22, noteHeight + 8, customerHeight + 8);
        ensureSpace(doc, rowH);
        const ry = doc.y;
        if (idx % 2 === 1) {
          doc.save();
          doc.rect(tableX, ry, tableW, rowH).fill(ZEBRA);
          doc.restore();
        }
        let rx = tableX + 6;
        doc.fillColor("#111827").font("Helvetica").fontSize(8.5);

        const dateStr = format(new Date(o.createdAt), "d MMM");
        const variantStr = variantKey(o);
        const statusStr = o.status.charAt(0).toUpperCase() + o.status.slice(1);
        const cellTopY = ry + 4;
        const values: { text: string; bold?: boolean; color?: string }[] = [
          { text: String(idx + 1), color: MUTED },
          { text: customerText },
          { text: dateStr },
          { text: variantStr },
          { text: String(o.quantity), bold: true },
          { text: statusStr, color: BRAND_PURPLE },
          { text: noteText },
        ];
        cols.forEach((c, i) => {
          const v = values[i];
          if (v.bold) doc.font("Helvetica-Bold"); else doc.font("Helvetica");
          doc.fillColor(v.color || "#111827");
          doc.text(v.text, rx, cellTopY, { width: (c.w as number) - 8, align: c.align || "left" });
          rx += c.w as number;
        });
        doc.y = ry + rowH;
      });

    // outer border
    doc.save();
    doc.lineWidth(0.5).strokeColor(BORDER).rect(tableX, hy, tableW, doc.y - hy).stroke();
    doc.restore();

    doc.moveDown(1.2);
  }
}

function drawAllPagesFooter(doc: PDFKit.PDFDocument, meta: SupplierSheetMeta) {
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    const w = doc.page.width;
    const h = doc.page.height;
    doc.save();
    doc.moveTo(PAGE_MARGIN, h - 56).lineTo(w - PAGE_MARGIN, h - 56).strokeColor(BORDER).lineWidth(0.5).stroke();
    doc.restore();
    doc.fillColor(MUTED).font("Helvetica").fontSize(8)
      .text(`${meta.clubName}  ·  Supplier Order Sheet  ·  ${format(meta.generatedAt, "d MMM yyyy")}`, PAGE_MARGIN, h - 46, { width: w - PAGE_MARGIN * 2 });
    doc.fillColor(MUTED).font("Helvetica").fontSize(8)
      .text(`Page ${i + 1} of ${range.count}`, PAGE_MARGIN, h - 46, { width: w - PAGE_MARGIN * 2, align: "right" });
  }
}
