import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Order, Settings } from "./types";
import { fmtDate, inrPlain } from "./format";

export function generateInvoicePDF(order: Order, settings: Settings): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const MAROON: [number, number, number] = [74, 22, 36];
  const GOLD: [number, number, number] = [201, 168, 76];

  // Header band
  doc.setFillColor(...MAROON);
  doc.rect(0, 0, W, 90, "F");
  doc.setTextColor(255, 245, 220);
  doc.setFont("times", "bold");
  doc.setFontSize(26);
  doc.text(settings.shopName, 40, 45);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...GOLD);
  doc.text(settings.tagline.toUpperCase(), 40, 62);
  doc.setTextColor(255, 245, 220);
  doc.setFontSize(9);
  doc.text(`Invoice ${order.invoiceNo}`, W - 40, 45, { align: "right" });
  doc.text(fmtDate(order.createdAt), W - 40, 60, { align: "right" });
  doc.text(order.source === "online" ? "ONLINE ORDER" : "OFFLINE / POS", W - 40, 75, { align: "right" });

  // Shop details
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(9);
  let y = 115;
  doc.text(settings.address, 40, y);
  y += 12;
  doc.text(`Phone: ${settings.phone}`, 40, y);
  if (settings.gstin) {
    y += 12;
    doc.text(`GSTIN: ${settings.gstin}`, 40, y);
  }

  // Billed to
  y += 24;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...MAROON);
  doc.text("BILLED TO", 40, y);
  doc.text("ORDER DETAILS", W / 2 + 20, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(10);
  y += 14;
  doc.text(order.customer.name || "Walk-in Customer", 40, y);
  doc.text(`Invoice: ${order.invoiceNo}`, W / 2 + 20, y);
  y += 12;
  doc.text(order.customer.phone || "-", 40, y);
  doc.text(`Payment: ${order.payment.toUpperCase()}`, W / 2 + 20, y);
  y += 12;
  doc.text(`Source: ${order.source.toUpperCase()}`, W / 2 + 20, y);

  // Items table
  autoTable(doc, {
    startY: y + 24,
    head: [["#", "Item Description", "Qty", "Price", "Total"]],
    body: order.items.map((it, i) => [
      String(i + 1),
      it.name,
      String(it.qty),
      inrPlain(it.price),
      inrPlain(it.price * it.qty),
    ]),
    styles: { fontSize: 10, cellPadding: 8 },
    headStyles: { fillColor: MAROON, textColor: [255, 245, 220], fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 30 },
      2: { halign: "center", cellWidth: 50 },
      3: { halign: "right", cellWidth: 80 },
      4: { halign: "right", cellWidth: 90 },
    },
    theme: "striped",
    alternateRowStyles: { fillColor: [250, 245, 235] },
  });

  const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;
  const rightX = W - 40;
  const labelX = W - 220;

  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  const rows: Array<[string, string]> = [
    ["Subtotal", inrPlain(order.subtotal)],
  ];
  if (order.discount) rows.push([`Discount${order.couponCode ? ` (${order.couponCode})` : ""}`, `- ${inrPlain(order.discount)}`]);
  if (order.delivery) rows.push(["Delivery", inrPlain(order.delivery)]);
  if (order.gstApplied) rows.push([`GST (${order.gstRate}%)`, inrPlain(order.gstAmount)]);

  let ry = finalY;
  rows.forEach(([l, v]) => {
    doc.text(l, labelX, ry);
    doc.text(v, rightX, ry, { align: "right" });
    ry += 14;
  });

  // Total block
  ry += 6;
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(1);
  doc.line(labelX, ry - 2, rightX, ry - 2);
  ry += 18;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...MAROON);
  doc.text("TOTAL AMOUNT", labelX, ry);
  doc.text(`Rs. ${inrPlain(order.total)}`, rightX, ry, { align: "right" });

  // Footer
  const H = doc.internal.pageSize.getHeight();
  doc.setFillColor(250, 245, 235);
  doc.rect(0, H - 60, W, 60, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...MAROON);
  doc.text("Thank you for shopping with us!", W / 2, H - 36, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(`Powered by ${settings.shopName} · ${new Date().getFullYear()}`, W / 2, H - 20, {
    align: "center",
  });

  return doc;
}

export function downloadInvoicePDF(order: Order, settings: Settings) {
  const doc = generateInvoicePDF(order, settings);
  doc.save(`${order.invoiceNo}.pdf`);
}

export function printInvoicePDF(order: Order, settings: Settings) {
  const doc = generateInvoicePDF(order, settings);
  const url = doc.output("bloburl");
  const w = window.open(url as unknown as string, "_blank");
  if (w) w.focus();
}

export function invoiceWhatsAppUrl(order: Order, settings: Settings): string {
  const phone = order.customer.phone.replace(/\D/g, "");
  const text = encodeURIComponent(
    `${settings.shopName} — Invoice ${order.invoiceNo}\nTotal: ₹${inrPlain(order.total)}\nPlease find the invoice PDF attached.`,
  );
  return phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
}

/**
 * Share the invoice as a PDF via WhatsApp.
 * Uses the Web Share API with files when available (mobile → native WhatsApp picker).
 * Falls back to downloading the PDF locally and opening the WhatsApp chat.
 */
export async function shareInvoiceOnWhatsApp(order: Order, settings: Settings): Promise<void> {
  const doc = generateInvoicePDF(order, settings);
  const blob = doc.output("blob") as Blob;
  const fileName = `${order.invoiceNo}.pdf`;
  const file = new File([blob], fileName, { type: "application/pdf" });

  const nav = navigator as Navigator & {
    canShare?: (data: { files?: File[] }) => boolean;
    share?: (data: { files?: File[]; title?: string; text?: string }) => Promise<void>;
  };

  if (nav.canShare && nav.canShare({ files: [file] }) && nav.share) {
    try {
      await nav.share({
        files: [file],
        title: `Invoice ${order.invoiceNo}`,
        text: `${settings.shopName} — Invoice ${order.invoiceNo} · Total ₹${inrPlain(order.total)}`,
      });
      return;
    } catch (err) {
      const e = err as { name?: string };
      if (e?.name === "AbortError") return;
      // fall through to fallback
    }
  }

  // Fallback: download the PDF and open WhatsApp chat so user can attach it.
  doc.save(fileName);
  window.open(invoiceWhatsAppUrl(order, settings), "_blank");
}

