/**
 * SalesIQ Isolated Demo Dataset
 * ==============================
 * Strictly isolated sample data for the public SaaS landing page.
 * Zero connections or writes to production Firebase Firestore collections.
 */

export interface MetricCardData {
  label: string;
  value: string;
  change: string;
  isPositive: boolean;
  subtext: string;
}

export interface ChartDataPoint {
  time: string;
  revenue: number;
  orders: number;
  prevRevenue?: number;
}

export interface DemoTransaction {
  id: string;
  product: string;
  category: string;
  customer: string;
  cashier: string;
  amount: number;
  paymentMethod: "UPI" | "Card" | "Cash";
  timestamp: string;
  status: "Completed" | "Processing";
}

export interface InventoryAlertItem {
  name: string;
  category: string;
  stock: number;
  minStock: number;
  dailyVelocity: number;
  runwayDays: number;
  suggestedReorder: number;
  status: "Critical" | "Reorder Soon" | "Low Stock";
}

export interface AICopilotPrompt {
  id: string;
  question: string;
  tag: string;
  answer: {
    summary: string;
    metrics: { label: string; value: string; badge?: string }[];
    bullets: string[];
    recommendation: string;
  };
}

export const DEMO_RANGES = ["Today", "7 Days", "30 Days"] as const;
export type DemoRange = (typeof DEMO_RANGES)[number];

export const DEMO_METRICS: Record<DemoRange, MetricCardData[]> = {
  Today: [
    {
      label: "Today's Gross Sales",
      value: "₹48,250",
      change: "+14.2%",
      isPositive: true,
      subtext: "vs. yesterday (₹42,240)",
    },
    {
      label: "Total Transactions",
      value: "142",
      change: "+8.5%",
      isPositive: true,
      subtext: "Avg. ticket: ₹339.78",
    },
    {
      label: "Critical Stock Alerts",
      value: "3 items",
      change: "Action needed",
      isPositive: false,
      subtext: "Runway < 4 days",
    },
    {
      label: "Active Catalog SKUs",
      value: "248",
      change: "100% Synced",
      isPositive: true,
      subtext: "6 departments",
    },
  ],
  "7 Days": [
    {
      label: "7-Day Gross Revenue",
      value: "₹3,42,800",
      change: "+18.6%",
      isPositive: true,
      subtext: "vs. prior week (₹2,89,100)",
    },
    {
      label: "7-Day Transactions",
      value: "1,048",
      change: "+12.1%",
      isPositive: true,
      subtext: "Peak: Saturday (214)",
    },
    {
      label: "Restocked Batches",
      value: "18 batches",
      change: "Fulfilled",
      isPositive: true,
      subtext: "4 vendors active",
    },
    {
      label: "Gross Profit Margin",
      value: "34.8%",
      change: "+2.4%",
      isPositive: true,
      subtext: "Net ₹1,19,294",
    },
  ],
  "30 Days": [
    {
      label: "Monthly Net Revenue",
      value: "₹14,86,500",
      change: "+22.4%",
      isPositive: true,
      subtext: "Monthly goal exceeded (106%)",
    },
    {
      label: "Monthly Transactions",
      value: "4,320",
      change: "+15.8%",
      isPositive: true,
      subtext: "Avg. ₹344.10",
    },
    {
      label: "Predicted Stockouts Saved",
      value: "26 items",
      change: "AI Assisted",
      isPositive: true,
      subtext: "Zero out-of-stock incidents",
    },
    {
      label: "Repeat Customer Rate",
      value: "64.2%",
      change: "+5.1%",
      isPositive: true,
      subtext: "CRM tracked",
    },
  ],
};

export const DEMO_CHARTS: Record<DemoRange, ChartDataPoint[]> = {
  Today: [
    { time: "09:00", revenue: 2400, orders: 8 },
    { time: "11:00", revenue: 7800, orders: 24 },
    { time: "13:00", revenue: 14200, orders: 42 },
    { time: "15:00", revenue: 21500, orders: 63 },
    { time: "17:00", revenue: 31200, orders: 94 },
    { time: "19:00", revenue: 41900, orders: 126 },
    { time: "21:00", revenue: 48250, orders: 142 },
  ],
  "7 Days": [
    { time: "Mon", revenue: 38200, orders: 118 },
    { time: "Tue", revenue: 42400, orders: 132 },
    { time: "Wed", revenue: 46100, orders: 140 },
    { time: "Thu", revenue: 49800, orders: 152 },
    { time: "Fri", revenue: 56300, orders: 172 },
    { time: "Sat", revenue: 62400, orders: 198 },
    { time: "Sun", revenue: 47600, orders: 136 },
  ],
  "30 Days": [
    { time: "Week 1", revenue: 310000, orders: 940 },
    { time: "Week 2", revenue: 355000, orders: 1060 },
    { time: "Week 3", revenue: 392000, orders: 1140 },
    { time: "Week 4", revenue: 429500, orders: 1180 },
  ],
};

export const DEMO_TRANSACTIONS: DemoTransaction[] = [
  {
    id: "INV-2026-0842",
    product: "Organic Himalayan Honey (1kg)",
    category: "Grocery & Gourmet",
    customer: "Aditi Rao",
    cashier: "Rohan V. (Staff)",
    amount: 850,
    paymentMethod: "UPI",
    timestamp: "2 mins ago",
    status: "Completed",
  },
  {
    id: "INV-2026-0841",
    product: "Premium Basmati Rice (5kg)",
    category: "Grains & Staples",
    customer: "Rajesh Sharma",
    cashier: "Admin Counter",
    amount: 490,
    paymentMethod: "Cash",
    timestamp: "7 mins ago",
    status: "Completed",
  },
  {
    id: "INV-2026-0840",
    product: "Wireless ANC Earbuds v2",
    category: "Consumer Electronics",
    customer: "Vikram Mehta",
    cashier: "Rohan V. (Staff)",
    amount: 2999,
    paymentMethod: "Card",
    timestamp: "14 mins ago",
    status: "Completed",
  },
  {
    id: "INV-2026-0839",
    product: "Cold-Pressed Extra Virgin Olive Oil (500ml)",
    category: "Grocery & Gourmet",
    customer: "Priya Nair",
    cashier: "Rohan V. (Staff)",
    amount: 620,
    paymentMethod: "UPI",
    timestamp: "21 mins ago",
    status: "Completed",
  },
  {
    id: "INV-2026-0838",
    product: "Dark Roast Arabica Whole Beans (250g)",
    category: "Beverages",
    customer: "Kabir Singh",
    cashier: "Admin Counter",
    amount: 380,
    paymentMethod: "Cash",
    timestamp: "33 mins ago",
    status: "Completed",
  },
];

export const DEMO_INVENTORY_ALERTS: InventoryAlertItem[] = [
  {
    name: "Premium Basmati Rice (5kg)",
    category: "Grains & Staples",
    stock: 4,
    minStock: 15,
    dailyVelocity: 1.9,
    runwayDays: 2.1,
    suggestedReorder: 60,
    status: "Critical",
  },
  {
    name: "Cold-Pressed Extra Virgin Olive Oil (500ml)",
    category: "Grocery & Gourmet",
    stock: 7,
    minStock: 20,
    dailyVelocity: 2.1,
    runwayDays: 3.3,
    suggestedReorder: 45,
    status: "Reorder Soon",
  },
  {
    name: "Dark Chocolate Chips (400g)",
    category: "Bakery Supplies",
    stock: 9,
    minStock: 18,
    dailyVelocity: 1.5,
    runwayDays: 6.0,
    suggestedReorder: 35,
    status: "Low Stock",
  },
  {
    name: "Organic Raw Almonds (500g)",
    category: "Dry Fruits & Nuts",
    stock: 12,
    minStock: 25,
    dailyVelocity: 1.8,
    runwayDays: 6.6,
    suggestedReorder: 40,
    status: "Low Stock",
  },
];

export const DEMO_COPILOT_PROMPTS: AICopilotPrompt[] = [
  {
    id: "prompt-1",
    question: "Which products had the highest margins this week?",
    tag: "Profit Optimization",
    answer: {
      summary:
        "Analysis of 1,048 transactions reveals that Gourmet & Specialty Electronics yielded the strongest net margins:",
      metrics: [
        { label: "Wireless ANC Earbuds", value: "48.2% margin", badge: "Top Margin" },
        { label: "Organic Himalayan Honey", value: "42.5% margin", badge: "Fast Mover" },
        { label: "Dark Roast Arabica", value: "39.1% margin", badge: "Stable" },
      ],
      bullets: [
        "Electronics contributed ₹89,970 in gross revenue with an aggregate net margin of 44.8%.",
        "Beverage margins expanded by 3.2% after switching to direct farm procurement from Karnataka roasters.",
        "Bulk staples (Rice & Flour) maintain 14.5% margins but drive 62% of physical foot traffic.",
      ],
      recommendation:
        "Strategic recommendation: Position premium condiments and coffee beans alongside staple billing counters to increase average basket size by an estimated 11%.",
    },
  },
  {
    id: "prompt-2",
    question: "Which products may run out of stock before Friday?",
    tag: "Stockout Prevention",
    answer: {
      summary:
        "Predictive velocity algorithms have detected 2 SKUs with critical stockout runways under 72 hours:",
      metrics: [
        { label: "Basmati Rice 5kg", value: "2.1 days runway", badge: "Critical" },
        { label: "Cold-Pressed Olive Oil", value: "3.3 days runway", badge: "Reorder Soon" },
        { label: "Dark Chocolate 400g", value: "6.0 days runway", badge: "Healthy" },
      ],
      bullets: [
        "Basmati Rice has experienced an unexpected 28% velocity surge ahead of the upcoming festival weekend.",
        "Supplier 'Apex Agro Distributors' has a documented 36-hour lead time; PO requisition is urgently recommended today.",
        "Recommended PO quantity: 60 units of Basmati Rice to cover the next 30-day velocity envelope.",
      ],
      recommendation:
        "Action required: Create inward purchase voucher in Admin > Purchases before 14:00 today to ensure Friday morning dock delivery.",
    },
  },
  {
    id: "prompt-3",
    question: "Compare beverage sales with snack sales.",
    tag: "Category Analysis",
    answer: {
      summary:
        "Comparative category performance for the last 30-day rolling cycle:",
      metrics: [
        { label: "Beverages Revenue", value: "₹2,84,200", badge: "+19.4% MoM" },
        { label: "Snacks & Confectionery", value: "₹2,18,600", badge: "+8.2% MoM" },
        { label: "Cross-Purchase Rate", value: "41.6% baskets", badge: "High Synergy" },
      ],
      bullets: [
        "Beverage sales were driven primarily by artisanal whole bean coffee and cold-pressed botanical sodas.",
        "41.6% of all carts containing a beverage item also included at least one snack item.",
        "Evening peak (17:00 – 20:30) accounts for 58% of all snack and beverage combined receipts.",
      ],
      recommendation:
        "Merchandising strategy: Bundle evening tea/coffee combos with organic biscuits at a 5% discount to capitalize on high cross-purchase affinity.",
    },
  },
];

export const DEMO_INDUSTRIES = [
  {
    title: "Supermarkets & Grocery",
    subtitle: "High-volume perishables & staples",
    description:
      "Rapid barcode checkout, batch tracking, automated low-stock warnings, and FMCG reorder algorithms tailored for fast-moving retail aisles.",
    icon: "ShoppingBag",
    badge: "Fast Checkout",
  },
  {
    title: "Consumer Electronics & Mobile",
    subtitle: "High-ticket devices & accessories",
    description:
      "Serial and SKU tracking, detailed customer warranty records, margin protection rules, and accessories cross-selling insights.",
    icon: "Smartphone",
    badge: "Serial & SKU",
  },
  {
    title: "Fashion & Apparel Chains",
    subtitle: "Multi-size & seasonal styles",
    description:
      "Size and color variants, seasonal demand curve forecasting, dead-stock detection, and multi-counter cashier performance.",
    icon: "Shirt",
    badge: "Variant Matrix",
  },
  {
    title: "Pharmacy & Healthcare",
    subtitle: "Compliance & batch-level control",
    description:
      "Expiry date monitoring, batch-wise inward vouchers, doctor/patient contact directories, and rapid medicine lookup.",
    icon: "Cross",
    badge: "Batch & Expiry",
  },
  {
    title: "Wholesale & Stockists",
    subtitle: "B2B bulk orders & suppliers",
    description:
      "Wholesale pricing tiers, supplier procurement histories, multi-currency conversion, and exportable bulk tax invoices.",
    icon: "Truck",
    badge: "B2B Volume",
  },
  {
    title: "Multi-Staff Retail Counters",
    subtitle: "Strict shift & role governance",
    description:
      "Complete role-based isolation (RBAC) ensuring front-line cashiers can bill fast while sensitive margins and cost rates stay restricted.",
    icon: "Users",
    badge: "Role Isolation",
  },
];
