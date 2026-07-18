import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Plus,
  Minus,
  Trash2,
  Search,
  Package,
  Pause,
  Play,
  X,
  ShoppingCart,
  Wifi,
  WifiOff,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { inr } from "@/lib/format";
import { store, useStore, useHydrated, readHeld, writeHeld, makeInvoiceNo } from "@/lib/store";
import type { Order, OrderItem, OrderSource, PaymentMethod } from "@/lib/types";
import { InvoiceDialog } from "@/components/invoice-dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/billing")({
  component: BillingPanel,
});

function BillingPanel() {
  const hydrated = useHydrated();
  const { products,  settings } = useStore();

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const deleteProduct = (id: string) => {
  if (!window.confirm("Delete this product from catalog?")) return;

  const updated = products.filter((p) => p.id !== id);
  store.setProducts(updated);

  toast.success("Product deleted");
};


const editProduct = (id: string) => {

  const product = products.find((p) => p.id === id);

  if (!product) return;


  const name = window.prompt(
    "Product Name",
    product.name
  );

  const price = window.prompt(
    "Product Price",
    product.price.toString()
  );


  if (!name || !price) return;


  const updated = products.map((p) =>
    p.id === id
      ? {
          ...p,
          name,
          price: Number(price),
        }
      : p
  );


  store.setProducts(updated);

  toast.success("Product updated");
};
  const [items, setItems] = useState<OrderItem[]>([]);
  const [discountType, setDiscountType] = useState<"flat" | "percent">("flat");
  const [discountValue, setDiscountValue] = useState(0);
  
  const [delivery, setDelivery] = useState(0);
  const [gstApplied, setGstApplied] = useState(false);
  const [source, setSource] = useState<OrderSource>("offline");
  const [payment, setPayment] = useState<PaymentMethod>("cash");
  const [amountReceived, setAmountReceived] = useState(0);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  const subtotal = useMemo(() => items.reduce((s, it) => s + it.price * it.qty, 0), [items]);

  const manualDiscount =
    discountType === "flat" ? Number(discountValue) || 0 : ((Number(discountValue) || 0) * subtotal) / 100;
  
  const discount = Math.min(subtotal, manualDiscount );
  const taxable = Math.max(0, subtotal - discount);
  const gstAmount = gstApplied ? Math.round(taxable * (settings.gstRate / 100)) : 0;
  const total = Math.max(0, taxable + Number(delivery || 0) + gstAmount);

  const filteredCatalog = products.filter((p) =>
    p.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
    p.category.toLowerCase().includes(catalogSearch.toLowerCase()),
  );

  const addProductToCart = (id: string) => {
    const p = products.find((x) => x.id === id);
    if (!p) return;
    setItems((prev) => {
      const idx = prev.findIndex((it) => it.productId === id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
        return next;
      }
      return [...prev, { productId: id, name: p.name, price: p.price, qty: 1 }];
    });
  };

  const addCustomItem = () => {
    setItems((prev) => [...prev, { name: "", price: 0, qty: 1 }]);
  };

  const updateItem = (i: number, patch: Partial<OrderItem>) => {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  };
  const removeItem = (i: number) => {
    const it = items[i];
    const label = it?.name?.trim() ? `"${it.name}"` : "this item";
    if (!window.confirm(`Are you sure you want to remove ${label} from the order?`)) return;
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  };

  const clearOrder = () => {
    if (items.length > 0 && !window.confirm("Are you sure you want to clear the entire order?")) return;
    setItems([]);
    setCustomerName("");
    setCustomerPhone("");
    setDiscountValue(0);
    
    setDelivery(0);
    setGstApplied(false);
    setAmountReceived(0);
  };

  const holdCart = () => {
    if (items.length === 0) return toast.error("Nothing to hold");
    const held = readHeld();
    writeHeld([
      ...held,
      {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        label: customerName || `Cart ${held.length + 1}`,
        items,
        customer: { name: customerName, phone: customerPhone },
      },
    ]);
    toast.success("Cart on hold");
    clearOrder();
  };

  const resumeHeld = (id: string) => {
    const held = readHeld();
    const h = held.find((x) => x.id === id);
    if (!h) return;
    setItems(h.items);
    setCustomerName(h.customer.name);
    setCustomerPhone(h.customer.phone);
    writeHeld(held.filter((x) => x.id !== id));
    toast.success("Cart resumed");
  };

   const completeSale = async () => {

  if (!customerName.trim()) {
    toast.error("Please enter customer name");
    return;
  }

  if (!customerPhone.trim()) {
    toast.error("Please enter customer mobile number");
    return;
  }

  if (items.length === 0) {
    return toast.error("Cart is empty");
  }

    if (items.some((it) => !it.name.trim())) return toast.error("Every item needs a name");
    const order: Order = {
      id: crypto.randomUUID(),
      invoiceNo: makeInvoiceNo(settings.invoicePrefix),
      createdAt: new Date().toISOString(),
      customer: { name: customerName || "Walk-in Customer", phone: customerPhone },
      items,
      subtotal,
      discount,
      
      delivery: Number(delivery || 0),
      gstApplied,
      gstRate: settings.gstRate,
      gstAmount,
      total,
      amountReceived: Number(amountReceived || total),
      source,
      payment,
      status: "completed",
    };
    const { data, error } = await supabase
  .from("orders")
  .insert({
    invoice_no: order.invoiceNo,
    customer_name: order.customer.name,
    customer_phone: order.customer.phone,
    subtotal: order.subtotal,
    discount: order.discount,
    gst_amount: order.gstAmount,
    total: order.total,
    payment_method: order.payment,
    source: order.source,
    status: order.status,
  })
  .select()
  .single();
if (error) {
  console.error(error);
  toast.error("Failed to save order");
  return;
}
const orderItems = order.items.map((item) => ({
  order_id: data.id,
  product_id: item.productId,
  product_name: item.name,
  price: item.price,
  quantity: item.qty,
}));

const { error: itemsError } = await supabase
  .from("order_items")
  .insert(orderItems);

if (itemsError) {
  console.error(itemsError);
  toast.error("Order saved, but items could not be saved.");
  return;
}

toast.success("Order saved to database");
    setLastOrder(order);
    setInvoiceOpen(true);
    toast.success(`Sale completed · ${inr(total)}`);
    clearOrder();
  };

  if (!hydrated) return <div className="p-6" />;

  const held = readHeld();

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-serif text-primary">POS Billing Panel</h1>
          <p className="text-sm text-muted-foreground">
            Quick invoice generator & database-synced checkout
          </p>
        </div>
        <div className="inline-flex rounded-full border bg-card p-1 text-xs">
          <button
            onClick={() => setSource("offline")}
            className={`px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 tracking-widest font-medium transition ${
              source === "offline" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            <WifiOff className="h-3 w-3" /> OFFLINE (POS)
          </button>
          <button
            onClick={() => setSource("online")}
            className={`px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 tracking-widest font-medium transition ${
              source === "online" ? "bg-gold text-gold-foreground" : "text-muted-foreground"
            }`}
          >
            <Wifi className="h-3 w-3" /> ONLINE ORDER
          </button>
        </div>
      </header>

      {held.length > 0 && (
        <div className="rounded-lg border bg-accent/40 p-3 flex items-center gap-2 flex-wrap">
          <span className="text-xs tracking-widest text-muted-foreground font-semibold">
            HELD CARTS
          </span>
          {held.map((h) => (
            <button
              key={h.id}
              onClick={() => resumeHeld(h.id)}
              className="inline-flex items-center gap-1.5 rounded-full bg-card border px-3 py-1 text-xs hover:border-primary"
            >
              <Play className="h-3 w-3" /> {h.label} · {h.items.length} items
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* LEFT: form + items */}
        <div className="space-y-6 min-w-0">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="text-gold">◆</span> Customer Details
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] tracking-widest text-muted-foreground font-semibold">
                  CUSTOMER NAME
                </label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Walk-in Customer"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-[10px] tracking-widest text-muted-foreground font-semibold">
                  MOBILE NUMBER (WHATSAPP)
                </label>
                <Input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Enter 10-digit number"
                  inputMode="tel"
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 flex-row items-center justify-between space-y-0 flex-wrap gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="text-gold">◆</span> Order Items
              </CardTitle>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={clearOrder}>
                  <Trash2 className="h-4 w-4" /> Clear Order
                </Button>
                <Popover open={catalogOpen} onOpenChange={setCatalogOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Package className="h-4 w-4" /> Add to Catalog
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0" align="end">
                    <div className="p-2 flex items-center gap-2 border-b">
                      <Search className="h-4 w-4 text-muted-foreground" />
                      <input
                        autoFocus
                        value={catalogSearch}
                        onChange={(e) => setCatalogSearch(e.target.value)}
                        placeholder="Search catalog items..."
                        className="flex-1 text-sm outline-none bg-transparent"
                      />
                      <button
                        onClick={() => setCatalogOpen(false)}
                        className="text-muted-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="max-h-64 overflow-y-auto p-2">
                      {filteredCatalog.length === 0 ? (
                        <div className="text-center text-sm text-muted-foreground py-6">
                          No items
                        </div>
                      ) : (
                        filteredCatalog.map((p) => (
  <div
    key={p.id}
    className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 py-2 px-2 rounded hover:bg-accent"
  >

    {/* Product Details */}
    <button
      onClick={() => {
        addProductToCart(p.id);
        setCatalogOpen(false);
      }}
      className="min-w-0 text-left"
    >
      <div className="text-sm font-medium truncate">
        {p.name}
      </div>

      <div className="text-xs text-muted-foreground">
        {p.category} · Stock {p.stock}
      </div>
    </button>


    {/* Price */}
    <div className="text-sm font-semibold text-primary whitespace-nowrap">
      {inr(p.price)}
    </div>


    {/* Edit */}
    <button
      onClick={() => editProduct(p.id)}
      className="h-8 w-8 flex items-center justify-center rounded hover:bg-primary/10"
      title="Edit Product"
    >
      <Pencil className="h-4 w-4 text-primary" />
    </button>


    {/* Delete */}
    <button
      onClick={() => deleteProduct(p.id)}
      className="h-8 w-8 flex items-center justify-center rounded hover:bg-destructive/10"
      title="Delete Product"
    >
      <Trash2 className="h-4 w-4 text-destructive" />
    </button>

  </div>
))
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
                <Button size="sm" onClick={addCustomItem} className="bg-primary">
                  <Plus className="h-4 w-4" /> Add Custom Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                  <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  No items yet — add from catalog or create a custom item.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[560px]">
                    <thead>
                      <tr className="text-[10px] tracking-widest text-muted-foreground border-b">
                        <th className="text-left py-2 font-semibold">ITEM NAME / DESCRIPTION</th>
                        <th className="text-right py-2 font-semibold w-28">PRICE (₹)</th>
                        <th className="text-center py-2 font-semibold w-32">QTY</th>
                        <th className="w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it, i) => (
                        <tr key={i} className="border-b last:border-b-0">
                          <td className="py-2 pr-2">
                            <Input
                              value={it.name}
                              onChange={(e) => updateItem(i, { name: e.target.value })}
                              placeholder="Type product description..."
                              className="h-9"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <Input
                              type="number"
                              value={it.price || ""}
                              onChange={(e) =>
                                updateItem(i, { price: Number(e.target.value) || 0 })
                              }
                              className="h-9 text-right"
                              min={0}
                            />
                          </td>
                          <td className="py-2 px-2">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() =>
                                  updateItem(i, { qty: Math.max(1, it.qty - 1) })
                                }
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <Input
                                type="number"
                                value={it.qty}
                                onChange={(e) =>
                                  updateItem(i, { qty: Math.max(1, Number(e.target.value) || 1) })
                                }
                                className="h-8 w-14 text-center px-1"
                                min={1}
                              />
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => updateItem(i, { qty: it.qty + 1 })}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                          <td className="py-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeItem(i)}
                              className="h-8 w-8 text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: order summary */}
        <div className="space-y-4">
          <Card className="lg:sticky lg:top-20">
            <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="text-gold">◆</span> Current Order
              </CardTitle>
              <Badge variant={source === "online" ? "default" : "secondary"} className={source === "online" ? "bg-gold text-gold-foreground" : "bg-primary/10 text-primary border-primary/20"}>
                {source === "online" ? "ONLINE" : "OFFLINE POS"}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="space-y-1 text-xs">
                <SumRow k="SOURCE" v={<Badge variant="outline" className={source === "online" ? "border-gold text-gold" : "border-primary/30 text-primary"}>{source.toUpperCase()}</Badge>} />
                <SumRow k="CUSTOMER" v={customerName || <span className="text-muted-foreground">—</span>} />
                <SumRow k="PHONE" v={customerPhone || <span className="text-muted-foreground">—</span>} />
              </div>

              <div>
                <div className="text-[10px] tracking-widest text-muted-foreground font-semibold mb-1">
                  MANUAL DISCOUNT
                </div>
                <div className="flex gap-2">
                  <Select
                    value={discountType}
                    onValueChange={(v) => setDiscountType(v as "flat" | "percent")}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flat">₹</SelectItem>
                      <SelectItem value="percent">%</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    value={discountValue || ""}
                    onChange={(e) => setDiscountValue(Number(e.target.value) || 0)}
                    className="text-right"
                    placeholder="0"
                  />
                </div>
              </div>

              

              <div className="space-y-1 border-t pt-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal ({items.length} items)</span>
                  <span>{inr(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-success">
                    <span>Discount</span>
                    <span>- {inr(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Delivery</span>
                  <Input
                    type="number"
                    value={delivery || ""}
                    onChange={(e) => setDelivery(Number(e.target.value) || 0)}
                    className="h-8 w-20 text-right"
                    placeholder="0"
                  />
                </div>

                <div className="flex items-center justify-between py-2">
                  <div className="text-xs tracking-widest font-semibold text-muted-foreground">
                    APPLY GST ({settings.gstRate}%)
                  </div>
                  <Switch checked={gstApplied} onCheckedChange={setGstApplied} />
                </div>
                {gstApplied && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">GST</span>
                    <span>{inr(gstAmount)}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-baseline border-t-2 border-gold pt-3">
                <span className="font-serif text-lg text-primary">GRAND TOTAL</span>
                <span className="font-serif text-2xl text-primary">{inr(total)}</span>
              </div>

              <div>
                <div className="text-[10px] tracking-widest text-muted-foreground font-semibold">
                  PAYMENT METHOD
                </div>
                <div className="grid grid-cols-3 gap-1 mt-1">
                  {(["cash", "upi", "card"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setPayment(m)}
                      className={`text-xs py-1.5 rounded border tracking-widest font-semibold uppercase ${
                        payment === m
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-muted-foreground hover:border-primary"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[10px] tracking-widest text-muted-foreground font-semibold">
                  AMOUNT RECEIVED (₹)
                </div>
                <Input
                  type="number"
                  value={amountReceived || ""}
                  onChange={(e) => setAmountReceived(Number(e.target.value) || 0)}
                  placeholder="0.00"
                  className="mt-1"
                />
                {amountReceived > 0 && amountReceived >= total && (
                  <div className="mt-1 text-xs text-success">
                    Change to return: {inr(amountReceived - total)}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={holdCart} className="w-full">
                  <Pause className="h-4 w-4" /> Hold
                </Button>
                <Button onClick={completeSale} className="w-full bg-success text-success-foreground hover:bg-success/90">
                  Complete Sale
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <InvoiceDialog
        order={lastOrder}
        settings={settings}
        open={invoiceOpen}
        onOpenChange={setInvoiceOpen}
      />
    </div>
  );
}

function SumRow({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground tracking-widest text-[10px] font-semibold">{k}</span>
      <span>{v}</span>
    </div>
  );
}
