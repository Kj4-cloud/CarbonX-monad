import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import "./SalesAnalytics.css";

/**
 * SalesAnalytics - Carbon credit sales & revenue analytics dashboard.
 * Shows REAL-TIME KPIs, charts, and revenue breakdowns from the database.
 * No fake/hardcoded data - all stats are computed from actual order_items + sales_transactions.
 */
export default function SalesAnalytics({ data: propData }) {
  const { user, farmerProfile } = useAuth();
  const [orderItems, setOrderItems] = useState([]);
  const [salesTransactions, setSalesTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchAllSalesData = async () => {
      setLoading(true);

      // Fetch from order_items (real marketplace purchases by buyers)
      const { data: itemsData, error: itemsErr } = await supabase
        .from("order_items")
        .select(`
          id,
          quantity,
          price_per_credit,
          credits_purchased,
          order_id,
          created_at,
          farmer_projects ( project_name ),
          orders!inner ( id, buyer_id, total_amount, created_at, status, payment_method )
        `)
        .eq("farmer_id", user.id)
        .order("created_at", { ascending: false });

      if (itemsErr && itemsErr.code !== "PGRST116") {
        console.warn("SalesAnalytics: order_items fetch error", itemsErr.message);
      }

      // Also fetch from sales_transactions (legacy/manual entries)
      const { data: salesData, error: salesErr } = await supabase
        .from("sales_transactions")
        .select("*")
        .eq("farmer_id", user.id)
        .order("transaction_date", { ascending: false });

      if (salesErr && salesErr.code !== "PGRST116") {
        console.warn("SalesAnalytics: sales_transactions fetch error", salesErr.message);
      }

      setOrderItems(itemsData || []);
      setSalesTransactions(salesData || []);
      setLoading(false);
    };

    fetchAllSalesData();
  }, [user]);

  // ─── Compute KPIs from real data ──────────────────────────────────────────

  // Credits generated = farmer's portfolio_credits from profile, or sum of all order credits
  const totalCreditsFromOrders = orderItems.reduce(
    (sum, item) => sum + (item.credits_purchased || item.quantity || 0), 0
  );
  const totalCreditsFromSales = salesTransactions.reduce(
    (sum, t) => sum + (t.credits || 0), 0
  );
  const creditsGenerated = farmerProfile?.portfolio_credits || (totalCreditsFromOrders + totalCreditsFromSales);

  // Credits sold = completed orders only
  const creditsSoldFromOrders = orderItems
    .filter((item) => item.orders?.status === "completed")
    .reduce((sum, item) => sum + (item.credits_purchased || item.quantity || 0), 0);
  const creditsSoldFromSales = salesTransactions
    .filter((t) => t.status === "Completed")
    .reduce((sum, t) => sum + (t.credits || 0), 0);
  const creditsSold = creditsSoldFromOrders + creditsSoldFromSales;

  // Total revenue
  const revenueFromOrders = orderItems.reduce(
    (sum, item) => sum + ((item.quantity || 0) * (Number(item.price_per_credit) || 0)), 0
  );
  const revenueFromSales = salesTransactions.reduce(
    (sum, t) => sum + (Number(t.amount) || 0), 0
  );
  const totalRevenue = farmerProfile?.total_revenue
    ? Number(farmerProfile.total_revenue)
    : revenueFromOrders + revenueFromSales;

  // ─── Compute month-over-month % change ────────────────────────────────────
  const computeChange = (currentMonth, previousMonth) => {
    if (previousMonth === 0 && currentMonth === 0) return "0%";
    if (previousMonth === 0) return currentMonth > 0 ? "+100%" : "0%";
    const pct = ((currentMonth - previousMonth) / previousMonth) * 100;
    return (pct >= 0 ? "+" : "") + pct.toFixed(1) + "%";
  };

  // Build per-month revenue from real data
  const now = new Date();
  const buildMonthlyData = () => {
    // Last 8 months (including current)
    const months = [];
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        label: d.toLocaleString("en-US", { month: "short" }),
        amount: 0,
      });
    }

    // Accumulate from order_items
    orderItems.forEach((item) => {
      const date = new Date(item.created_at || item.orders?.created_at);
      if (isNaN(date.getTime())) return;
      const itemRevenue = (item.quantity || 0) * (Number(item.price_per_credit) || 0);
      const slot = months.find(
        (m) => m.year === date.getFullYear() && m.month === date.getMonth()
      );
      if (slot) slot.amount += itemRevenue;
    });

    // Accumulate from sales_transactions
    salesTransactions.forEach((t) => {
      const date = new Date(t.transaction_date || t.created_at);
      if (isNaN(date.getTime())) return;
      const slot = months.find(
        (m) => m.year === date.getFullYear() && m.month === date.getMonth()
      );
      if (slot) slot.amount += Number(t.amount) || 0;
    });

    return months.map((m) => ({ month: m.label, amount: Math.round(m.amount) }));
  };

  const revenueBreakdown = buildMonthlyData();

  // Compute percentage changes (current month vs previous month revenue)
  const currentMonthRev = revenueBreakdown[revenueBreakdown.length - 1]?.amount || 0;
  const prevMonthRev = revenueBreakdown[revenueBreakdown.length - 2]?.amount || 0;
  const revenueChange = computeChange(currentMonthRev, prevMonthRev);

  // ─── Build KPI cards ──────────────────────────────────────────────────────
  const kpis = [
    {
      label: "Credits Generated",
      value: creditsGenerated.toLocaleString(),
      unit: "CRD",
      change: creditsGenerated > 0 ? `+${creditsGenerated}` : "0",
      color: "var(--primary)",
    },
    {
      label: "Credits Sold",
      value: creditsSold.toLocaleString(),
      unit: "CRD",
      change: creditsSold > 0 ? `${((creditsSold / Math.max(creditsGenerated, 1)) * 100).toFixed(0)}% sold` : "0",
      color: "var(--primary)",
    },
    {
      label: "Total Revenue",
      value: "₹" + totalRevenue.toLocaleString(),
      unit: "INR",
      change: revenueChange,
      color: "var(--primary)",
    },
  ];

  // ─── Build recent transactions from real data ─────────────────────────────
  const recentTransactions = [];

  // Add order_items (marketplace transactions)
  orderItems.slice(0, 10).forEach((item) => {
    recentTransactions.push({
      buyer: item.farmer_projects?.project_name || "Carbon Credit Sale",
      credits: item.credits_purchased || item.quantity,
      amount: "₹" + ((item.quantity || 0) * (Number(item.price_per_credit) || 0)).toLocaleString(),
      date: new Date(item.created_at || item.orders?.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      status: item.orders?.status === "completed" ? "Completed" : "Pending",
      source: "marketplace",
      sortDate: new Date(item.created_at || item.orders?.created_at),
    });
  });

  // Add sales_transactions (legacy)
  salesTransactions.slice(0, 10).forEach((t) => {
    recentTransactions.push({
      buyer: t.buyer_name,
      credits: t.credits,
      amount: "₹" + Number(t.amount).toLocaleString(),
      date: new Date(t.transaction_date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      status: t.status,
      source: "direct",
      sortDate: new Date(t.transaction_date),
    });
  });

  // Sort by date descending, take top 5
  recentTransactions.sort((a, b) => b.sortDate - a.sortDate);
  const displayTransactions = recentTransactions.slice(0, 5);

  // ─── Final data object ────────────────────────────────────────────────────
  const data = {
    kpis,
    revenueBreakdown,
    recentTransactions: displayTransactions,
    ...propData,
  };

  const maxBar = Math.max(...data.revenueBreakdown.map((d) => d.amount), 1);

  if (loading) {
    return (
      <main className="sa-main">
        <div className="sa-header">
          <div>
            <h1 className="sa-title">Sales & Revenue Analytics</h1>
            <p className="sa-subtitle">Loading your real-time data…</p>
          </div>
        </div>
        <div className="sa-loading">
          <span className="material-symbols-outlined sa-loading-icon">
            progress_activity
          </span>
          <p>Fetching sales data…</p>
        </div>
      </main>
    );
  }

  const hasAnyData = orderItems.length > 0 || salesTransactions.length > 0 || creditsGenerated > 0;

  return (
    <main className="sa-main">
      <div className="sa-header">
        <div>
          <h1 className="sa-title">Sales & Revenue Analytics</h1>
          <p className="sa-subtitle">
            {hasAnyData
              ? "Live data from your carbon credit sales and marketplace activity."
              : "Your real-time analytics will appear here once you make your first sale."}
          </p>
        </div>
        {hasAnyData && (
          <span className="sa-live-badge">
            <span className="sa-live-dot" />
            Live
          </span>
        )}
      </div>

      {/* KPI Cards */}
      <div className="sa-kpis animate-fade-in">
        {data.kpis.map((kpi, i) => (
          <div
            key={i}
            className="sa-kpi-card"
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <span className="sa-kpi-label">{kpi.label}</span>
            <div className="sa-kpi-value-row">
              <span className="sa-kpi-value">{kpi.value}</span>
            </div>
            <span className="sa-kpi-unit">{kpi.unit}</span>
            <span className="sa-kpi-change" style={{ color: kpi.color }}>
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "0.875rem" }}
              >
                trending_up
              </span>
              {kpi.change}
            </span>
          </div>
        ))}
      </div>

      {/* Revenue Chart */}
      <section
        className="sa-chart-card animate-fade-in"
        style={{ animationDelay: "0.2s" }}
      >
        <h3 className="sa-chart-title">Monthly Revenue</h3>
        <div className="sa-chart">
          {data.revenueBreakdown.map((item, i) => (
            <div key={i} className="sa-chart-bar-group">
              <div className="sa-chart-bar-container">
                <div
                  className="sa-chart-bar"
                  style={{
                    height: item.amount > 0 ? `${(item.amount / maxBar) * 100}%` : "3px",
                    background:
                      item.amount > 0
                        ? i >= data.revenueBreakdown.length - 2
                          ? "var(--primary)"
                          : "var(--slate-200)"
                        : "var(--slate-100)",
                    animationDelay: `${i * 0.05 + 0.3}s`,
                    minHeight: item.amount > 0 ? "8px" : "3px",
                  }}
                  title={`₹${item.amount.toLocaleString()}`}
                />
              </div>
              <span className="sa-chart-label">{item.month}</span>
              {item.amount > 0 && (
                <span className="sa-chart-amount">₹{item.amount.toLocaleString()}</span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Recent Transactions */}
      <section
        className="sa-transactions-card animate-fade-in"
        style={{ animationDelay: "0.3s" }}
      >
        <div className="sa-transactions-header">
          <h3 className="sa-chart-title">Recent Transactions</h3>
          {displayTransactions.length > 0 && (
            <button className="sa-view-all-btn">View All</button>
          )}
        </div>
        <div className="sa-table-wrap">
          {displayTransactions.length === 0 ? (
            <div className="sa-empty-state">
              <span className="material-symbols-outlined sa-empty-icon">
                receipt_long
              </span>
              <p className="sa-empty-text">No transactions yet</p>
              <p className="sa-empty-subtext">
                Your sales will appear here once buyers purchase your carbon credits.
              </p>
            </div>
          ) : (
            <table className="sa-table">
              <thead>
                <tr>
                  <th>Buyer / Project</th>
                  <th>Credits</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {displayTransactions.map((tx, i) => (
                  <tr key={i}>
                    <td className="sa-table-buyer">
                      {tx.buyer}
                      {tx.source === "marketplace" && (
                        <span className="sa-source-badge">Marketplace</span>
                      )}
                    </td>
                    <td>{tx.credits}</td>
                    <td className="sa-table-amount">{tx.amount}</td>
                    <td className="sa-table-date">{tx.date}</td>
                    <td>
                      <span
                        className={`badge ${tx.status === "Completed" ? "badge-green" : "badge-orange"}`}
                      >
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </main>
  );
}
