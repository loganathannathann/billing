import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Download, Printer, MessageCircle, Mail } from "lucide-react";
import type { Order, Settings } from "@/lib/types";
import { downloadInvoicePDF, printInvoicePDF, shareInvoiceOnWhatsApp } from "@/lib/pdf";
import { inr, fmtDate } from "@/lib/format";
import logoUrl from "@/assets/aarika-logo.png";
import { toast } from "sonner";

export function InvoiceDialog({
  order,
  settings,
  open,
  onOpenChange,
}: {
  order: Order | null;
  settings: Settings;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  if (!order) return null;

  const copyLink = async () => {
    const text = `${settings.shopName} — Invoice ${order.invoiceNo} · Total ${inr(order.total)}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Invoice summary copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  const emailDemo = () => {
    const subject = encodeURIComponent(`Invoice ${order.invoiceNo} · ${settings.shopName}`);
    const body = encodeURIComponent(
      `Hello ${order.customer.name || ""},\n\nThank you for shopping with ${settings.shopName}.\nInvoice ${order.invoiceNo} · Total ${inr(order.total)}\n\n— ${settings.shopName}`,
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    toast.info("Opening email client (demo)");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
        <DialogHeader className="bg-primary text-primary-foreground px-6 py-3 flex-row items-center space-y-0">
          <DialogTitle className="text-sm tracking-widest font-medium">
            INVOICE #{order.invoiceNo}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-4 flex flex-wrap items-center gap-2 border-b bg-muted/30">
          <Button variant="outline" size="sm" onClick={copyLink}>
            <Copy className="h-4 w-4" /> Copy summary
          </Button>
          <Button size="sm" onClick={() => downloadInvoicePDF(order, settings)}>
            <Download className="h-4 w-4" /> Download PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => printInvoicePDF(order, settings)}>
            <Printer className="h-4 w-4" /> Print
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => shareInvoiceOnWhatsApp(order, settings)}
            className="text-success border-success/40 hover:bg-success/10 hover:text-success"
          >
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </Button>
          <Button variant="outline" size="sm" onClick={emailDemo}>
            <Mail className="h-4 w-4" /> Email
          </Button>
        </div>

        <div className="overflow-y-auto p-6 md:p-10 bg-card">
          <div className="flex flex-col items-center text-center border-b pb-6">
            <div className="h-20 w-20 rounded-xl overflow-hidden bg-primary ring-2 ring-gold/40">
              <img src={logoUrl} alt="" className="h-full w-full object-cover" />
            </div>
            <h2 className="mt-4 font-serif text-3xl text-primary">{settings.shopName}</h2>
            <div className="text-xs tracking-widest text-gold mt-1">
              INVOICE · {order.invoiceNo}
            </div>
            <div className="text-xs text-muted-foreground mt-2 max-w-md">{settings.address}</div>
            <div className="text-xs text-muted-foreground">{settings.phone}</div>
          </div>

          <div className="grid grid-cols-2 gap-6 py-6 border-b">
            <div>
              <div className="text-[10px] tracking-widest text-muted-foreground">BILLED TO</div>
              <div className="mt-1 font-semibold">{order.customer.name || "Walk-in Customer"}</div>
              <div className="text-sm text-muted-foreground">{order.customer.phone || "—"}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] tracking-widest text-muted-foreground">ORDER DETAILS</div>
              <div className="mt-1 text-sm">
                <span className="font-semibold">Date:</span> {fmtDate(order.createdAt)}
              </div>
              <div className="text-sm">
                <span className="font-semibold">Payment:</span> {order.payment.toUpperCase()}
              </div>
              <div className="text-sm">
                <span className="font-semibold">Type:</span>{" "}
                <span className={order.source === "online" ? "text-gold" : "text-primary"}>
                  {order.source === "online" ? "ONLINE ORDER" : "OFFLINE SALE"}
                </span>
              </div>
            </div>
          </div>

          <table className="w-full my-6 text-sm">
            <thead>
              <tr className="text-[10px] tracking-widest text-muted-foreground border-b">
                <th className="text-left py-2">ITEM DESCRIPTION</th>
                <th className="text-center py-2">QTY</th>
                <th className="text-right py-2">PRICE</th>
                <th className="text-right py-2">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((it, i) => (
                <tr key={i} className="border-b border-dashed">
                  <td className="py-3 font-medium text-primary">{it.name}</td>
                  <td className="py-3 text-center">{it.qty}</td>
                  <td className="py-3 text-right">{inr(it.price)}</td>
                  <td className="py-3 text-right font-medium">{inr(it.price * it.qty)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="ml-auto max-w-xs space-y-2 text-sm">
            <Row label="Subtotal" value={inr(order.subtotal)} />
            {order.discount > 0 && (
              <Row
                label={`Discount${order.couponCode ? ` (${order.couponCode})` : ""}`}
                value={`- ${inr(order.discount)}`}
              />
            )}
            {order.delivery > 0 && <Row label="Delivery" value={inr(order.delivery)} />}
            {order.gstApplied && (
              <Row label={`GST (${order.gstRate}%)`} value={inr(order.gstAmount)} />
            )}
            <div className="border-t-2 border-gold pt-3 flex justify-between items-baseline">
              <span className="text-sm font-semibold tracking-widest text-muted-foreground">
                TOTAL AMOUNT
              </span>
              <span className="text-2xl font-serif text-primary">{inr(order.total)}</span>
            </div>
          </div>

          <div className="mt-10 text-center text-xs text-muted-foreground border-t pt-6">
            <div className="font-semibold tracking-widest text-primary">
              THANK YOU FOR SHOPPING!
            </div>
            <div className="mt-1 tracking-widest">
              POWERED BY {settings.shopName.toUpperCase()} · {new Date().getFullYear()}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <span>{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}
