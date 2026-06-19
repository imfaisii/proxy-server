"use client";

import { useState } from "react";
import type { Campaign } from "@/lib/data";
import { card, mono, tnum, inputFocus } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { FX } from "@/components/FX";

export interface CreateInput {
  name: string;
  channel: string;
  adTag: string;
  global: boolean;
}

const labelStyle = {
  display: "block",
  fontSize: 12,
  fontWeight: 540,
  color: "#3f444d",
  marginBottom: 6,
} as const;

const fieldStyle = {
  width: "100%",
  height: 38,
  padding: "0 12px",
  border: "1px solid #e7e9ee",
  borderRadius: 9,
  fontSize: 13.5,
  outline: "none",
  background: "#fcfcfd",
  color: "#2b2f37",
} as const;

const TAG_RE = /^[0-9a-fA-F]{32}$/;

export function Campaigns({
  campaigns,
  campaignOn,
  onToggleGlobal,
  onCreate,
  onPause,
  onDelete,
  onCopy,
}: {
  campaigns: Campaign[];
  campaignOn: boolean;
  onToggleGlobal: (on: boolean) => void;
  onCreate: (input: CreateInput) => Promise<{ ok: boolean; link?: string; error?: string }>;
  onPause: (username: string, enabled: boolean) => void;
  onDelete: (username: string) => void;
  onCopy: (text: string, msg: string) => void;
}) {
  const global = campaigns.find((c) => c.isGlobal);
  const rows = campaigns.filter((c) => !c.isGlobal);
  // The global toggle can only be enabled once a channel is configured; allow
  // turning it back off regardless.
  const toggleDisabled = !global?.channel && !campaignOn;

  const [name, setName] = useState("");
  const [channel, setChannel] = useState("");
  const [adTag, setAdTag] = useState("");
  const [asGlobal, setAsGlobal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [createdLink, setCreatedLink] = useState("");

  async function submit() {
    setFormError("");
    setCreatedLink("");
    const n = name.trim();
    const t = adTag.trim();
    if (!n) {
      setFormError("Campaign name is required.");
      return;
    }
    if (!t) {
      setFormError("Ad-tag is required — get it from @MTProxybot (/newproxy).");
      return;
    }
    if (!TAG_RE.test(t)) {
      setFormError("Ad-tag must be 32 hex characters (from @MTProxybot).");
      return;
    }
    setBusy(true);
    const r = await onCreate({ name: n, channel: channel.trim(), adTag: t, global: asGlobal });
    setBusy(false);
    if (!r.ok) {
      setFormError(r.error || "Could not create the campaign.");
      return;
    }
    setCreatedLink(r.link || "");
    setName("");
    setChannel("");
    setAdTag("");
    setAsGlobal(false);
  }

  return (
    <div>
      {/* Hero: global sponsored channel */}
      <div
        style={{
          background: "linear-gradient(98deg,#111317,#1d2026)",
          borderRadius: 14,
          padding: "22px 24px",
          marginBottom: 16,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 11,
              background: "rgba(255,255,255,.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flex: "none",
            }}
          >
            <Icon name="mega" size={22} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-.02em" }}>
              Global sponsored channel
            </div>
            <div
              style={{
                fontSize: 13,
                color: "rgba(255,255,255,.62)",
                marginTop: 2,
                maxWidth: 520,
                lineHeight: 1.5,
              }}
            >
              {global?.channel ? (
                <>
                  Everyone on your main connection link sees{" "}
                  <span style={{ color: "#fff", fontWeight: 540 }}>{global.channel}</span>{" "}
                  promoted in Telegram.
                </>
              ) : (
                <>
                  Not configured. Add a campaign below with “Set as global default”
                  to promote one channel to everyone on your main link.
                </>
              )}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: "none" }}>
          <span style={{ fontSize: 12.5, color: "rgba(255,255,255,.7)" }}>
            {campaignOn ? "Enabled" : "Disabled"}
          </span>
          <button
            onClick={() => {
              if (!toggleDisabled) onToggleGlobal(!campaignOn);
            }}
            disabled={toggleDisabled}
            aria-pressed={campaignOn}
            title={
              toggleDisabled
                ? "Add a campaign with “Set as global default” first"
                : ""
            }
            style={{
              width: 46,
              height: 26,
              borderRadius: 20,
              border: "none",
              background: campaignOn ? "#16a34a" : "rgba(255,255,255,.22)",
              position: "relative",
              transition: "background .2s",
              flex: "none",
              cursor: toggleDisabled ? "not-allowed" : "pointer",
              opacity: toggleDisabled ? 0.5 : 1,
            }}
          >
            <span
              style={{
                position: "absolute",
                top: 3,
                left: campaignOn ? 23 : 3,
                width: 20,
                height: 20,
                borderRadius: "50%",
                background: "#fff",
                transition: "left .2s",
                boxShadow: "0 1px 3px rgba(0,0,0,.3)",
              }}
            />
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 16 }}>
        {/* Campaigns table */}
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
            <div style={{ fontSize: 14, fontWeight: 600 }}>Campaigns</div>
            <FX
              onClick={() => document.getElementById("camp-name")?.focus()}
              s={{
                height: 32,
                padding: "0 13px",
                border: "none",
                borderRadius: 8,
                background: "#2d68f5",
                color: "#fff",
                fontSize: 12.5,
                fontWeight: 540,
                display: "flex",
                alignItems: "center",
                gap: 6,
                transition: "background .14s",
              }}
              hover={{ background: "#1f55da" }}
            >
              <Icon name="plus" size={15} sw={2} /> New campaign
            </FX>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.7fr .8fr .7fr .9fr 1fr",
              gap: 12,
              padding: "10px 20px",
              background: "#fafbfc",
              borderBottom: "1px solid #eef0f3",
              fontSize: 11,
              fontWeight: 600,
              color: "#9aa0aa",
              letterSpacing: ".03em",
              textTransform: "uppercase",
            }}
          >
            <div>Campaign</div>
            <div>Devices</div>
            <div>Live</div>
            <div>Data served</div>
            <div style={{ textAlign: "right" }}>Actions</div>
          </div>

          {rows.length === 0 && (
            <div style={{ padding: "28px 20px", textAlign: "center", color: "#9aa0aa", fontSize: 13 }}>
              No campaigns yet. Create one on the right — each gets its own connect
              link to hand to a target audience.
            </div>
          )}

          {rows.map((c) => (
            <div
              key={c.username}
              style={{
                display: "grid",
                gridTemplateColumns: "1.7fr .8fr .7fr .9fr 1fr",
                gap: 12,
                alignItems: "center",
                padding: "14px 20px",
                borderTop: "1px solid #f4f5f7",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 9,
                    background: c.avatarBg,
                    color: c.avatarColor,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    fontWeight: 600,
                    flex: "none",
                  }}
                >
                  {c.initial}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13.5,
                      fontWeight: 560,
                      color: "#23262d",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {c.name}
                  </div>
                  <div
                    style={{
                      fontSize: 11.5,
                      color: "#9aa0aa",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.statusDot }} />
                    {c.channel || "no channel"} · {c.statusLabel}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 13, color: "#3f444d", ...tnum }}>{c.devices}</div>
              <div style={{ fontSize: 13, color: "#3f444d", ...tnum }}>{c.live}</div>
              <div style={{ fontSize: 13, color: "#3f444d", ...tnum }}>{c.data}</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                <FX
                  onClick={() => onCopy(c.link, "Connect link copied")}
                  title="Copy connect link"
                  s={{
                    width: 30,
                    height: 30,
                    border: "1px solid #e7e9ee",
                    borderRadius: 8,
                    background: "#fff",
                    color: "#5a616b",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "background .14s",
                    opacity: c.link ? 1 : 0.4,
                  }}
                  hover={{ background: "#f7f8fa" }}
                  {...(c.link ? {} : { disabled: true })}
                >
                  <Icon name="copy" size={14} />
                </FX>
                <FX
                  onClick={() => onPause(c.username, !c.enabled)}
                  s={{
                    height: 30,
                    padding: "0 10px",
                    border: "1px solid #e7e9ee",
                    borderRadius: 8,
                    background: "#fff",
                    color: "#5a616b",
                    fontSize: 12,
                    fontWeight: 540,
                    transition: "background .14s",
                  }}
                  hover={{ background: "#f7f8fa" }}
                >
                  {c.enabled ? "Pause" : "Resume"}
                </FX>
                <FX
                  onClick={() => onDelete(c.username)}
                  title="Delete campaign"
                  s={{
                    width: 30,
                    height: 30,
                    border: "1px solid #f1c2c2",
                    borderRadius: 8,
                    background: "#fff",
                    color: "#e5484d",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "background .14s",
                  }}
                  hover={{ background: "#fdf3f3" }}
                >
                  <Icon name="close" size={15} sw={2} />
                </FX>
              </div>
            </div>
          ))}
        </div>

        {/* New campaign form */}
        <div style={{ ...card, padding: "18px 20px", height: "fit-content" }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>New campaign</div>
          <div style={{ fontSize: 12.5, color: "#868d98", marginBottom: 18, lineHeight: 1.5 }}>
            Creates a connect link with its own promoted channel. Get the ad-tag from
            @MTProxybot (<span style={mono}>/newproxy</span>).
          </div>

          <label style={labelStyle}>Campaign name</label>
          <FX
            as="input"
            id="camp-name"
            value={name}
            onChange={(e) => setName((e.target as HTMLInputElement).value)}
            placeholder="CryptoSignals Pro"
            s={{ ...fieldStyle, marginBottom: 14 }}
            focus={inputFocus}
          />

          <label style={labelStyle}>Channel handle</label>
          <FX
            as="input"
            value={channel}
            onChange={(e) => setChannel((e.target as HTMLInputElement).value)}
            placeholder="@cryptosignals"
            s={{ ...fieldStyle, marginBottom: 14, ...mono }}
            focus={inputFocus}
          />

          <label style={labelStyle}>Ad-tag (from @MTProxybot)</label>
          <FX
            as="input"
            value={adTag}
            onChange={(e) => setAdTag((e.target as HTMLInputElement).value)}
            placeholder="32 hex characters"
            s={{ ...fieldStyle, marginBottom: 12, ...mono, fontSize: 12.5 }}
            focus={inputFocus}
          />

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12.5,
              color: "#3f444d",
              marginBottom: 16,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={asGlobal}
              onChange={(e) => setAsGlobal(e.target.checked)}
            />
            Set as global default (everyone on the main link)
          </label>

          {formError && (
            <div
              style={{
                fontSize: 12,
                color: "#e5484d",
                marginBottom: 12,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Icon name="alert" size={14} sw={2} /> {formError}
            </div>
          )}

          <FX
            onClick={() => {
              if (!busy) void submit();
            }}
            s={{
              width: "100%",
              height: 40,
              border: "none",
              borderRadius: 9,
              background: busy ? "#9aa0aa" : "#111317",
              color: "#fff",
              fontSize: 13.5,
              fontWeight: 560,
              transition: "background .14s",
            }}
            hover={busy ? {} : { background: "#23262d" }}
          >
            {busy ? "Creating…" : "Create campaign"}
          </FX>

          {createdLink && (
            <div
              style={{
                marginTop: 16,
                paddingTop: 14,
                borderTop: "1px solid #f0f1f4",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 540, color: "#3f444d", marginBottom: 7 }}>
                Connect link — hand this to your audience:
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "#f7f8fa",
                  border: "1px solid #eef0f3",
                  borderRadius: 9,
                  padding: "8px 10px",
                }}
              >
                <span
                  style={{
                    ...mono,
                    fontSize: 11.5,
                    color: "#5a616b",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    flex: 1,
                  }}
                >
                  {createdLink}
                </span>
                <FX
                  onClick={() => onCopy(createdLink, "Connect link copied")}
                  s={{
                    height: 28,
                    padding: "0 10px",
                    border: "none",
                    borderRadius: 7,
                    background: "#2d68f5",
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 540,
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    flex: "none",
                  }}
                  hover={{ background: "#1f55da" }}
                >
                  <Icon name="copy" size={13} /> Copy
                </FX>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
