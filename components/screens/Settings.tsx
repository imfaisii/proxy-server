"use client";

import { fn } from "@/lib/data";
import { card, mono } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { FX } from "@/components/FX";
import type { ServerInfo } from "@/lib/types";

const box = {
  background: "#fafbfc",
  border: "1px solid #eef0f3",
  borderRadius: 10,
  padding: "13px 15px",
} as const;
const boxLabel = { fontSize: 11.5, color: "#9aa0aa", marginBottom: 5 } as const;
const boxVal = { ...mono, fontSize: 14, color: "#23262d" } as const;

export function Settings({
  server,
  total,
  secretRevealed,
  toggleSecret,
  onCopySecret,
  onCopyLink,
}: {
  server: ServerInfo;
  total: number;
  secretRevealed: boolean;
  toggleSecret: () => void;
  onCopySecret: () => void;
  onCopyLink: () => void;
}) {
  const secret = server.secret ?? "";
  const tgShort = server.tgLinkShort;
  const secretDisplay = secretRevealed
    ? secret
    : secret.replace(/./g, (ch, i) =>
        i < 6 || i > secret.length - 6 ? ch : "•",
      );

  return (
    <div style={{ maxWidth: 780 }}>
      {/* Server */}
      <div style={{ ...card, padding: "20px 22px", marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>Server</div>
        <div style={{ fontSize: 12.5, color: "#868d98", marginBottom: 18 }}>
          Connection details for this MTProto proxy.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={box}>
            <div style={boxLabel}>Server IP</div>
            <div style={boxVal}>{server.ip}</div>
          </div>
          <div style={box}>
            <div style={boxLabel}>Port</div>
            <div style={boxVal}>
              {server.port}{" "}
              <span style={{ color: "#9aa0aa", fontSize: 12 }}>· FakeTLS</span>
            </div>
          </div>
          <div style={box}>
            <div style={boxLabel}>FakeTLS domain (SNI)</div>
            <div style={boxVal}>{server.domain}</div>
          </div>
          <div style={box}>
            <div style={boxLabel}>Image</div>
            <div style={boxVal}>{server.image}</div>
          </div>
        </div>

        {/* Secret */}
        <div style={{ ...box, marginTop: 14 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 7,
            }}
          >
            <div style={{ fontSize: 11.5, color: "#9aa0aa" }}>Secret</div>
            <div style={{ display: "flex", gap: 14 }}>
              <button
                onClick={toggleSecret}
                style={{
                  fontSize: 11.5,
                  color: "#2d68f5",
                  background: "none",
                  border: "none",
                  fontWeight: 540,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Icon name={secretRevealed ? "eyeoff" : "eye"} size={13} sw={1.8} />{" "}
                {secretRevealed ? "Hide" : "Reveal"}
              </button>
              <button
                onClick={onCopySecret}
                style={{
                  fontSize: 11.5,
                  color: "#2d68f5",
                  background: "none",
                  border: "none",
                  fontWeight: 540,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Icon name="copy" size={13} /> Copy
              </button>
            </div>
          </div>
          <div
            style={{
              ...mono,
              fontSize: 13,
              color: "#23262d",
              wordBreak: "break-all",
              lineHeight: 1.5,
            }}
          >
            {secretDisplay}
          </div>
        </div>

        {/* tg:// link */}
        <div
          style={{
            ...box,
            marginTop: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 12.5,
                fontWeight: 540,
                color: "#23262d",
                marginBottom: 3,
              }}
            >
              tg:// connection link
            </div>
            <div
              style={{
                ...mono,
                fontSize: 11.5,
                color: "#868d98",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {tgShort}
            </div>
          </div>
          <FX
            onClick={onCopyLink}
            s={{
              flex: "none",
              height: 32,
              padding: "0 13px",
              border: "1px solid #e7e9ee",
              borderRadius: 8,
              background: "#fff",
              fontSize: 12.5,
              fontWeight: 540,
              color: "#3f444d",
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "background .14s",
            }}
            hover={{ background: "#f7f8fa" }}
          >
            <Icon name="copy" size={13} /> Copy
          </FX>
        </div>
      </div>

      {/* Security */}
      <div style={{ ...card, padding: "20px 22px", marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>Security</div>
        <div style={{ fontSize: 12.5, color: "#868d98", marginBottom: 16 }}>
          Console access &amp; secret rotation.
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "13px 0",
            borderBottom: "1px solid #f4f5f7",
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 540, color: "#23262d" }}>
              Admin password
            </div>
            <div style={{ fontSize: 12, color: "#9aa0aa", marginTop: 2 }}>
              Set via <span style={mono}>ADMIN_PASSWORD</span> in the server .env
            </div>
          </div>
          <span
            style={{
              fontSize: 11.5,
              fontWeight: 540,
              color: "#15a05a",
              background: "#e7f6ee",
              padding: "3px 10px",
              borderRadius: 20,
            }}
          >
            Configured
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "13px 0",
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 540, color: "#23262d" }}>
              Rotate FakeTLS secret
            </div>
            <div style={{ fontSize: 12, color: "#9aa0aa", marginTop: 2 }}>
              Generates a new secret — existing links stop working
            </div>
          </div>
          <FX
            s={{
              height: 32,
              padding: "0 13px",
              border: "1px solid #e7e9ee",
              borderRadius: 8,
              background: "#fff",
              fontSize: 12.5,
              fontWeight: 540,
              color: "#3f444d",
              transition: "background .14s",
            }}
            hover={{ background: "#f7f8fa" }}
          >
            Rotate
          </FX>
        </div>
      </div>

      {/* Danger zone */}
      <div style={{ ...card, border: "1px solid #f6d5d5", padding: "20px 22px" }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#c2363b", marginBottom: 2 }}>
          Danger zone
        </div>
        <div style={{ fontSize: 12.5, color: "#868d98", marginBottom: 16 }}>
          Actions that interrupt active connections.
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 540, color: "#23262d" }}>
              Restart proxy container
            </div>
            <div style={{ fontSize: 12, color: "#9aa0aa", marginTop: 2 }}>
              Drops all {fn(total)} active connections
            </div>
          </div>
          <FX
            s={{
              height: 34,
              padding: "0 14px",
              border: "1px solid #f1c2c2",
              borderRadius: 8,
              background: "#fff",
              fontSize: 12.5,
              fontWeight: 560,
              color: "#e5484d",
              transition: "background .14s",
            }}
            hover={{ background: "#fdf3f3" }}
          >
            Restart proxy
          </FX>
        </div>
      </div>
    </div>
  );
}
