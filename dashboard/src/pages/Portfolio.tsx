import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { getPortfolio, getPortfolioPerformance, executeTrade } from "../api.js";
import {
  C,
  Card,
  SectionTitle,
  EmptyState,
  ErrorBanner,
  SkeletonBlock,
  useBeginnerMode,
  TH,
  TD,
} from "../context.js";

interface Holding {
  instrument: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPct: number;
  weight?: number;
}

interface Trade {
  id: string;
  date: string;
  instrument: string;
  action: string;
  quantity: number;
  price: number;
}

interface PortfolioData {
  initialCapital: number;
  currentValue: number;
  totalReturn: number;
  totalReturnUSD?: number;
  holdings: Holding[];
  trades: Trade[];
}

interface PerfPoint {
  date: string;
  portfolioValue: number;
  spyValue?: number;
}

function fmt(n: number, decimals = 2): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtUSD(n: number): string {
  return "$" + fmt(n);
}

function StatCard({ label, value, color, sub }: { label: string; value: string; color?: string; sub?: string }) {
  return (
    <Card style={{ padding: "16px 20px" }}>
      <div style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ color: color ?? C.textPrimary, fontSize: 24, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
        {value}
      </div>
      {sub && <div style={{ color: C.textMuted, fontSize: 12, marginTop: 4 }}>{sub}</div>}
    </Card>
  );
}

function CreatePortfolio({ onCreated }: { onCreated: () => void }) {
  const [capital, setCapital] = useState("10000");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(capital);
    if (isNaN(amt) || amt <= 0) { setError("Enter a valid amount"); return; }
    setCreating(true);
    setError(null);
    try {
      await executeTrade("CASH", "DEPOSIT", amt);
      onCreated();
    } catch (e) {
      setError(String(e));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 20px" }}>
      <div style={{ fontSize: 48, marginBottom: 20 }}>💼</div>
      <h2 style={{ color: C.textPrimary, fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
        Create Paper Portfolio
      </h2>
      <p style={{ color: C.textMuted, fontSize: 14, marginBottom: 32, textAlign: "center", maxWidth: 400 }}>
        Start with virtual capital to practice trading without risking real money.
      </p>
      <Card style={{ width: "100%", maxWidth: 380 }}>
        <form onSubmit={handleCreate}>
          <div style={{ marginBottom: 16 }}>
            <label
              style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}
            >
              Initial Capital (USD)
            </label>
            <input
              type="number"
              value={capital}
              onChange={(e) => setCapital(e.target.value)}
              min="100"
              step="100"
              style={{
                width: "100%",
                background: C.bg,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                padding: "10px 14px",
                color: C.textPrimary,
                fontSize: 16,
                outline: "none",
                fontVariantNumeric: "tabular-nums",
              }}
            />
          </div>
          {error && (
            <div style={{ color: C.red, fontSize: 12, marginBottom: 12 }}>{error}</div>
          )}
          <button
            type="submit"
            disabled={creating}
            style={{
              width: "100%",
              background: creating ? "#334155" : C.blue,
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "11px",
              fontSize: 14,
              fontWeight: 600,
              cursor: creating ? "not-allowed" : "pointer",
              transition: "background 0.15s",
            }}
          >
            {creating ? "Creating..." : "Create Portfolio"}
          </button>
        </form>
      </Card>
    </div>
  );
}

function TradeForm({ onTraded }: { onTraded: () => void }) {
  const [instrument, setInstrument] = useState("");
  const [action, setAction] = useState("BUY");
  const [qty, setQty] = useState("");
  const [status, setStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = parseFloat(qty);
    if (!instrument || isNaN(q) || q <= 0) { setStatus({ type: "error", msg: "Invalid instrument or quantity" }); return; }
    setLoading(true);
    setStatus(null);
    try {
      const res = await executeTrade(instrument.toUpperCase(), action, q);
      setStatus({ type: "success", msg: res?.message ?? `${action} ${q} ${instrument.toUpperCase()} executed` });
      setInstrument("");
      setQty("");
      onTraded();
    } catch (err) {
      setStatus({ type: "error", msg: String(err) });
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    background: C.bg,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    padding: "9px 12px",
    color: C.textPrimary,
    fontSize: 13,
    outline: "none",
  };

  return (
    <Card>
      <div style={{ color: C.textMuted, fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
        Quick Trade
      </div>
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <label style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Instrument
          </label>
          <input
            type="text"
            value={instrument}
            onChange={(e) => setInstrument(e.target.value)}
            placeholder="e.g. AAPL"
            required
            style={{ ...inputStyle, width: 130 }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <label style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Action
          </label>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            style={{ ...inputStyle, width: 100 }}
          >
            <option value="BUY">BUY</option>
            <option value="SELL">SELL</option>
            <option value="SHORT">SHORT</option>
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <label style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Quantity
          </label>
          <input
            type="number"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder="100"
            min="1"
            step="1"
            required
            style={{ ...inputStyle, width: 100 }}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{
            background: loading ? "#334155" : C.blue,
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "9px 20px",
            fontSize: 13,
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            transition: "background 0.15s",
          }}
        >
          {loading ? "Executing..." : "Execute"}
        </button>
      </form>
      {status && (
        <div
          style={{
            marginTop: 12,
            padding: "9px 14px",
            borderRadius: 8,
            background: status.type === "success" ? `${C.green}1a` : `${C.red}1a`,
            border: `1px solid ${status.type === "success" ? C.green + "44" : C.red + "44"}`,
            color: status.type === "success" ? C.green : "#fca5a5",
            fontSize: 13,
          }}
        >
          {status.msg}
        </div>
      )}
    </Card>
  );
}

export function Portfolio() {
  const { beginnerMode } = useBeginnerMode();
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [performance, setPerformance] = useState<PerfPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noPortfolio, setNoPortfolio] = useState(false);

  async function load() {
    try {
      const [port, perf] = await Promise.all([
        getPortfolio(),
        getPortfolioPerformance().catch(() => []),
      ]);
      if (!port || port.initialCapital == null) {
        setNoPortfolio(true);
      } else {
        setPortfolio(port);
        setNoPortfolio(false);
      }
      setPerformance(Array.isArray(perf) ? perf : []);
      setError(null);
    } catch {
      setNoPortfolio(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, []);

  const returnColor = portfolio && portfolio.totalReturn >= 0 ? C.green : C.red;

  const perfChartData = performance.map((p) => ({
    date: new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    Portfolio: Number(p.portfolioValue),
    "S&P 500": p.spyValue != null ? Number(p.spyValue) : undefined,
  }));

  if (loading) {
    return (
      <div style={{ padding: 28 }}>
        <SkeletonBlock height={40} />
        <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          <SkeletonBlock height={100} />
          <SkeletonBlock height={100} />
          <SkeletonBlock height={100} />
        </div>
      </div>
    );
  }

  if (noPortfolio) {
    return (
      <div style={{ padding: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: C.textPrimary, marginBottom: 28 }}>Portfolio</h1>
        <CreatePortfolio onCreated={load} />
      </div>
    );
  }

  return (
    <div style={{ padding: 28 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: C.textPrimary, margin: 0 }}>Portfolio</h1>
        <p style={{ color: C.textMuted, marginTop: 5, fontSize: 13 }}>Paper trading tracker</p>
      </div>

      {error && <ErrorBanner message={error} onRetry={load} />}

      {portfolio && (
        <>
          {/* Summary */}
          <div style={{ marginBottom: 28 }}>
            <SectionTitle>Overview</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
              <StatCard
                label="Initial Capital"
                value={fmtUSD(portfolio.initialCapital)}
                color={C.textSecondary}
              />
              <StatCard
                label="Current Value"
                value={fmtUSD(portfolio.currentValue)}
                color={C.textPrimary}
                sub={`${portfolio.holdings?.length ?? 0} position${portfolio.holdings?.length !== 1 ? "s" : ""}`}
              />
              <StatCard
                label="Total Return"
                value={`${portfolio.totalReturn >= 0 ? "+" : ""}${fmt(portfolio.totalReturn)}%`}
                color={returnColor}
                sub={
                  portfolio.totalReturnUSD != null
                    ? `${portfolio.totalReturnUSD >= 0 ? "+" : ""}${fmtUSD(portfolio.totalReturnUSD)}`
                    : undefined
                }
              />
            </div>
          </div>

          {beginnerMode && (
            <div
              style={{
                padding: "10px 14px",
                background: `${C.blue}0d`,
                border: `1px solid ${C.blue}22`,
                borderRadius: 8,
                fontSize: 12,
                color: C.textSecondary,
                marginBottom: 20,
              }}
            >
              📚 <strong>Paper trading</strong> uses virtual money so you can practice without losing real funds.
              Your P&L shows how your picks would have performed if you had used real money.
            </div>
          )}

          {/* Holdings */}
          <div style={{ marginBottom: 28 }}>
            <SectionTitle>Holdings</SectionTitle>
            {portfolio.holdings?.length > 0 ? (
              <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr>
                        <th style={TH}>Symbol</th>
                        <th style={TH}>Qty</th>
                        <th style={TH}>Entry Price</th>
                        <th style={TH}>Current Price</th>
                        <th style={TH}>P&L</th>
                        {portfolio.holdings.some((h) => h.weight != null) && (
                          <th style={TH}>Weight %</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {portfolio.holdings.map((h) => {
                        const pnlColor = h.pnl >= 0 ? C.green : C.red;
                        return (
                          <tr key={h.instrument}>
                            <td style={{ ...TD, color: C.textPrimary, fontWeight: 700, fontSize: 14 }}>
                              {h.instrument}
                            </td>
                            <td style={{ ...TD, fontVariantNumeric: "tabular-nums" }}>
                              {fmt(h.quantity, 0)}
                            </td>
                            <td style={{ ...TD, fontVariantNumeric: "tabular-nums" }}>
                              {fmtUSD(h.avgPrice)}
                            </td>
                            <td style={{ ...TD, fontVariantNumeric: "tabular-nums" }}>
                              {fmtUSD(h.currentPrice)}
                            </td>
                            <td style={TD}>
                              <div style={{ color: pnlColor, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                                {h.pnl >= 0 ? "+" : ""}{fmtUSD(h.pnl)}
                              </div>
                              <div style={{ color: pnlColor, fontSize: 11, fontVariantNumeric: "tabular-nums" }}>
                                {h.pnlPct >= 0 ? "+" : ""}{fmt(h.pnlPct)}%
                              </div>
                            </td>
                            {portfolio.holdings.some((h2) => h2.weight != null) && (
                              <td style={{ ...TD, fontVariantNumeric: "tabular-nums" }}>
                                {h.weight != null ? `${fmt(h.weight, 1)}%` : "—"}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <EmptyState icon="📊" title="No open positions" subtitle="Execute a trade below to open your first position." />
            )}
          </div>

          {/* Performance chart */}
          {perfChartData.length > 1 && (
            <div style={{ marginBottom: 28 }}>
              <SectionTitle>Performance vs S&P 500</SectionTitle>
              <Card>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={perfChartData} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a2436" vertical={false} />
                    <XAxis dataKey="date" stroke="#2a3a50" tick={{ fill: C.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis stroke="#2a3a50" tick={{ fill: C.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={42} />
                    <Tooltip
                      contentStyle={{ background: "#1a2332", border: `1px solid ${C.border}`, color: C.textPrimary, fontSize: 12 }}
                      formatter={(val: any) => [fmtUSD(Number(val)), undefined]}
                    />
                    <Legend wrapperStyle={{ color: C.textSecondary, fontSize: 12 }} />
                    <Line type="monotone" dataKey="Portfolio" stroke={C.blue} dot={false} strokeWidth={2} />
                    <Line type="monotone" dataKey="S&P 500" stroke={C.textMuted} dot={false} strokeWidth={1.5} strokeDasharray="5 3" />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </div>
          )}

          {/* Trade history */}
          <div style={{ marginBottom: 28 }}>
            <SectionTitle>Trade History</SectionTitle>
            {portfolio.trades?.length > 0 ? (
              <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr>
                        <th style={TH}>Date</th>
                        <th style={TH}>Instrument</th>
                        <th style={TH}>Action</th>
                        <th style={TH}>Qty</th>
                        <th style={TH}>Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {portfolio.trades.map((trade) => {
                        const ac = trade.action?.toUpperCase();
                        const actionColor = ac === "BUY" ? C.green : ac === "SHORT" ? C.red : "#f97316";
                        return (
                          <tr key={trade.id}>
                            <td style={{ ...TD, color: C.textMuted }}>
                              {new Date(trade.date).toLocaleDateString()}
                            </td>
                            <td style={{ ...TD, color: C.textPrimary, fontWeight: 600 }}>{trade.instrument}</td>
                            <td style={TD}>
                              <span
                                style={{
                                  color: actionColor,
                                  background: `${actionColor}1a`,
                                  border: `1px solid ${actionColor}44`,
                                  padding: "2px 8px",
                                  borderRadius: 4,
                                  fontSize: 11,
                                  fontWeight: 700,
                                }}
                              >
                                {trade.action}
                              </span>
                            </td>
                            <td style={{ ...TD, fontVariantNumeric: "tabular-nums" }}>{fmt(trade.quantity, 0)}</td>
                            <td style={{ ...TD, fontVariantNumeric: "tabular-nums" }}>{fmtUSD(trade.price)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <EmptyState icon="📋" title="No trade history" subtitle="Your executed trades will appear here." />
            )}
          </div>

          {/* Quick trade form */}
          <div style={{ marginBottom: 28 }}>
            <TradeForm onTraded={load} />
          </div>
        </>
      )}
    </div>
  );
}
