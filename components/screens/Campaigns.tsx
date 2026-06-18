"use client";

import { FREQ_OPTS } from "@/lib/data";
import type { Campaign } from "@/lib/data";
import { card, mono, inputFocus } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { FX } from "@/components/FX";

export function Campaigns({
  campaigns,
  campaignOn,
  toggleCampaign,
  freq,
  setFreq,
}: {
  campaigns: Campaign[];
  campaignOn: boolean;
  toggleCampaign: () => void;
  freq: string;
  setFreq: (v: string) => void;
}) {

  return (
    <div>
      {/* Hero banner */}
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
              Sponsored channel
            </div>
            <div
              style={{
                fontSize: 13,
                color: "rgba(255,255,255,.62)",
                marginTop: 2,
                maxWidth: 480,
                lineHeight: 1.5,
              }}
            >
              Promote a channel to everyone connecting through your proxy. Shown on
              connect &amp; in periodic Telegram messages.
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: "none" }}>
          <span style={{ fontSize: 12.5, color: "rgba(255,255,255,.7)" }}>
            {campaignOn ? "Enabled" : "Disabled"}
          </span>
          <button
            onClick={toggleCampaign}
            aria-pressed={campaignOn}
            style={{
              width: 46,
              height: 26,
              borderRadius: 20,
              border: "none",
              background: campaignOn ? "#16a34a" : "rgba(255,255,255,.22)",
              position: "relative",
              transition: "background .2s",
              flex: "none",
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
              gridTemplateColumns: "1.6fr .9fr .9fr .9fr",
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
            <div>Impressions</div>
            <div>Clicks</div>
            <div>CTR</div>
          </div>
          {campaigns.map((c, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "1.6fr .9fr .9fr .9fr",
                gap: 12,
                alignItems: "center",
                padding: "14px 20px",
                borderTop: "1px solid #f4f5f7",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}
              >
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
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: c.statusDot,
                      }}
                    />
                    {c.channel} · {c.statusLabel}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 13, color: "#3f444d", fontFeatureSettings: "'tnum'" }}>
                {c.impressions}
              </div>
              <div style={{ fontSize: 13, color: "#3f444d", fontFeatureSettings: "'tnum'" }}>
                {c.clicks}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "#15a05a",
                  fontWeight: 540,
                  fontFeatureSettings: "'tnum'",
                }}
              >
                {c.ctr}
              </div>
            </div>
          ))}
        </div>

        {/* Quick setup */}
        <div style={{ ...card, padding: "18px 20px", height: "fit-content" }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
            Quick setup
          </div>
          <div
            style={{
              fontSize: 12.5,
              color: "#868d98",
              marginBottom: 18,
              lineHeight: 1.5,
            }}
          >
            Configure the message connecting users receive.
          </div>
          <label
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 540,
              color: "#3f444d",
              marginBottom: 6,
            }}
          >
            Channel handle
          </label>
          <FX
            as="input"
            defaultValue="@proxy_news"
            s={{
              width: "100%",
              height: 38,
              padding: "0 12px",
              border: "1px solid #e7e9ee",
              borderRadius: 9,
              fontSize: 13.5,
              fontFamily: mono.fontFamily,
              marginBottom: 14,
              outline: "none",
              background: "#fcfcfd",
            }}
            focus={inputFocus}
          />
          <label
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 540,
              color: "#3f444d",
              marginBottom: 6,
            }}
          >
            Promo message
          </label>
          <FX
            as="textarea"
            defaultValue="📢 Stay updated — join @proxy_news for status & faster servers."
            s={{
              width: "100%",
              height: 78,
              padding: "10px 12px",
              border: "1px solid #e7e9ee",
              borderRadius: 9,
              fontSize: 13,
              lineHeight: 1.5,
              resize: "none",
              outline: "none",
              fontFamily: "var(--font-geist-sans), sans-serif",
              background: "#fcfcfd",
              color: "#2b2f37",
            }}
            focus={inputFocus}
          />
          <label
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 540,
              color: "#3f444d",
              margin: "14px 0 6px",
            }}
          >
            Frequency
          </label>
          <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
            {FREQ_OPTS.map((f) => {
              const on = freq === f;
              return (
                <button
                  key={f}
                  onClick={() => setFreq(f)}
                  style={{
                    flex: 1,
                    height: 34,
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 540,
                    border: `1px solid ${on ? "#2d68f5" : "#e7e9ee"}`,
                    background: on ? "#eef3fe" : "#fff",
                    color: on ? "#2d68f5" : "#5a616b",
                    transition: "all .14s",
                  }}
                >
                  {f}
                </button>
              );
            })}
          </div>
          <FX
            s={{
              width: "100%",
              height: 40,
              border: "none",
              borderRadius: 9,
              background: "#111317",
              color: "#fff",
              fontSize: 13.5,
              fontWeight: 560,
              transition: "background .14s",
            }}
            hover={{ background: "#23262d" }}
          >
            Save campaign
          </FX>
        </div>
      </div>
    </div>
  );
}
