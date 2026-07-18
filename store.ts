import { useEffect, useState, useSyncExternalStore } from "react";
import type { Coupon, Order, Product, Settings } from "./types";

const KEYS = {
  products: "aarika.products",
  orders: "aarika.orders",
  coupons: "aarika.coupons",
  settings: "aarika.settings",
  held: "aarika.heldCarts",
} as const;

const DEFAULT_SETTINGS: Settings = {
  shopName: "Aarika Looms",
  tagline: "Style in Every Thread",
  address: "Kurinji Nagar, Brindhavan Circle, Kuniyamuthur, Coimbatore",
  phone: "+91 93424 89391",
  gstin: "",
  gstRate: 5,
  ownerPasscode: "1234",
  staffPasscode: "0000",
  invoicePrefix: "INV",
  lowStockThreshold: 5,
};

const DEFAULT_PRODUCTS: Product[] = [
  { id: "p1", name: "Kanjivaram Silk Saree", category: "Sarees", price: 12500, stock: 8 },
  { id: "p2", name: "Bridal Shawl", category: "Shawls", price: 3200, stock: 12 },
  { id: "p3", name: "Chanderi Cotton Saree", category: "Sarees", price: 2800, stock: 20 },
  { id: "p4", name: "Banarasi Dupatta", category: "Dupattas", price: 1650, stock: 15 },
  { id: "p5", name: "Pashmina Shawl", category: "Shawls", price: 4500, stock: 4 },
  { id: "p6", name: "Farshi Palazzo Set", category: "Tops", price: 1899, stock: 22 },
  { id: "p7", name: "Saree Shawl (Blended)", category: "Shawls", price: 899, stock: 3 },
  { id: "p8", name: "Handloom Silk Blouse", category: "Blouses", price: 1250, stock: 18 },
  { id: "p9", name: "Zari Border Saree", category: "Sarees", price: 5600, stock: 10 },
  { id: "p10", name: "Cotton Kurta", category: "Tops", price: 799, stock: 30 },
];

const DEFAULT_COUPONS: Coupon[] = [
  { code: "WELCOME10", type: "percent", value: 10, active: true },
  { code: "FLAT200", type: "flat", value: 200, active: true },
  { code: "DIWALI25", type: "percent", value: 25, active: true },
];

function seedDemoOrders(products: Product[], settings: Settings): Order[] {
  const now = Date.now();
  const day = 24 * 3600 * 1000;
  const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
  const pick = <T,>(arr: T[]) => arr[rand(0, arr.length - 1)];
  const names = ["Sanjana", "Priya", "Meera", "Kavya", "Anitha", "Deepa", "Lakshmi", "Rohit", "Anu"];
  const orders: Order[] = [];
  for (let i = 0; i < 28; i++) {
    const daysAgo = rand(0, 60);
    const iso = new Date(now - daysAgo * day - rand(0, 20) * 3600 * 1000).toISOString();
    const itemCount = rand(1, 3);
    const items = Array.from({ length: itemCount }).map(() => {
      const p = pick(products);
      return { productId: p.id, name: p.name, price: p.price, qty: rand(1, 2) };
    });
    const subtotal = items.reduce((s, it) => s + it.price * it.qty, 0);
    const discount = rand(0, 1) ? rand(0, Math.floor(subtotal * 0.1)) : 0;
    const delivery = 0;
    const gstApplied = Math.random() < 0.3;
    const gstAmount = gstApplied ? Math.round((subtotal - discount) * (settings.gstRate / 100)) : 0;
    const total = subtotal - discount + delivery + gstAmount;
    const source = Math.random() < 0.15 ? "online" : "offline";
    orders.push({
      id: crypto.randomUUID(),
      invoiceNo: makeInvoiceNo(settings.invoicePrefix, i),
      createdAt: iso,
      customer: { name: pick(names), phone: "9" + rand(100000000, 999999999) },
      items,
      subtotal,
      discount,
      delivery,
      gstApplied,
      gstRate: settings.gstRate,
      gstAmount,
      total,
      amountReceived: total,
      source,
      payment: pick(["cash", "upi", "card"] as const),
      status: "completed",
    });
  }
  return orders.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function makeInvoiceNo(prefix: string, seed?: number): string {
  const year = new Date().getFullYear();
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  const s = seed !== undefined ? seed.toString(36).toUpperCase().padStart(3, "0") : rand;
  return `${prefix}-${year}-${s.slice(0, 5).padEnd(5, "X")}`;
}

// ---- Reactive localStorage store (single source, useSyncExternalStore) ----

type State = {
  products: Product[];
  orders: Order[];
  coupons: Coupon[];
  settings: Settings;
};

const listeners = new Set<() => void>();
let state: State | null = null;

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

function ensureInit(): State {
  if (state) return state;
  const settings = read<Settings>(KEYS.settings, DEFAULT_SETTINGS);
  const products = read<Product[]>(KEYS.products, DEFAULT_PRODUCTS);
  const coupons = read<Coupon[]>(KEYS.coupons, DEFAULT_COUPONS);
  let orders = read<Order[] | null>(KEYS.orders, null) as Order[] | null;
  if (!localStorage.getItem(KEYS.settings)) write(KEYS.settings, settings);
  if (!localStorage.getItem(KEYS.products)) write(KEYS.products, products);
  if (!localStorage.getItem(KEYS.coupons)) write(KEYS.coupons, coupons);
  if (orders === null) {
    orders = seedDemoOrders(products, settings);
    write(KEYS.orders, orders);
  }
  state = { products, orders, coupons, settings };
  return state;
}

function emit() {
  listeners.forEach((l) => l());
}

export function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function getState(): State {
  return ensureInit();
}

const serverSnap: State = {
  products: [],
  orders: [],
  coupons: [],
  settings: DEFAULT_SETTINGS,
};

export function useStore(): State {
  return useSyncExternalStore(
    subscribe,
    () => ensureInit(),
    () => serverSnap,
  );
}

// Only render on client to avoid SSR/hydration mismatch on localStorage-driven UI.
export function useHydrated() {
  const [h, setH] = useState(false);
  useEffect(() => setH(true), []);
  return h;
}

export const store = {
  setProducts(next: Product[]) {
    const s = ensureInit();
    s.products = next;
    write(KEYS.products, next);
    emit();
  },
  setOrders(next: Order[]) {
    const s = ensureInit();
    s.orders = next;
    write(KEYS.orders, next);
    emit();
  },
  addOrder(o: Order) {
    const s = ensureInit();
    const next = [o, ...s.orders];
    s.orders = next;
    write(KEYS.orders, next);
    // decrement stock for known products
    const map = new Map(s.products.map((p) => [p.id, { ...p }]));
    o.items.forEach((it) => {
      if (it.productId && map.has(it.productId)) {
        const p = map.get(it.productId)!;
        p.stock = Math.max(0, p.stock - it.qty);
        map.set(it.productId, p);
      }
    });
    s.products = Array.from(map.values());
    write(KEYS.products, s.products);
    emit();
  },
  setCoupons(next: Coupon[]) {
    const s = ensureInit();
    s.coupons = next;
    write(KEYS.coupons, next);
    emit();
  },
  setSettings(next: Settings) {
    const s = ensureInit();
    s.settings = next;
    write(KEYS.settings, next);
    emit();
  },
  reset() {
    Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
    state = null;
    emit();
  },
};

// Held carts (in-memory + localStorage)
export type HeldCart = {
  id: string;
  createdAt: string;
  label: string;
  items: import("./types").OrderItem[];
  customer: { name: string; phone: string };
};

export function readHeld(): HeldCart[] {
  return read<HeldCart[]>(KEYS.held, []);
}
export function writeHeld(next: HeldCart[]) {
  write(KEYS.held, next);
  emit();
}
