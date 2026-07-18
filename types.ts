export type Role = "owner" | "staff";

export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  sku?: string;
};

export type Coupon = {
  code: string;
  type: "percent" | "flat";
  value: number;
  active: boolean;
};

export type OrderItem = {
  productId?: string;
  name: string;
  price: number;
  qty: number;
};

export type PaymentMethod = "cash" | "upi" | "card" | "other";
export type OrderSource = "offline" | "online";
export type OrderStatus = "completed" | "held" | "refunded";

export type Order = {
  id: string;
  invoiceNo: string;
  createdAt: string; // ISO
  customer: { name: string; phone: string };
  items: OrderItem[];
  subtotal: number;
  discount: number;
  couponCode?: string;
  delivery: number;
  gstApplied: boolean;
  gstRate: number;
  gstAmount: number;
  total: number;
  amountReceived: number;
  source: OrderSource;
  payment: PaymentMethod;
  status: OrderStatus;
  notes?: string;
};

export type Settings = {
  shopName: string;
  tagline: string;
  address: string;
  phone: string;
  gstin: string;
  gstRate: number;
  ownerPasscode: string;
  staffPasscode: string;
  invoicePrefix: string;
  lowStockThreshold: number;
};
