import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  TrendingUp,
  ShoppingBag,
  Package,
  AlertTriangle,
  IndianRupee,
  Wifi,
  WifiOff,
  Award,
  Percent,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";
import { useStore, useHydrated } from "@/lib/store";
import { inr, inrPlain } from "@/lib/format";
import type { Order } from "@/lib/types";

export const Route = createFileRoute("/_app/dashboard")({
  component: DashboardPage,
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

function DashboardPage() {
  const hydrated = useHydrated();
  const { orders, products, settings } = useStore();
  const [period, setPeriod] = useState<Period>("all");

  const filtered = useMemo(
    () => orders.filter((o) => o.status === "completed" && withinPeriod(o.createdAt, period)),
    [orders, period],
  );

  const stats = useMemo(() => {
    const totalRevenue = filtered.reduce((s, o) => s + o.total, 0);
    const offline = filtered.filter((o) => o.source === "offline");
    const online = filtered.filter((o) => o.source === "online");
    const items = filtered.reduce((s, o) => s + o.items.reduce((a, it) => a + it.qty, 0), 0);
    const avgOrder = filtered.length ? totalRevenue / filtered.length : 0;

    // Top product
    const productTotals = new Map<string, { name: string; qty: number; revenue: number }>();
    filtered.forEach((o) =>
      o.items.forEach((it) => {
        const prev = productTotals.get(it.name) ?? { name: it.name, qty: 0, revenue: 0 };
        prev.qty += it.qty;
        prev.revenue += it.qty * it.price;
        productTotals.set(it.name, prev);
      }),
    );
    const topProducts = Array.from(productTotals.values()).sort((a, b) => b.revenue - a.revenue);

    // Category breakdown
    const catTotals = new Map<string, number>();
    filtered.forEach((o) =>
      o.items.forEach((it) => {
        const p = products.find((pp) => pp.id === it.productId);
        const cat = p?.category ?? "Other";
        catTotals.set(cat, (catTotals.get(cat) ?? 0) + it.qty * it.price);
      }),
    );
    const categories = Array.from(catTotals, ([name, value]) => ({ name, value })).sort(
      (a, b) => b.value - a.value,
    );

    // Payment breakdown
    const payTotals = new Map<string, number>();
    filtered.forEach((o) => payTotals.set(o.payment, (payTotals.get(o.payment) ?? 0) + o.total));
    const payments = Array.from(payTotals, ([name, value]) => ({ name: name.toUpperCase(), value }));

    return {
      totalRevenue,
      offlineRevenue: offline.reduce((s, o) => s + o.total, 0),
      onlineRevenue: online.reduce((s, o) => s + o.total, 0),
      offlineCount: offline.length,
      onlineCount: online.length,
      completed: filtered.length,
      items,
      avgOrder,
      topProducts,
      categories,
      payments,
    };
  }, [filtered, products]);

  const trend = useMemo(() => buildTrend(filtered, period), [filtered, period]);
  const lowStock = products.filter((p) => p.stock <= settings.lowStockThreshold).sort((a, b) => a.stock - b.stock);

  const COLORS = [
    "oklch(0.32 0.11 15)",
    "oklch(0.72 0.13 85)",
    "oklch(0.55 0.12 30)",
    "oklch(0.62 0.15 155)",
    "oklch(0.55 0.15 300)",
    "oklch(0.4 0.15 260)",
  ];

  if (!hydrated) return <div className="p-6" />;

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-serif text-primary">POS Analytics</h1>
          <p className="text-sm text-muted-foreground">Real-time store & channel insights</p>
        </div>
        <PeriodTabs value={period} onChange={setPeriod} />
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Stat
          label="TOTAL REVENUE"
          value={inr(stats.totalRevenue)}
          sub={`${stats.completed} completed`}
          icon={<IndianRupee className="h-4 w-4" />}
          accent="primary"
        />
        <Stat
          label="COMPLETED BILLS"
          value={String(stats.completed)}
          sub="All sale channels"
          icon={<ShoppingBag className="h-4 w-4" />}
          accent="gold"
        />
        <Stat
          label="OFFLINE BILLS"
          value={inr(stats.offlineRevenue)}
          sub={`${stats.offlineCount} POS sales`}
          icon={<WifiOff className="h-4 w-4" />}
          accent="primary"
        />
        <Stat
          label="ONLINE BILLS"
          value={inr(stats.onlineRevenue)}
          sub={`${stats.onlineCount} online orders`}
          icon={<Wifi className="h-4 w-4" />}
          accent="gold"
        />
        <Stat
          label="ITEMS SOLD"
          value={String(stats.items)}
          sub="Units across bills"
          icon={<Package className="h-4 w-4" />}
        />
        <Stat
          label="AVG ORDER VALUE"
          value={inr(stats.avgOrder)}
          sub="Per completed order"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <Stat
          label="TOP PRODUCT"
          value={stats.topProducts[0]?.name.slice(0, 18) ?? "—"}
          sub={stats.topProducts[0] ? `${stats.topProducts[0].qty} units` : "No sales yet"}
          icon={<Award className="h-4 w-4" />}
          accent="gold"
        />
        <Stat
          label="LOW STOCK"
          value={String(lowStock.length)}
          sub={`≤ ${settings.lowStockThreshold} in stock`}
          icon={<AlertTriangle className="h-4 w-4" />}
          accent={lowStock.length > 0 ? "danger" : undefined}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2 flex-row items-baseline justify-between flex-wrap space-y-0">
            <div>
              <CardTitle className="text-base">Revenue Trend</CardTitle>
              <p className="text-xs text-muted-foreground">
                {trend.length} data points · avg {inr(stats.totalRevenue / Math.max(1, trend.length))}
              </p>
            </div>
            <div className="font-serif text-2xl text-primary">{inr(stats.totalRevenue)}</div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" tickFormatter={(v) => `₹${inrPlain(v)}`} />
                  <Tooltip
                    contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }}
                    formatter={(v: number) => inr(v)}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="var(--primary)"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "var(--gold)" }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Order Source</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SourceBar label="OFFLINE" value={stats.offlineCount} total={stats.completed} color="bg-primary" />
            <SourceBar label="ONLINE" value={stats.onlineCount} total={stats.completed} color="bg-success" />

            <div className="pt-4 border-t">
              <div className="text-xs tracking-widest font-semibold text-muted-foreground mb-2">
                PAYMENT BREAKDOWN
              </div>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.payments.length ? stats.payments : [{ name: "—", value: 1 }]}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={40}
                      outerRadius={60}
                      paddingAngle={2}
                    >
                      {(stats.payments.length ? stats.payments : [{ name: "—", value: 1 }]).map(
                        (_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ),
                      )}
                    </Pie>
                    <Tooltip formatter={(v: number) => inr(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {stats.payments.map((p, i) => (
                  <div key={p.name} className="flex items-center gap-1.5 text-xs">
                    <span
                      className="h-2.5 w-2.5 rounded-sm inline-block"
                      style={{ background: COLORS[i % COLORS.length] }}
                    />
                    {p.name}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top Items by Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-10 text-center">
                No sales in this period.
              </p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.topProducts.slice(0, 6)} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${inrPlain(v)}`} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={130} />
                    <Tooltip formatter={(v: number) => inr(v)} />
                    <Bar dataKey="revenue" fill="var(--primary)" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Category Breakdown</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {stats.categories.length === 0 ? (
              <p className="text-sm text-muted-foreground py-10 text-center">No data yet.</p>
            ) : (
              <div className="space-y-3">
                {stats.categories.map((c, i) => {
                  const totalCat = stats.categories.reduce((s, x) => s + x.value, 0);
                  const pct = totalCat ? (c.value / totalCat) * 100 : 0;
                  return (
                    <div key={c.name}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium">{c.name}</span>
                        <span className="text-muted-foreground">
                          {inr(c.value)} · {pct.toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className={`h-4 w-4 ${lowStock.length ? "text-warning" : "text-muted-foreground"}`} />
            Low-Stock Alerts
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            Threshold ≤ {settings.lowStockThreshold}
          </Badge>
        </CardHeader>
        <CardContent>
          {lowStock.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">All products are healthily stocked. ✨</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {lowStock.map((p) => (
                <div
                  key={p.id}
                  className="rounded-lg border border-warning/30 bg-warning/5 p-3 flex items-center justify-between"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{p.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.category} · {inr(p.price)}
                    </div>
                  </div>
                  <Badge className="bg-warning text-warning-foreground">{p.stock} left</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
  accent?: "primary" | "gold" | "danger";
}) {
  const accentCls =
    accent === "gold"
      ? "bg-gold/15 text-gold"
      : accent === "danger"
      ? "bg-destructive/15 text-destructive"
      : "bg-primary/10 text-primary";
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center justify-between">
          <div className="text-[10px] tracking-widest text-muted-foreground font-semibold">{label}</div>
          <div className={`h-7 w-7 rounded-full flex items-center justify-center ${accentCls}`}>
            {icon}
          </div>
        </div>
        <div className="mt-2 font-serif text-2xl text-foreground truncate">{value}</div>
        {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function SourceBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="tracking-widest font-semibold text-muted-foreground">{label}</span>
        <span className="font-semibold">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
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

function buildTrend(orders: Order[], period: Period): { label: string; value: number }[] {
  if (orders.length === 0) return [];
  const now = new Date();
  const map = new Map<string, number>();
  const fmtKey = (d: Date, kind: "day" | "month") =>
    kind === "month"
      ? d.toLocaleString("en-IN", { month: "short" })
      : d.toLocaleString("en-IN", { day: "2-digit", month: "short" });

  let buckets: { key: string; date: Date }[] = [];
  const day = 24 * 3600 * 1000;

  if (period === "today") {
    for (let h = 0; h < 24; h += 3) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h);
      buckets.push({ key: `${h}:00`, date: d });
    }
  } else if (period === "week") {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * day);
      buckets.push({ key: fmtKey(d, "day"), date: d });
    }
  } else if (period === "month") {
    const dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    for (let i = 1; i <= dim; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), i);
      buckets.push({ key: String(i).padStart(2, "0"), date: d });
    }
  } else {
    // year / all — group by month
    for (let m = 0; m < 12; m++) {
      const d = new Date(now.getFullYear(), m, 1);
      buckets.push({ key: fmtKey(d, "month"), date: d });
    }
  }

  buckets.forEach((b) => map.set(b.key, 0));

  orders.forEach((o) => {
    const d = new Date(o.createdAt);
    let key: string;
    if (period === "today") {
      const h = Math.floor(d.getHours() / 3) * 3;
      key = `${h}:00`;
    } else if (period === "week" || period === "month") {
      key = period === "week" ? fmtKey(d, "day") : String(d.getDate()).padStart(2, "0");
    } else {
      key = fmtKey(d, "month");
    }
    map.set(key, (map.get(key) ?? 0) + o.total);
  });

  return buckets.map((b) => ({ label: b.key, value: map.get(b.key) ?? 0 }));
}
