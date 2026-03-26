import { useState } from "react";
import { C } from "../context.js";

interface ReportData {
  globalScore?: number;
  regime?: string;
  scores?: { market: string; crashScore: number }[];
  signals?: { instrument: string; action: string; entry?: number; target?: number; confidence?: number }[];
  indicators?: { name: string; slug: string; latestValue?: { value?: number; normalizedValue?: number } }[];
  geopoliticalRisk?: number;
  geopoliticalHeadline?: string;
  macroEvents?: { date: string; name: string; impact: string }[];
}

interface ReportExportProps {
  data: ReportData;
}

export function ReportExport({ data }: ReportExportProps) {
  const [open, setOpen] = useState(false);

  function handlePrint() {
    window.print();
  }

  function handleOpen() {
    setOpen(true);
    // Small delay to let the print panel mount before triggering
    setTimeout(() => window.print(), 200);
  }

  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const globalScore = data.globalScore ?? 0;
  const regime = data.regime ?? "UNKNOWN";
  const scores = data.scores ?? [];
  const signals = (data.signals ?? []).slice(0, 3);
  const indicators = (data.indicators ?? []).slice(0, 6);
  const macroEvents = (data.macroEvents ?? []).slice(0, 3);

  return (
    <>
      {/* Generate Report button */}
      <button
        onClick={handleOpen}
        data-report="generate-btn"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "7px 16px",
          borderRadius: 8,
          border: `1px solid ${C.border}`,
          background: "transparent",
          color: C.textSecondary,
          fontSize: 13,
          cursor: "pointer",
          transition: "all 0.15s",
          whiteSpace: "nowrap",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = C.blue + "66";
          (e.currentTarget as HTMLButtonElement).style.color = C.blue;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = C.border;
          (e.currentTarget as HTMLButtonElement).style.color = C.textSecondary;
        }}
      >
        <span style={{ fontSize: 14 }}>📄</span>
        Generate Report
      </button>

      {/* Print-only report (hidden on screen, shown on print) */}
      <div className="report-print-only" style={{ display: "none" }}>
        <div className="report-page">
          <div className="report-header">
            <h1>MarketPulse Daily Report</h1>
            <p className="report-date">{date}</p>
          </div>

          <div className="report-section">
            <div className="report-score-line">
              Global Crash Score: <strong>{globalScore.toFixed(1)}</strong>
              {" "}({scoreLabel(globalScore)})
            </div>
            <div className="report-regime">Market Regime: <strong>{regime}</strong></div>
          </div>

          {scores.length > 0 && (
            <div className="report-section">
              <h2>Market Status</h2>
              {scores.map((s) => (
                <div key={s.market} className="report-row">
                  {s.market.toUpperCase()}: <strong>{Number(s.crashScore).toFixed(1)}</strong>
                  {" "}({scoreLabel(Number(s.crashScore))})
                </div>
              ))}
            </div>
          )}

          {signals.length > 0 && (
            <div className="report-section">
              <h2>Top Signals</h2>
              {signals.map((sig, i) => (
                <div key={i} className="report-row">
                  {sig.action?.toUpperCase()} {sig.instrument}
                  {sig.entry != null && ` @ ${sig.entry}`}
                  {sig.target != null && ` | Target: ${sig.target}`}
                  {sig.confidence != null && ` | Confidence: ${sig.confidence}%`}
                </div>
              ))}
            </div>
          )}

          {indicators.length > 0 && (
            <div className="report-section">
              <h2>Key Indicators</h2>
              {indicators.map((ind) => (
                <div key={ind.slug} className="report-row">
                  {ind.name}:{" "}
                  {ind.latestValue?.value != null ? Number(ind.latestValue.value).toFixed(2) : "—"}
                  {ind.latestValue?.normalizedValue != null && (
                    <span className="report-normalized"> (normalized: {Number(ind.latestValue.normalizedValue).toFixed(0)})</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {data.geopoliticalRisk != null && (
            <div className="report-section">
              <h2>Geopolitical Risk</h2>
              <div className="report-row">
                Score: <strong>{data.geopoliticalRisk}</strong>
                {" "}({geoLabel(data.geopoliticalRisk)})
              </div>
              {data.geopoliticalHeadline && (
                <div className="report-row">Top Risk: {data.geopoliticalHeadline}</div>
              )}
            </div>
          )}

          {macroEvents.length > 0 && (
            <div className="report-section">
              <h2>Upcoming Macro Events</h2>
              {macroEvents.map((ev, i) => (
                <div key={i} className="report-row">
                  {new Date(ev.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                  {" — "}{ev.name}
                  {ev.impact && <span className="report-impact"> ({ev.impact} impact)</span>}
                </div>
              ))}
            </div>
          )}

          <div className="report-footer">
            Generated by MarketPulse · {date}
          </div>
        </div>
      </div>

      {/* Global print CSS injected into head once */}
      <style>{`
        @media print {
          /* Hide all normal content */
          body > * { display: none !important; }
          /* Show only the report */
          .report-print-only { display: block !important; }

          /* Reset for print */
          .report-page {
            font-family: Georgia, serif;
            color: #000;
            background: #fff;
            padding: 48px;
            max-width: 700px;
            margin: 0 auto;
            font-size: 13px;
            line-height: 1.6;
          }

          .report-header { border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 20px; }
          .report-header h1 { font-size: 20px; margin: 0 0 4px; }
          .report-date { font-size: 12px; color: #555; margin: 0; }

          .report-section { margin-bottom: 20px; page-break-inside: avoid; }
          .report-section h2 { font-size: 14px; margin: 0 0 8px; border-bottom: 1px solid #ccc; padding-bottom: 4px; text-transform: uppercase; letter-spacing: 0.05em; }

          .report-score-line { font-size: 16px; margin-bottom: 4px; }
          .report-regime { font-size: 13px; color: #333; }
          .report-row { padding: 3px 0; border-bottom: 1px solid #eee; }
          .report-normalized { color: #555; }
          .report-impact { color: #333; }

          .report-footer { border-top: 1px solid #ccc; padding-top: 12px; font-size: 11px; color: #888; text-align: center; margin-top: 32px; }
        }
      `}</style>
    </>
  );
}

function scoreLabel(score: number): string {
  if (score < 25) return "Low";
  if (score < 50) return "Moderate";
  if (score < 60) return "High";
  if (score < 75) return "Warning";
  if (score < 90) return "Critical";
  return "Extreme";
}

function geoLabel(score: number): string {
  if (score < 30) return "Low";
  if (score < 60) return "Moderate";
  if (score < 80) return "High";
  return "Critical";
}
