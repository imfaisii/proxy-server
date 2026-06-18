"use client";

import { fn } from "@/lib/data";
import { card, mono, tnum } from "@/components/ui";
import type { GeographyData } from "@/lib/types";

export function Geography({ data }: { data: GeographyData }) {
  const { countries, regions, countryCount, total, restrictedPct: rPct, restrictedCount: rCount } = data;

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 320px",
          gap: 16,
          marginBottom: 16,
        }}
      >
        {/* Connections by country */}
        <div style={{ ...card, padding: "18px 20px" }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 3 }}>
            Connections by country
          </div>
          <div style={{ fontSize: 12.5, color: "#868d98", marginBottom: 18 }}>
            {fn(total)} active sessions across {countryCount} countries
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
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
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span
                      style={{
                        ...mono,
                        fontSize: 10.5,
                        fontWeight: 600,
                        color: "#5a616b",
                        background: "#f1f3f6",
                        borderRadius: 5,
                        padding: "2px 6px",
                      }}
                    >
                      {c.code}
                    </span>
                    <span style={{ fontSize: 13.5, color: "#2b2f37" }}>{c.name}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <span style={{ fontSize: 12, color: "#9aa0aa", ...tnum }}>
                      {c.bytes}
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        color: "#3f444d",
                        fontWeight: 560,
                        width: 34,
                        textAlign: "right",
                        ...tnum,
                      }}
                    >
                      {c.count}
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    height: 7,
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
                      transition: "width .5s",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ ...card, padding: "18px 20px" }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
              By region
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
              {regions.map((r, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 11 }}>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 3,
                      background: r.color,
                      flex: "none",
                    }}
                  />
                  <span style={{ flex: 1, fontSize: 13, color: "#3f444d" }}>
                    {r.name}
                  </span>
                  <span
                    style={{ fontSize: 12.5, color: "#5a616b", fontWeight: 540, ...tnum }}
                  >
                    {r.pct}%
                  </span>
                </div>
              ))}
            </div>
            <div
              style={{
                display: "flex",
                height: 9,
                borderRadius: 6,
                overflow: "hidden",
                marginTop: 16,
              }}
            >
              {regions.map((r, i) => (
                <div
                  key={i}
                  style={{ width: `${r.pct}%`, background: r.color, height: "100%" }}
                />
              ))}
            </div>
          </div>

          <div style={{ ...card, padding: "18px 20px" }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 5 }}>
              Censorship insight
            </div>
            <div
              style={{
                fontSize: 12.5,
                color: "#868d98",
                lineHeight: 1.55,
                marginBottom: 14,
              }}
            >
              Share of traffic from regions with known Telegram restrictions.
            </div>
            <div
              style={{
                fontSize: 30,
                fontWeight: 680,
                letterSpacing: "-.03em",
                color: "#111317",
              }}
            >
              {rPct}%
            </div>
            <div style={{ fontSize: 12, color: "#15a05a", marginTop: 3 }}>
              helping {rCount} users reach Telegram
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
