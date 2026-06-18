"use client";

import { card, mono, tnum } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { TrafficChart } from "@/components/Chart";
import { FX } from "@/components/FX";
import type { OverviewData } from "@/lib/types";

export function Overview({
  data,
  onOpenConn,
  goGeo,
  goConn,
}: {
  data: OverviewData;
  onOpenConn: (ip: string) => void;
  goGeo: () => void;
  goConn: () => void;
}) {
  const { kpis, chart, activeText, peakText, topCountries: countries, health, recent } = data;

  return (
    <div>
      {/* KPI cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 16,
          marginBottom: 16,
        }}
      >
        {kpis.map((k, i) => (
          <div key={i} style={{ ...card, padding: "17px 18px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  background: k.iconBg,
                  color: k.iconColor,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name={k.icon} size={18} />
              </div>
              <div
                style={{
                  fontSize: 11.5,
                  fontWeight: 560,
                  color: k.trendColor,
                  background: k.trendBg,
                  padding: "2px 8px",
                  borderRadius: 20,
                }}
              >
                {k.trend}
              </div>
            </div>
            <div
              style={{
                fontSize: 25,
                fontWeight: 660,
                letterSpacing: "-.03em",
                lineHeight: 1,
                ...tnum,
              }}
            >
              {k.value}
            </div>
            <div style={{ fontSize: 12.5, color: "#868d98", marginTop: 6 }}>
              {k.label}
            </div>
          </div>
        ))}
      </div>

      {/* Chart + Top countries */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.85fr 1fr",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <div style={{ ...card, padding: "18px 20px 14px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              marginBottom: 4,
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-.01em" }}>
                Active connections
              </div>
              <div style={{ fontSize: 12, color: "#868d98", marginTop: 2 }}>
                Last 60 minutes
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 660,
                  letterSpacing: "-.02em",
                  ...tnum,
                }}
              >
                {activeText}
              </div>
              <div style={{ fontSize: 11.5, color: "#15a05a", fontWeight: 540 }}>
                peak {peakText}
              </div>
            </div>
          </div>
          <div style={{ height: 190, marginTop: 8 }}>
            <TrafficChart data={chart} />
          </div>
        </div>

        <div style={{ ...card, padding: "18px 20px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-.01em" }}>
              Top countries
            </div>
            <button
              onClick={goGeo}
              style={{
                fontSize: 12,
                color: "#2d68f5",
                background: "none",
                border: "none",
                fontWeight: 540,
                padding: 0,
              }}
            >
              View map
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {countries.map((c, i) => (
              <div key={i}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 6,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                      minWidth: 0,
                    }}
                  >
                    <span
                      style={{
                        ...mono,
                        fontSize: 10.5,
                        fontWeight: 600,
                        color: "#5a616b",
                        background: "#f1f3f6",
                        borderRadius: 5,
                        padding: "2px 6px",
                        letterSpacing: ".02em",
                      }}
                    >
                      {c.code}
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        color: "#2b2f37",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {c.name}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: 12.5,
                      color: "#5a616b",
                      fontWeight: 540,
                      ...tnum,
                    }}
                  >
                    {c.count}
                  </span>
                </div>
                <div
                  style={{
                    height: 6,
                    background: "#f0f2f5",
                    borderRadius: 6,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${c.pct}%`,
                      background: c.barColor,
                      borderRadius: 6,
                      transition: "width .5s ease",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Health cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 16,
          marginBottom: 16,
        }}
      >
        {health.cards.map((h, i) => (
          <div key={i} style={{ ...card, padding: "15px 17px" }}>
            <div style={{ fontSize: 12, color: "#868d98", marginBottom: 9 }}>
              {h.label}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 6,
                marginBottom: 9,
              }}
            >
              <div
                style={{
                  fontSize: 19,
                  fontWeight: 620,
                  letterSpacing: "-.02em",
                  ...tnum,
                }}
              >
                {h.value}
              </div>
              <div style={{ fontSize: 12, color: h.subColor }}>{h.sub}</div>
            </div>
            <div
              style={{
                height: 5,
                background: "#f0f2f5",
                borderRadius: 6,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${h.pct}%`,
                  background: h.color,
                  borderRadius: 6,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Recent connections */}
      <div style={{ ...card, overflow: "hidden" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid #f0f1f4",
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-.01em" }}>
            Recent connections
          </div>
          <button
            onClick={goConn}
            style={{
              fontSize: 12.5,
              color: "#2d68f5",
              background: "none",
              border: "none",
              fontWeight: 540,
              display: "flex",
              alignItems: "center",
              gap: 3,
            }}
          >
            View all <Icon name="chevron" size={14} sw={2} />
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {recent.map((c) => (
            <FX
              key={c.ip}
              onClick={() => onOpenConn(c.ip)}
              s={{
                display: "grid",
                gridTemplateColumns: "1.4fr 1.3fr .9fr .9fr .8fr",
                alignItems: "center",
                gap: 12,
                padding: "12px 20px",
                border: "none",
                borderTop: "1px solid #f4f5f7",
                background: "#fff",
                textAlign: "left",
                transition: "background .12s",
              }}
              hover={{ background: "#fafbfc" }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  minWidth: 0,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: c.dotColor,
                    flex: "none",
                  }}
                />
                <span style={{ ...mono, fontSize: 12.5, color: "#2b2f37" }}>
                  {c.ip}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  minWidth: 0,
                }}
              >
                <span
                  style={{
                    ...mono,
                    fontSize: 10,
                    fontWeight: 600,
                    color: "#5a616b",
                    background: "#f1f3f6",
                    borderRadius: 4,
                    padding: "1px 5px",
                  }}
                >
                  {c.code}
                </span>
                <span
                  style={{
                    fontSize: 12.5,
                    color: "#5a616b",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {c.city}
                </span>
              </div>
              <div style={{ fontSize: 12.5, color: "#5a616b", ...tnum }}>{c.dur}</div>
              <div
                style={{
                  fontSize: 12.5,
                  color: "#5a616b",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  ...tnum,
                }}
              >
                <span style={{ color: "#2d68f5" }}>↓</span>
                {c.down}
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 540,
                    color: c.statusColor,
                    background: c.statusBg,
                    padding: "2px 9px",
                    borderRadius: 20,
                  }}
                >
                  {c.statusLabel}
                </span>
              </div>
            </FX>
          ))}
        </div>
      </div>
    </div>
  );
}
