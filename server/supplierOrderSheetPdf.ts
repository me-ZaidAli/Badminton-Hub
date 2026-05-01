import PDFDocument from "pdfkit";
import { format } from "date-fns";
import fs from "fs";

export interface SupplierSheetClubLogo {
  name: string;
  logoPath: string | null;
}

export interface SupplierSheetOrder {
  id: number;
  size: string | null;
  gender: string | null;
  style: string | null;
  quantity: number;
  notes: string | null;
  adminNotes: string | null;
  backName: string | null;
  status: string;
  paymentStatus: string | null;
  createdAt: Date | string;
  clubName?: string | null;
  product: {
    id: number;
    name: string;
    description: string | null;
    shortDescription: string | null;
    materials: string | null;
    specifications: string | null;
    categoryName: string | null;
  };
}

export interface SupplierSheetMeta {
  clubName: string;
  generatedByName: string;
  generatedAt: Date;
  showClubColumn?: boolean;
  clubLogos?: SupplierSheetClubLogo[];
}

const BRAND_PURPLE = "#7c3aed";
const BRAND_DARK = "#1f1147";
const MUTED = "#6b7280";
const BORDER = "#e5e7eb";
const ZEBRA = "#f9fafb";
const PAGE_MARGIN = 48;

function variantKey(o: SupplierSheetOrder) {
  const parts = [o.size, o.gender, o.style].filter(Boolean);
  return parts.length ? parts.join(" / ") : "Standard";
}

interface ProductGroup {
  product: SupplierSheetOrder["product"];
  totalQty: number;
  variants: Map<string, { qty: number; orderCount: number }>;
  orders: SupplierSheetOrder[];
  customisedCount: number;
}

function groupByProduct(orders: SupplierSheetOrder[]): ProductGroup[] {
  const map = new Map<number, ProductGroup>();
  for (const o of orders) {
    let g = map.get(o.product.id);
    if (!g) {
      g = { product: o.product, totalQty: 0, variants: new Map(), orders: [], customisedCount: 0 };
      map.set(o.product.id, g);
    }
    g.totalQty += o.quantity;
    if (o.backName && o.backName.trim()) g.customisedCount += 1;
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
  const customisedCount = orders.reduce((s, o) => s + (o.backName && o.backName.trim() ? 1 : 0), 0);

  drawHeader(doc, meta, orders.length, totalQty, customisedCount, groups.length);
  drawSummarySection(doc, groups);
  drawDetailsSection(doc, groups, !!meta.showClubColumn);
  drawAllPagesFooter(doc, meta);

  return doc;
}

function drawHeader(
  doc: PDFKit.PDFDocument,
  meta: SupplierSheetMeta,
  orderCount: number,
  totalQty: number,
  customisedCount: number,
  productCount: number,
) {
  const pageW = doc.page.width;
  const x = PAGE_MARGIN;

  // Reserve right-hand area for club logos so the title text doesn't run under them.
  const validLogos = (meta.clubLogos || [])
    .filter(l => l.logoPath && fs.existsSync(l.logoPath))
    .slice(0, 5);
  const logoSize = 44;
  const logoGap = 8;
  const logoBlockW = validLogos.length > 0
    ? validLogos.length * logoSize + (validLogos.length - 1) * logoGap
    : 0;
  const headerH = 110;
  const titleW = pageW - x * 2 - (logoBlockW > 0 ? logoBlockW + 16 : 0);

  doc.save();
  doc.rect(0, 0, pageW, headerH).fill(BRAND_DARK);
  doc.rect(0, 0, pageW, 6).fill(BRAND_PURPLE);
  doc.restore();

  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(22)
    .text("Supplier Order Sheet", x, 24, { width: titleW });
  doc.fillColor("#cbd5e1").font("Helvetica").fontSize(11)
    .text(meta.clubName, x, 56, { width: titleW });
  doc.fillColor("#94a3b8").fontSize(9)
    .text(`Generated ${format(meta.generatedAt, "EEE d MMM yyyy 'at' HH:mm")} by ${meta.generatedByName}`, x, 74, { width: titleW });

  // Render club logo(s) on the right side of the header banner.
  if (validLogos.length > 0) {
    const logosY = (headerH - logoSize) / 2 + 2;
    let logoX = pageW - PAGE_MARGIN - logoBlockW;
    for (const l of validLogos) {
      doc.save();
      // White rounded backdrop so dark/transparent logos remain visible on the dark banner.
      doc.roundedRect(logoX, logosY, logoSize, logoSize, 6).fill("#ffffff");
      doc.restore();
      try {
        doc.image(l.logoPath as string, logoX + 3, logosY + 3, {
          fit: [logoSize - 6, logoSize - 6],
          align: "center",
          valign: "center",
        });
      } catch {
        // If the image is unreadable (corrupt / unsupported format), silently skip — the white tile remains.
      }
      logoX += logoSize + logoGap;
    }
  }

  doc.y = 130;

  const cardY = doc.y;
  const cardH = 56;
  const cards = [
    { label: "Orders", value: String(orderCount) },
    { label: "Products", value: String(productCount) },
    { label: "Total units", value: String(totalQty) },
    { label: "Customised", value: String(customisedCount) },
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
  const rightParts = [`${g.totalQty} unit${g.totalQty === 1 ? "" : "s"}`];
  if (g.customisedCount > 0) rightParts.push(`${g.customisedCount} customised`);
  const rightText = rightParts.join("  ·  ");
  doc.fillColor(BRAND_PURPLE).font("Helvetica-Bold").fontSize(10)
    .text(rightText, PAGE_MARGIN + innerW * 0.6, startY + 10, { width: innerW * 0.4 - 12, align: "right" });
  doc.y = startY + headerH + 6;

  const metaParts: string[] = [];
  if (g.product.categoryName) metaParts.push(g.product.categoryName);
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

function drawDetailsSection(doc: PDFKit.PDFDocument, groups: ProductGroup[], showClubColumn: boolean) {
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
    const cols: { label: string; w: number; align?: "right" | "left"; flex?: boolean }[] = [
      { label: "#", w: 26 },
      { label: "Order Ref", w: tableW * (showClubColumn ? 0.14 : 0.16) },
    ];
    if (showClubColumn) cols.push({ label: "Club", w: tableW * 0.14 });
    cols.push(
      { label: "Date", w: tableW * 0.10 },
      { label: "Variant", w: tableW * 0.18 },
      { label: "Qty", w: 36, align: "right" },
      { label: "Status", w: tableW * 0.10 },
      { label: "Notes / Customisation", w: 0, flex: true },
    );
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
        // Back name is rendered prominently on its own line above the rest of the note text.
        const backNameClean = o.backName?.trim() || "";
        const noteText = [
          o.notes,
          o.adminNotes ? `[admin] ${o.adminNotes}` : null,
        ].filter(Boolean).join("  •  ") || (backNameClean ? "" : "—");
        const noteCol = cols[cols.length - 1];
        const noteColW = (noteCol.w as number) - 8;
        const backLineText = backNameClean ? `BACK: ${backNameClean.toUpperCase()}` : "";
        // Measure heights using the matching font sizes
        doc.font("Helvetica-Bold").fontSize(9);
        const backHeight = backLineText ? doc.heightOfString(backLineText, { width: noteColW }) : 0;
        doc.font("Helvetica").fontSize(8.5);
        const noteHeight = noteText ? doc.heightOfString(noteText, { width: noteColW }) : 0;
        const totalNoteHeight = backHeight + (backHeight && noteHeight ? 2 : 0) + noteHeight;
        // Privacy: never include customer name, email or any personal data
        // on the supplier sheet. The order reference (#1234) is the only link
        // back to the customer record and is kept on the club's internal system.
        const orderRefText = `#${o.id}`;
        const rowH = Math.max(22, totalNoteHeight + 8);
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
          { text: orderRefText, color: MUTED },
        ];
        if (showClubColumn) values.push({ text: o.clubName || "—", color: BRAND_DARK });
        values.push(
          { text: dateStr },
          { text: variantStr },
          { text: String(o.quantity), bold: true },
          { text: statusStr, color: BRAND_PURPLE },
          { text: noteText },
        );
        cols.forEach((c, i) => {
          const v = values[i];
          const isLastCol = i === cols.length - 1;
          if (isLastCol && backLineText) {
            // Custom render for notes column when there's a back-name to highlight
            doc.font("Helvetica-Bold").fontSize(9).fillColor(BRAND_PURPLE);
            doc.text(backLineText, rx, cellTopY, { width: (c.w as number) - 8 });
            if (v.text) {
              doc.font("Helvetica").fontSize(8.5).fillColor("#111827");
              doc.text(v.text, rx, cellTopY + backHeight + 2, { width: (c.w as number) - 8 });
            }
          } else {
            if (v.bold) doc.font("Helvetica-Bold").fontSize(8.5); else doc.font("Helvetica").fontSize(8.5);
            doc.fillColor(v.color || "#111827");
            doc.text(v.text, rx, cellTopY, { width: (c.w as number) - 8, align: c.align || "left" });
          }
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
