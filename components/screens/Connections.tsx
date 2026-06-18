"use client";

import { FILTER_DEF, fn } from "@/lib/data";
import type { DisplayConn } from "@/lib/data";
import { card, mono, inputFocus, tnum } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { FX } from "@/components/FX";

const GRID = "1.3fr 1.4fr .8fr .85fr .85fr .8fr 90px";

export function Connections({
  connections,
  search,
  setSearch,
  connFilter,
  setConnFilter,
  onOpenConn,
}: {
  connections: DisplayConn[];
  search: string;
  setSearch: (v: string) => void;
  connFilter: string;
  setConnFilter: (v: string) => void;
  onOpenConn: (ip: string) => void;
}) {
  const all = connections;
  const q = search.trim().toLowerCase();
  let filtered = all.filter(
    (c) =>
      !q ||
      c.ip.toLowerCase().includes(q) ||
      c.country.toLowerCase().includes(q) ||
      c.city.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q),
  );
  if (connFilter === "active") filtered = filtered.filter((c) => c.statusLabel === "Active");
  if (connFilter === "idle") filtered = filtered.filter((c) => c.statusLabel === "Idle");

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 14,
          marginBottom: 16,
        }}
      >
        <div style={{ position: "relative", flex: 1, maxWidth: 360 }}>
          <span
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "#aab0ba",
            }}
          >
            <Icon name="search" size={16} />
          </span>
          <FX
            as="input"
            value={search}
            onChange={(e) => setSearch((e.target as HTMLInputElement).value)}
            placeholder="Search IP, country, city…"
            s={{
              width: "100%",
              height: 38,
              padding: "0 12px 0 36px",
              border: "1px solid #e7e9ee",
              borderRadius: 9,
              fontSize: 13.5,
              background: "#fff",
              outline: "none",
              transition: "border-color .15s,box-shadow .15s",
            }}
            focus={inputFocus}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 12.5, color: "#868d98" }}>
            {fn(all.length)} connections
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {FILTER_DEF.map(([id, label]) => {
              const on = connFilter === id;
              return (
                <button
                  key={id}
                  onClick={() => setConnFilter(id)}
                  style={{
                    height: 30,
                    padding: "0 12px",
                    borderRadius: 7,
                    fontSize: 12,
                    fontWeight: 540,
                    border: `1px solid ${on ? "#111317" : "#e7e9ee"}`,
                    background: on ? "#111317" : "#fff",
                    color: on ? "#fff" : "#5a616b",
                    transition: "all .14s",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ ...card, overflow: "hidden" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: GRID,
            gap: 12,
            padding: "11px 20px",
            background: "#fafbfc",
            borderBottom: "1px solid #eef0f3",
            fontSize: 11,
            fontWeight: 600,
            color: "#9aa0aa",
            letterSpacing: ".03em",
            textTransform: "uppercase",
          }}
        >
          <div>IP address</div>
          <div>Location</div>
          <div>Duration</div>
          <div>Down</div>
          <div>Up</div>
          <div>Status</div>
          <div />
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {filtered.map((c) => (
            <FX
              key={c.ip}
              as="div"
              s={{
                display: "grid",
                gridTemplateColumns: GRID,
                gap: 12,
                alignItems: "center",
                padding: "12px 20px",
                borderTop: "1px solid #f4f5f7",
                transition: "background .12s",
              }}
              hover={{ background: "#fafbfc" }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}
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
                <span style={{ ...mono, fontSize: 12.5, color: "#2b2f37" }}>{c.ip}</span>
              </div>
              <div
                style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}
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
                    flex: "none",
                  }}
                >
                  {c.code}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    color: "#3f444d",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {c.city}, {c.country}
                </span>
              </div>
              <div style={{ fontSize: 12.5, color: "#5a616b", ...tnum }}>{c.dur}</div>
              <div style={{ fontSize: 12.5, color: "#3f444d", ...tnum }}>
                <span style={{ color: "#2d68f5", marginRight: 3 }}>↓</span>
                {c.down}
              </div>
              <div style={{ fontSize: 12.5, color: "#3f444d", ...tnum }}>
                <span style={{ color: "#7c5cff", marginRight: 3 }}>↑</span>
                {c.up}
              </div>
              <div>
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
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <FX
                  onClick={() => onOpenConn(c.ip)}
                  s={{
                    height: 30,
                    padding: "0 12px",
                    border: "1px solid #e7e9ee",
                    borderRadius: 7,
                    background: "#fff",
                    fontSize: 12,
                    fontWeight: 540,
                    color: "#3f444d",
                    transition: "background .14s,border-color .14s",
                  }}
                  hover={{ background: "#f7f8fa", border: "1px solid #d8dce2" }}
                >
                  Details
                </FX>
              </div>
            </FX>
          ))}
        </div>
        {filtered.length === 0 && (
          <div
            style={{
              padding: 48,
              textAlign: "center",
              color: "#9aa0aa",
              fontSize: 13.5,
            }}
          >
            No connections match “{search}”.
          </div>
        )}
      </div>
    </div>
  );
}
