import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, MessageCircle, FileText, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStore, useHydrated } from "@/lib/store";
import { inr, fmtDate } from "@/lib/format";
import { InvoiceDialog } from "@/components/invoice-dialog";
import { shareInvoiceOnWhatsApp } from "@/lib/pdf";
import type { Order } from "@/lib/types";

export const Route = createFileRoute("/_app/orders")({
  component: OrderHistoryPage,
});

type Period = "all" | "today" | "week" | "month" | "year";

function withinPeriod(iso: string, period: Period): boolean {
  const d = new Date(iso).getTime();
  const now = new Date();
  const day = 24 * 3600 * 1000;
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  switch (period) {
    case "today":
      return d >= startOfToday;
    case "week":
      return d >= startOfToday - 6 * day;
    case "month":
      return d >= new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    case "year":
      return d >= new Date(now.getFullYear(), 0, 1).getTime();
    default:
      return true;
  }
}

const PAGE_SIZE = 10;

function OrderHistoryPage() {
  const hydrated = useHydrated();
  const { orders, settings } = useStore();
  const [period, setPeriod] = useState<Period>("all");
  const [q, setQ] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState<"all" | "offline" | "online">("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Order | null>(null);
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (!withinPeriod(o.createdAt, period)) return false;
      if (q && !o.invoiceNo.toLowerCase().includes(q.toLowerCase())) return false;
      if (name && !o.customer.name.toLowerCase().includes(name.toLowerCase())) return false;
      if (phone && !o.customer.phone.includes(phone)) return false;
      if (source !== "all" && o.source !== source) return false;
      return true;
    });
  }, [orders, period, q, name, phone, source]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageOrders = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const exportCsv = () => {
    const rows = [
      ["Invoice", "Date", "Customer", "Phone", "Source", "Payment", "Items", "Subtotal", "Discount", "GST", "Total", "Status"],
      ...filtered.map((o) => [
        o.invoiceNo,
        fmtDate(o.createdAt),
        o.customer.name,
        o.customer.phone,
        o.source,
        o.payment,
        String(o.items.reduce((s, it) => s + it.qty, 0)),
        String(o.subtotal),
        String(o.discount),
        String(o.gstAmount),
        String(o.total),
        o.status,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aarika-orders-${period}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!hydrated) return <div className="p-6" />;

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-serif text-primary">Order History</h1>
          <p className="text-sm text-muted-foreground">Manage and track past invoices</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PeriodTabs value={period} onChange={(p) => { setPeriod(p); setPage(1); }} />
          <Button variant="outline" onClick={exportCsv}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </header>

      <Card>
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-4 gap-3">
          <Field label="SEARCH ORDER ID">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="e.g. INV-..." className="pl-9" />
            </div>
          </Field>
          <Field label="CUSTOMER NAME">
            <Input value={name} onChange={(e) => { setName(e.target.value); setPage(1); }} placeholder="Search name..." />
          </Field>
          <Field label="CUSTOMER PHONE">
            <Input value={phone} onChange={(e) => { setPhone(e.target.value); setPage(1); }} placeholder="Search phone..." />
          </Field>
          <Field label="ORDER SOURCE">
            <Select value={source} onValueChange={(v) => { setSource(v as typeof source); setPage(1); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
                <SelectItem value="online">Online</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm tracking-widest text-muted-foreground font-semibold">
            {filtered.length} ORDERS
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[820px]">
              <thead>
                <tr className="text-[10px] tracking-widest text-muted-foreground border-b">
                  <th className="text-left py-3 font-semibold">ORDER ID</th>
                  <th className="text-left py-3 font-semibold">CUSTOMER</th>
                  <th className="text-left py-3 font-semibold">MOBILE</th>
                  <th className="text-left py-3 font-semibold">SOURCE</th>
                  <th className="text-right py-3 font-semibold">TOTAL</th>
                  <th className="text-center py-3 font-semibold">STATUS</th>
                  <th className="text-right py-3 font-semibold">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {pageOrders.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-muted-foreground">
                      No orders match those filters.
                    </td>
                  </tr>
                )}
                {pageOrders.map((o) => (
                  <tr key={o.id} className="border-b hover:bg-accent/30">
                    <td className="py-3 font-mono text-xs text-primary">{o.invoiceNo}</td>
                    <td className="py-3">{o.customer.name}</td>
                    <td className="py-3 text-muted-foreground">{o.customer.phone || "—"}</td>
                    <td className="py-3">
                      <Badge
                        variant="outline"
                        className={
                          o.source === "online"
                            ? "border-gold text-gold bg-gold/10"
                            : "border-primary/40 text-primary bg-primary/5"
                        }
                      >
                        {o.source.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-3 text-right font-semibold text-primary">{inr(o.total)}</td>
                    <td className="py-3 text-center">
                      <Badge className="bg-success/15 text-success border-success/30 uppercase text-[10px] tracking-widest" variant="outline">
                        {o.status}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-success border-success/40 hover:bg-success/10 h-8"
                          onClick={() => shareInvoiceOnWhatsApp(o, settings)}
                        >
                          <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                        </Button>
                        <Button
                          size="sm"
                          className="bg-primary h-8"
                          onClick={() => { setSelected(o); setOpen(true); }}
                        >
                          <FileText className="h-3.5 w-3.5" /> Invoice
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pageCount > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm">
              <div className="text-muted-foreground">
                Page {page} of {pageCount}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page === pageCount} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <InvoiceDialog order={selected} settings={settings} open={open} onOpenChange={setOpen} />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] tracking-widest text-muted-foreground font-semibold">
        {label}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function PeriodTabs({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  const opts: { k: Period; label: string }[] = [
    { k: "all", label: "ALL TIME" },
    { k: "today", label: "TODAY" },
    { k: "week", label: "THIS WEEK" },
    { k: "month", label: "THIS MONTH" },
    { k: "year", label: "THIS YEAR" },
  ];
  return (
    <div className="inline-flex rounded-full border bg-card p-1 text-[10px] tracking-widest font-semibold">
      {opts.map((o) => (
        <button
          key={o.k}
          onClick={() => onChange(o.k)}
          className={`px-3 py-1.5 rounded-full transition ${
            value === o.k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
