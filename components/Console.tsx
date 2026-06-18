"use client";

import { useEffect, useRef, useState } from "react";
import { NAV_DEF, REGION_META, SCREEN_TITLES, fb, fn } from "@/lib/data";
import { useDashboard } from "@/lib/useDashboard";
import { mono } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { FX } from "@/components/FX";
import { Overview } from "@/components/screens/Overview";
import { Connections } from "@/components/screens/Connections";
import { Geography } from "@/components/screens/Geography";
import { Campaigns } from "@/components/screens/Campaigns";
import { Settings } from "@/components/screens/Settings";

export default function Console() {
  const { authed, state, loginError, login, logout } = useDashboard();
  const [pw, setPw] = useState("");
  const [screen, setScreen] = useState("overview");
  const [search, setSearch] = useState("");
  const [selectedIp, setSelectedIp] = useState<string | null>(null);
  const [secretRevealed, setSecretRevealed] = useState(false);
  const [toast, setToast] = useState("");
  const [connFilter, setConnFilter] = useState("all");
  const [freq, setFreq] = useState("30 min");
  const [campaignOn, setCampaignOn] = useState(true);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Seed the campaign toggle from server state once, on first load.
  const campaignSeeded = useRef(false);
  useEffect(() => {
    if (state && !campaignSeeded.current) {
      campaignSeeded.current = true;
      setCampaignOn(state.campaignOn);
    }
  }, [state]);

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 1900);
  }

  function copy(text: string, msg: string) {
    try {
      navigator.clipboard.writeText(text);
    } catch {
      /* clipboard unavailable */
    }
    showToast(msg);
  }

  async function doLogin() {
    await login(pw);
  }

  function goScreen(id: string) {
    setScreen(id);
    setSelectedIp(null);
  }

  const onCopyLink = () =>
    copy(state ? state.server.tgLink : "", "Connection link copied");

  // ---- Login -------------------------------------------------------------
  if (!authed) {
    const pwBorder = loginError ? "#e5a3a3" : "#e3e6eb";
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          background: "radial-gradient(120% 120% at 50% -10%,#eef2fb 0%,#f5f6f8 46%)",
        }}
      >
        <div style={{ width: "100%", maxWidth: 392, animation: "mtgFade .5s ease both" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 11,
              marginBottom: 26,
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "#111317",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                boxShadow: "0 4px 14px rgba(17,19,23,.22)",
              }}
            >
              <Icon name="logo" size={20} />
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-.02em" }}>
              MTProxy
              <span style={{ color: "#9aa0aa", fontWeight: 500 }}> Console</span>
            </div>
          </div>
          <div
            style={{
              background: "#fff",
              border: "1px solid #e9ebf0",
              borderRadius: 16,
              padding: "28px 26px 24px",
              boxShadow: "0 1px 2px rgba(16,24,40,.04),0 12px 36px rgba(16,24,40,.06)",
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-.02em", marginBottom: 4 }}>
              Sign in
            </div>
            <div style={{ fontSize: 13.5, color: "#767c87", marginBottom: 22 }}>
              Enter the admin password to monitor your proxy.
            </div>
            <label
              style={{
                display: "block",
                fontSize: 12.5,
                fontWeight: 500,
                color: "#3f444d",
                marginBottom: 7,
              }}
            >
              Admin password
            </label>
            <div style={{ position: "relative", marginBottom: 6 }}>
              <FX
                as="input"
                type="password"
                value={pw}
                onChange={(e) => {
                  setPw((e.target as HTMLInputElement).value);
                }}
                onKeyDown={(e) => {
                  if ((e as React.KeyboardEvent).key === "Enter") doLogin();
                }}
                placeholder="••••••••••"
                s={{
                  width: "100%",
                  height: 42,
                  padding: "0 14px",
                  border: `1px solid ${pwBorder}`,
                  borderRadius: 10,
                  fontSize: 14,
                  color: "#0c0d10",
                  outline: "none",
                  transition: "border-color .15s,box-shadow .15s",
                  background: "#fcfcfd",
                }}
                focus={{ border: "1px solid #2d68f5", boxShadow: "0 0 0 3px rgba(45,104,245,.13)" }}
              />
            </div>
            {loginError && (
              <div
                style={{
                  fontSize: 12.5,
                  color: "#e5484d",
                  margin: "2px 0 4px",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <Icon name="alert" size={14} sw={2} />
                <span>Incorrect password. Try again.</span>
              </div>
            )}
            <FX
              onClick={doLogin}
              s={{
                width: "100%",
                height: 42,
                marginTop: 14,
                border: "none",
                borderRadius: 10,
                background: "#111317",
                color: "#fff",
                fontSize: 14,
                fontWeight: 560,
                letterSpacing: "-.01em",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
                transition: "background .15s,transform .06s",
              }}
              hover={{ background: "#23262d" }}
              active={{ transform: "scale(.99)" }}
            >
              Sign in <Icon name="arrow" size={16} sw={2} />
            </FX>
            <div
              style={{
                marginTop: 16,
                paddingTop: 15,
                borderTop: "1px solid #f0f1f4",
                fontSize: 12,
                color: "#9aa0aa",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Icon name="lock" size={13} sw={1.8} />
              <span>
                Demo password:{" "}
                <span style={{ ...mono, color: "#5a616b" }}>admin</span> — swap for an
                env secret on deploy.
              </span>
            </div>
          </div>
          <div style={{ textAlign: "center", marginTop: 18, fontSize: 12, color: "#aab0ba" }}>
            FakeTLS MTProto proxy · self-hosted
          </div>
        </div>
      </div>
    );
  }

  // ---- Connecting (authed, no state yet) ---------------------------------
  if (!state) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
          background: "radial-gradient(120% 120% at 50% -10%,#eef2fb 0%,#f5f6f8 46%)",
        }}
      >
        <span style={{ position: "relative", width: 8, height: 8 }}>
          <span
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background: "#2d68f5",
              animation: "mtgPulse 1.6s ease-in-out infinite",
            }}
          />
        </span>
        <div style={{ fontSize: 13.5, color: "#767c87" }}>Connecting to proxy…</div>
      </div>
    );
  }

  // ---- App ---------------------------------------------------------------
  const sel = selectedIp
    ? state.connections.connections.find((d) => d.ip === selectedIp) ?? null
    : null;
  const [title, subtitle] = SCREEN_TITLES[screen];

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar */}
      <aside
        style={{
          width: 250,
          flex: "none",
          background: "#fff",
          borderRight: "1px solid #ebedf1",
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          position: "sticky",
          top: 0,
        }}
      >
        <div style={{ padding: "20px 18px 16px", display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              background: "#111317",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              flex: "none",
            }}
          >
            <Icon name="logo" size={20} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 600, letterSpacing: "-.02em", lineHeight: 1.1 }}>
              MTProxy
            </div>
            <div style={{ fontSize: 11, color: "#9aa0aa", lineHeight: 1.3 }}>Proxy Console</div>
          </div>
        </div>

        <nav style={{ padding: "6px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV_DEF.map((item) => {
            const act = screen === item.id;
            const badge =
              item.id === "connections"
                ? fn(state.connections.total)
                : item.id === "campaigns" && campaignOn
                  ? "ON"
                  : "";
            const badgeColor = item.id === "campaigns" ? "#15803d" : "#5a616b";
            const badgeBg = item.id === "campaigns" ? "#e7f6ee" : "#f1f3f6";
            return (
              <FX
                key={item.id}
                onClick={() => goScreen(item.id)}
                s={{
                  display: "flex",
                  alignItems: "center",
                  gap: 11,
                  width: "100%",
                  height: 38,
                  padding: "0 12px",
                  border: "none",
                  borderRadius: 9,
                  fontSize: 13.5,
                  fontWeight: act ? 560 : 500,
                  color: act ? "#111317" : "#5a616b",
                  background: act ? "#f2f4f7" : "transparent",
                  textAlign: "left",
                  transition: "background .14s",
                }}
                hover={{ background: act ? "#f2f4f7" : "#f7f8fa", color: "#111317" }}
              >
                <span
                  style={{
                    display: "flex",
                    width: 18,
                    height: 18,
                    color: act ? "#111317" : "#9aa0aa",
                  }}
                >
                  <Icon name={item.icon} size={18} />
                </span>
                <span style={{ flex: 1, textAlign: "left" }}>{item.label}</span>
                {badge && (
                  <span
                    style={{
                      ...mono,
                      fontSize: 11,
                      fontWeight: 500,
                      color: badgeColor,
                      background: badgeBg,
                      padding: "1px 7px",
                      borderRadius: 20,
                    }}
                  >
                    {badge}
                  </span>
                )}
              </FX>
            );
          })}
        </nav>

        <div style={{ marginTop: "auto", padding: "14px 16px", borderTop: "1px solid #f0f1f4" }}>
          <div
            style={{
              background: "#f7f8fa",
              border: "1px solid #edeff3",
              borderRadius: 11,
              padding: "11px 12px",
              marginBottom: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}>
              <span style={{ position: "relative", width: 7, height: 7, flex: "none" }}>
                <span
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "50%",
                    background: "#16a34a",
                    animation: "mtgPulse 2s ease-in-out infinite",
                  }}
                />
              </span>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: "#15803d", letterSpacing: ".01em" }}>
                PROXY ONLINE
              </span>
            </div>
            <div style={{ ...mono, fontSize: 11, color: "#5a616b", lineHeight: 1.5 }}>
              {state.server.ip}
              <span style={{ color: "#aab0ba" }}>:</span>
              {state.server.port}
            </div>
            <div style={{ fontSize: 10.5, color: "#9aa0aa", marginTop: 2 }}>
              Uptime {state.server.uptime}
            </div>
          </div>
          <FX
            onClick={() => {
              logout();
              setPw("");
              setScreen("overview");
              setSelectedIp(null);
            }}
            s={{
              width: "100%",
              height: 36,
              border: "1px solid #e9ebf0",
              borderRadius: 9,
              background: "#fff",
              color: "#5a616b",
              fontSize: 13,
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
              transition: "background .14s,color .14s",
            }}
            hover={{ background: "#fafbfc", color: "#e5484d" }}
          >
            <Icon name="logout" size={16} /> Sign out
          </FX>
        </div>
      </aside>

      {/* Main */}
      <main
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          overflow: "hidden",
        }}
      >
        <header
          style={{
            flex: "none",
            height: 64,
            borderBottom: "1px solid #ebedf1",
            background: "rgba(245,246,248,.86)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 32px",
            position: "sticky",
            top: 0,
            zIndex: 5,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-.02em", lineHeight: 1.15 }}>
              {title}
            </div>
            <div style={{ fontSize: 12.5, color: "#868d98", lineHeight: 1.3 }}>{subtitle}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "none" }}>
            {state.source === "demo" ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  height: 32,
                  padding: "0 11px",
                  borderRadius: 8,
                  background: "#f3f4f6",
                  fontSize: 12,
                  color: "#9aa0aa",
                  whiteSpace: "nowrap",
                  flex: "none",
                }}
              >
                Demo data
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  height: 32,
                  padding: "0 11px",
                  border: "1px solid #e7e9ee",
                  borderRadius: 8,
                  background: "#fff",
                  fontSize: 12,
                  color: "#5a616b",
                  whiteSpace: "nowrap",
                  flex: "none",
                }}
              >
                <span style={{ position: "relative", width: 6, height: 6 }}>
                  <span
                    style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: "50%",
                      background: "#2d68f5",
                      animation: "mtgPulse 1.6s ease-in-out infinite",
                    }}
                  />
                </span>
                Live · just now
              </div>
            )}
            <FX
              onClick={onCopyLink}
              s={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                height: 34,
                padding: "0 14px",
                border: "none",
                borderRadius: 8,
                background: "#111317",
                color: "#fff",
                fontSize: 13,
                fontWeight: 540,
                whiteSpace: "nowrap",
                transition: "background .14s,transform .06s",
              }}
              hover={{ background: "#23262d" }}
              active={{ transform: "scale(.98)" }}
            >
              <Icon name="copy" size={15} /> Copy connection link
            </FX>
          </div>
        </header>

        <div style={{ flex: 1, overflowY: "auto", padding: "26px 32px 48px" }}>
          {screen === "overview" && (
            <Overview
              data={state.overview}
              onOpenConn={setSelectedIp}
              goGeo={() => goScreen("geography")}
              goConn={() => goScreen("connections")}
            />
          )}
          {screen === "connections" && (
            <Connections
              connections={state.connections.connections}
              search={search}
              setSearch={setSearch}
              connFilter={connFilter}
              setConnFilter={setConnFilter}
              onOpenConn={setSelectedIp}
            />
          )}
          {screen === "geography" && <Geography data={state.geography} />}
          {screen === "campaigns" && (
            <Campaigns
              campaigns={state.campaigns}
              campaignOn={campaignOn}
              toggleCampaign={() => setCampaignOn((v) => !v)}
              freq={freq}
              setFreq={setFreq}
            />
          )}
          {screen === "settings" && (
            <Settings
              server={state.server}
              total={state.connections.total}
              secretRevealed={secretRevealed}
              toggleSecret={() => setSecretRevealed((v) => !v)}
              onCopySecret={() => copy(state.server.secret ?? "", "Secret copied")}
              onCopyLink={onCopyLink}
            />
          )}
        </div>
      </main>

      {/* Detail drawer */}
      {sel && (
        <div style={{ position: "fixed", inset: 0, zIndex: 40, display: "flex", justifyContent: "flex-end" }}>
          <div
            onClick={() => setSelectedIp(null)}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(17,19,23,.28)",
              backdropFilter: "blur(1px)",
              animation: "mtgFade .2s ease",
            }}
          />
          <div
            style={{
              position: "relative",
              width: 420,
              maxWidth: "92vw",
              height: "100%",
              background: "#fff",
              borderLeft: "1px solid #e7e9ee",
              boxShadow: "-12px 0 40px rgba(16,24,40,.12)",
              animation: "mtgDrawer .26s cubic-bezier(.32,.72,0,1)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "18px 22px",
                borderBottom: "1px solid #f0f1f4",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                <span style={{ position: "relative", width: 9, height: 9 }}>
                  <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: sel.dotColor }} />
                  <span
                    style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: "50%",
                      background: sel.dotColor,
                      animation: "mtgRing 1.8s ease-out infinite",
                    }}
                  />
                </span>
                <div style={{ ...mono, fontSize: 15, fontWeight: 540, color: "#23262d" }}>{sel.ip}</div>
              </div>
              <FX
                onClick={() => setSelectedIp(null)}
                s={{
                  width: 32,
                  height: 32,
                  border: "none",
                  borderRadius: 8,
                  background: "#f5f6f8",
                  color: "#5a616b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background .14s",
                }}
                hover={{ background: "#ebedf1" }}
              >
                <Icon name="close" size={17} sw={2} />
              </FX>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 22px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: 540,
                    color: sel.statusColor,
                    background: sel.statusBg,
                    padding: "3px 11px",
                    borderRadius: 20,
                  }}
                >
                  {sel.statusLabel}
                </span>
                <span style={{ fontSize: 12.5, color: "#9aa0aa" }}>Connected {sel.dur} ago</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
                {[
                  { icon: "down", label: "Downloaded", val: sel.down },
                  { icon: "up", label: "Uploaded", val: sel.up },
                ].map((m, i) => (
                  <div
                    key={i}
                    style={{
                      background: "#f7f8fa",
                      border: "1px solid #eef0f3",
                      borderRadius: 11,
                      padding: "13px 15px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        color: "#9aa0aa",
                        marginBottom: 7,
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                      }}
                    >
                      <Icon name={m.icon} size={13} sw={2} /> {m.label}
                    </div>
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 620,
                        letterSpacing: "-.02em",
                        color: "#23262d",
                        fontFeatureSettings: "'tnum'",
                      }}
                    >
                      {m.val}
                    </div>
                  </div>
                ))}
              </div>

              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#9aa0aa",
                  letterSpacing: ".04em",
                  textTransform: "uppercase",
                  marginBottom: 10,
                }}
              >
                Session
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  border: "1px solid #eef0f3",
                  borderRadius: 11,
                  overflow: "hidden",
                  marginBottom: 18,
                }}
              >
                {[
                  { label: "Location", value: `${sel.city}, ${sel.country}`, mono: false },
                  { label: "Country code", value: sel.code, mono: true },
                  { label: "Region", value: REGION_META[sel.region][0], mono: false },
                  { label: "Client", value: sel.client, mono: false },
                  { label: "Total transfer", value: fb(sel.rawDown + sel.rawUp), mono: true },
                  {
                    label: "Connected since",
                    value: new Date(
                      state.generatedAt - sel.since * 1000,
                    ).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    }),
                    mono: true,
                  },
                  {
                    label: "Session ID",
                    value: "sess_" + sel.ip.split(".").join("") + sel.idx,
                    mono: true,
                    small: true,
                  },
                ].map((r, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "11px 15px",
                      borderTop: i === 0 ? "none" : "1px solid #f4f5f7",
                      background: "#fff",
                    }}
                  >
                    <span style={{ fontSize: 12.5, color: "#868d98" }}>{r.label}</span>
                    <span
                      style={{
                        fontSize: r.small ? 11.5 : 12.5,
                        color: "#23262d",
                        fontWeight: 500,
                        textAlign: "right",
                        ...(r.mono ? mono : {}),
                      }}
                    >
                      {r.value}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <FX
                  s={{
                    flex: 1,
                    height: 38,
                    border: "1px solid #e7e9ee",
                    borderRadius: 9,
                    background: "#fff",
                    fontSize: 13,
                    fontWeight: 540,
                    color: "#3f444d",
                    transition: "background .14s",
                  }}
                  hover={{ background: "#f7f8fa" }}
                >
                  View live traffic
                </FX>
                <FX
                  s={{
                    flex: 1,
                    height: 38,
                    border: "1px solid #f1c2c2",
                    borderRadius: 9,
                    background: "#fff",
                    fontSize: 13,
                    fontWeight: 560,
                    color: "#e5484d",
                    transition: "background .14s",
                  }}
                  hover={{ background: "#fdf3f3" }}
                >
                  Block IP
                </FX>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 60,
            display: "flex",
            alignItems: "center",
            gap: 9,
            height: 42,
            padding: "0 18px",
            background: "#111317",
            color: "#fff",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 500,
            boxShadow: "0 8px 28px rgba(16,24,40,.28)",
            animation: "mtgToast .26s ease",
          }}
        >
          <Icon name="check" size={16} sw={2.2} /> {toast}
        </div>
      )}
    </div>
  );
}
