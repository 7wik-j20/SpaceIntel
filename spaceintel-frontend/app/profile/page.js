"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../context/LanguageContext";
import LanguageSelector from "../components/LanguageSelector";

const DEFAULT_SETTINGS = {
  language: "en",
  notifications: true,
  autoExport: false,
  fontSize: "medium",
  responseLength: "balanced",
};

const FONT_SIZE_MAP = { small: "14px", medium: "16px", large: "18px" };
const META_FONT_SIZE_MAP = { small: "10px", medium: "11px", large: "12px" };
const TITLE_FONT_SIZE_MAP = { small: "22px", medium: "24px", large: "28px" };
const LANGUAGE_NAME_TO_CODE = {
  English: "en",
  Hindi: "hi",
  Telugu: "te",
  Tamil: "ta",
  Kannada: "kn",
  Malayalam: "ml",
  Bengali: "bn",
};

function StarField() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let animId;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    const stars = Array.from({ length: 250 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.2 + 0.1,
      o: Math.random() * 0.6 + 0.2,
      t: Math.random() * Math.PI * 2,
      s: Math.random() * 0.006 + 0.002,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach(s => {
        s.t += s.s;
        const o = s.o * (0.6 + 0.4 * Math.sin(s.t));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${o})`;
        ctx.fill();
      });
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }} />;
}

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState("personal");
  const [user, setUser] = useState(null);
  const [docs, setDocs] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const router = useRouter();
  const { t } = useTranslation();
  const { changeLanguage } = useLanguage();

  const sidebarItems = [
    { key: "personal", label: t("profile_personal_details"), icon: "◎" },
    { key: "library", label: t("nav_library"), icon: "▦" },
    { key: "settings", label: t("nav_settings"), icon: "⚙" },
  ];

  const getToken = () => localStorage.getItem("token");

  const openPdf = (filename) => {
    const token = getToken();
    window.open(
      `http://localhost:8000/documents/pdf/${encodeURIComponent(filename)}?token=${token}`,
      "_blank"
    );
  };

  useEffect(() => {
    const fallbackLanguage = localStorage.getItem("spaceintel_language") || "en";

    const stored = localStorage.getItem("user");
    if (stored) {
      setUser(JSON.parse(stored));
    } else {
      const token = getToken();
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          setUser({ email: payload.email, username: payload.username || payload.email?.split("@")[0] });
        } catch {}
      }
    }

    const savedSettings = localStorage.getItem("spaceintel_settings");
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        const normalizedLanguage = LANGUAGE_NAME_TO_CODE[parsed.language] || parsed.language || fallbackLanguage;
        setSettings({ ...DEFAULT_SETTINGS, ...parsed, language: normalizedLanguage });
      } catch {
        setSettings({ ...DEFAULT_SETTINGS, language: fallbackLanguage });
      }
    } else {
      setSettings({ ...DEFAULT_SETTINGS, language: fallbackLanguage });
    }

    const token = getToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    axios.get("http://localhost:8000/documents/list", { headers })
      .then(res => setDocs(res.data))
      .catch(() => setDocs([]));
  }, []);

  const handleLogout = () => {
    if (!window.confirm(t("logout_confirm"))) return;
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("spaceintel_settings");
    router.push("/");
  };

  const handleSaveSettings = async () => {
    await changeLanguage(settings.language);
    localStorage.setItem("spaceintel_language", settings.language);
    localStorage.setItem("spaceintel_settings", JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent("spaceintel:settings-updated", { detail: settings }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const labelStyle = {
    fontFamily: "JetBrains Mono, monospace",
    fontSize: "10px",
    letterSpacing: "2px",
    color: "rgba(0,212,255,0.6)",
    display: "block",
    marginBottom: "8px",
  };

  const valueStyle = {
    fontFamily: "DM Sans, sans-serif",
    fontSize: "15px",
    color: "rgba(255,255,255,0.8)",
  };

  const activeFontSize = FONT_SIZE_MAP[settings.fontSize] || FONT_SIZE_MAP.medium;
  const activeMetaFontSize = META_FONT_SIZE_MAP[settings.fontSize] || META_FONT_SIZE_MAP.medium;
  const activeTitleFontSize = TITLE_FONT_SIZE_MAP[settings.fontSize] || TITLE_FONT_SIZE_MAP.medium;

  return (
    <div className="min-h-screen flex" style={{ background: "#03060e" }}>
      <StarField />
      <div className="fixed inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse at 80% 10%, rgba(0,100,160,0.08) 0%, transparent 50%), radial-gradient(ellipse at 10% 90%, rgba(80,20,120,0.08) 0%, transparent 50%)",
        zIndex: 0,
      }} />

      {/* Profile Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 z-50 flex flex-col"
        style={{ background: "rgba(3,6,14,0.97)", borderRight: "1px solid rgba(0,212,255,0.08)" }}>

        {/* Logo */}
        <div className="p-6" style={{ borderBottom: "1px solid rgba(0,212,255,0.08)" }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-cyan-400 text-sm"
              style={{ background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.2)" }}>✦</div>
            <div>
              <h1 className="font-bold text-white tracking-widest text-sm"
                style={{ fontFamily: "Orbitron, sans-serif" }}>{t("app_name").toUpperCase()}</h1>
              <p className="text-xs tracking-wider"
                style={{ color: "rgba(0,212,255,0.4)", fontFamily: "JetBrains Mono, monospace" }}>
                {t("nav_profile").toUpperCase()}
              </p>
            </div>
          </div>
        </div>

        {/* Avatar */}
        <div className="px-6 py-6 flex flex-col items-center"
          style={{ borderBottom: "1px solid rgba(0,212,255,0.08)" }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3 text-2xl"
            style={{ background: "rgba(123,95,255,0.1)", border: "2px solid rgba(123,95,255,0.3)" }}>👤</div>
          <p className="text-white text-sm font-semibold tracking-wide"
            style={{ fontFamily: "Orbitron, sans-serif" }}>
            {user?.username || "User"}
          </p>
          <p className="text-xs mt-1"
            style={{ color: "rgba(255,255,255,0.3)", fontFamily: "DM Sans, sans-serif" }}>
            {user?.email || ""}
          </p>
          <div className="mt-3 px-3 py-1 rounded-full text-xs"
            style={{ background: "rgba(0,230,118,0.08)", border: "1px solid rgba(0,230,118,0.2)", color: "#00e676", fontFamily: "JetBrains Mono, monospace", letterSpacing: "1px" }}>
            {t("profile_active").toUpperCase()}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {sidebarItems.map((item) => (
            <button key={item.key} onClick={() => setActiveTab(item.key)}
              className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 w-full text-left"
              style={{
                background: activeTab === item.key ? "rgba(0,212,255,0.08)" : "transparent",
                border: activeTab === item.key ? "1px solid rgba(0,212,255,0.2)" : "1px solid transparent",
                color: activeTab === item.key ? "#00d4ff" : "rgba(255,255,255,0.35)",
              }}
              onMouseEnter={e => { if (activeTab !== item.key) { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}}
              onMouseLeave={e => { if (activeTab !== item.key) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.35)"; }}}>
              <span className="text-base">{item.icon}</span>
              <span className="text-sm font-medium tracking-wider">{item.label}</span>
              {activeTab === item.key && <div className="ml-auto w-1 h-1 rounded-full bg-cyan-400" />}
            </button>
          ))}
        </nav>

        {/* Back + Logout */}
        <div className="p-3 space-y-2" style={{ borderTop: "1px solid rgba(0,212,255,0.08)" }}>
          <button onClick={() => router.push("/home")}
            className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 w-full"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}>
            <span>←</span>
            <span className="text-sm tracking-wider">{t("profile_back_to_app")}</span>
          </button>
          <button onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 w-full"
            style={{ background: "rgba(255,82,82,0.05)", border: "1px solid rgba(255,82,82,0.15)", color: "#ff5252" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,82,82,0.12)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,82,82,0.05)"}>
            <span>⏻</span>
            <span className="text-sm tracking-wider" style={{ fontFamily: "JetBrains Mono, monospace" }}>{t("nav_logout").toUpperCase()}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 flex-1 relative z-10 px-10 py-10">

        {/* ── PERSONAL DETAILS ── */}
        {activeTab === "personal" && (
          <div className="max-w-2xl">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400"
                  style={{ animation: "pulse 1.5s infinite", boxShadow: "0 0 6px rgba(0,212,255,0.8)" }} />
                <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: activeMetaFontSize, letterSpacing: "3px", color: "rgba(0,212,255,0.6)" }}>
                  {t("profile_account_info")}
                </span>
              </div>
              <h2 style={{ fontFamily: "Orbitron, sans-serif", fontSize: activeTitleFontSize, fontWeight: 900, color: "#fff", letterSpacing: "0.1em" }}>
                {t("profile_personal_details").toUpperCase()}
              </h2>
            </div>

            <div className="rounded-2xl p-8 space-y-6"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
              {[
                { label: t("profile_name"), value: user?.username || "—" },
                { label: t("profile_email"), value: user?.email || "—" },
                { label: t("profile_account_type"), value: t("profile_researcher") },
                { label: t("profile_member_since"), value: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long" }) },
                { label: t("profile_status"), value: t("profile_active") },
              ].map((item) => (
                <div key={item.label} className="pb-6"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <label style={labelStyle}>{item.label}</label>
                  <p style={item.label === t("profile_status") ? { ...valueStyle, color: "#00e676" } : valueStyle}>
                    {item.value}
                  </p>
                </div>
              ))}
              <div>
                <label style={labelStyle}>{t("profile_documents_indexed")}</label>
                <p style={{ ...valueStyle, color: "#00d4ff" }}>{docs.length} {docs.length === 1 ? "document" : "documents"}</p>
              </div>
            </div>
          </div>
        )}

        {/* ── LIBRARY ── */}
        {activeTab === "library" && (
          <div className="max-w-3xl">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400"
                  style={{ animation: "pulse 1.5s infinite", boxShadow: "0 0 6px rgba(0,212,255,0.8)" }} />
                <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", letterSpacing: "3px", color: "rgba(0,212,255,0.6)" }}>
                  UPLOADED DOCUMENTS
                </span>
              </div>
              <h2 style={{ fontFamily: "Orbitron, sans-serif", fontSize: "24px", fontWeight: 900, color: "#fff", letterSpacing: "0.1em" }}>
                {t("library_title").toUpperCase()}
              </h2>
            </div>

            {docs.length === 0 ? (
              <div className="rounded-2xl p-16 text-center"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="text-4xl mb-4" style={{ opacity: 0.1 }}>▦</div>
                <p style={{ color: "rgba(255,255,255,0.3)", fontFamily: "DM Sans, sans-serif" }}>
                  {t("library_empty")}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {docs.map((doc, i) => (
                  <div key={i} className="rounded-2xl px-6 py-4 flex items-center justify-between transition-all"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
                    onMouseEnter={e => e.currentTarget.style.border = "1px solid rgba(255,255,255,0.12)"}
                    onMouseLeave={e => e.currentTarget.style.border = "1px solid rgba(255,255,255,0.06)"}>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: "rgba(0,212,255,0.06)", border: "1px solid rgba(0,212,255,0.15)" }}>
                        <span style={{ fontSize: "16px" }}>📄</span>
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium truncate max-w-xs">{doc.filename}</p>
                        <div className="flex gap-3 mt-1">
                          <span className="text-xs" style={{ color: "rgba(255,255,255,0.25)", fontFamily: "JetBrains Mono, monospace" }}>
                            {doc.total_pages} pages
                          </span>
                          <span style={{ color: "rgba(255,255,255,0.1)" }}>·</span>
                          <span className="text-xs" style={{ color: "rgba(255,255,255,0.25)", fontFamily: "JetBrains Mono, monospace" }}>
                            {doc.total_chunks} chunks
                          </span>
                          {doc.metadata?.agency && doc.metadata.agency !== "Unknown" && (
                            <>
                              <span style={{ color: "rgba(255,255,255,0.1)" }}>·</span>
                              <span className="text-xs" style={{ color: "rgba(0,212,255,0.5)", fontFamily: "JetBrains Mono, monospace" }}>
                                {doc.metadata.agency}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => openPdf(doc.filename)}
                      className="px-4 py-2 rounded-lg text-xs transition-all flex-shrink-0"
                      style={{ background: "rgba(0,212,255,0.05)", border: "1px solid rgba(0,212,255,0.15)", color: "#00d4ff", fontFamily: "JetBrains Mono, monospace" }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(0,212,255,0.12)"}
                      onMouseLeave={e => e.currentTarget.style.background = "rgba(0,212,255,0.05)"}>
                      {t("chat_sources").toUpperCase()} →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── SETTINGS ── */}
        {activeTab === "settings" && (
          <div className="max-w-2xl">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400"
                  style={{ animation: "pulse 1.5s infinite", boxShadow: "0 0 6px rgba(0,212,255,0.8)" }} />
                <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", letterSpacing: "3px", color: "rgba(0,212,255,0.6)" }}>
                  {t("profile_preferences")}
                </span>
              </div>
              <h2 style={{ fontFamily: "Orbitron, sans-serif", fontSize: "24px", fontWeight: 900, color: "#fff", letterSpacing: "0.1em" }}>
                {t("settings_title").toUpperCase()}
              </h2>
            </div>

            <div className="rounded-2xl p-8 space-y-8"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>

              <div className="rounded-2xl p-5"
                style={{ background: "rgba(123,95,255,0.06)", border: "1px solid rgba(123,95,255,0.14)" }}>
                <p style={{ ...labelStyle, marginBottom: "10px", fontSize: activeMetaFontSize }}>{t("profile_live_preview")}</p>
                <p style={{ fontSize: activeFontSize, color: "rgba(255,255,255,0.88)", fontFamily: "DM Sans, sans-serif", lineHeight: 1.7 }}>
                  {t("profile_live_preview_desc")}
                </p>
              </div>

              {/* Response Length */}
              <div>
                <label style={{ ...labelStyle, fontSize: activeMetaFontSize }}>{t("profile_response_length")}</label>
                <div className="flex gap-3 mt-2">
                  {["concise", "balanced", "detailed"].map(opt => (
                    <button key={opt} onClick={() => setSettings(s => ({ ...s, responseLength: opt }))}
                      className="flex-1 py-2.5 rounded-xl text-xs transition-all"
                      style={{
                        background: settings.responseLength === opt ? "rgba(0,212,255,0.12)" : "rgba(255,255,255,0.03)",
                        border: settings.responseLength === opt ? "1px solid rgba(0,212,255,0.4)" : "1px solid rgba(255,255,255,0.08)",
                        color: settings.responseLength === opt ? "#00d4ff" : "rgba(255,255,255,0.4)",
                        fontFamily: "JetBrains Mono, monospace",
                        fontSize: activeMetaFontSize,
                        letterSpacing: "1px",
                      }}>
                      {opt.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Size */}
              <div>
                <label style={{ ...labelStyle, fontSize: activeMetaFontSize }}>{t("profile_font_size")}</label>
                <div className="flex gap-3 mt-2">
                  {["small", "medium", "large"].map(opt => (
                    <button key={opt} onClick={() => setSettings(s => ({ ...s, fontSize: opt }))}
                      className="flex-1 py-2.5 rounded-xl text-xs transition-all"
                      style={{
                        background: settings.fontSize === opt ? "rgba(123,95,255,0.12)" : "rgba(255,255,255,0.03)",
                        border: settings.fontSize === opt ? "1px solid rgba(123,95,255,0.4)" : "1px solid rgba(255,255,255,0.08)",
                        color: settings.fontSize === opt ? "#7b5fff" : "rgba(255,255,255,0.4)",
                        fontFamily: "JetBrains Mono, monospace",
                        fontSize: activeMetaFontSize,
                        letterSpacing: "1px",
                      }}>
                      {opt.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Language */}
              <div>
                <label style={{ ...labelStyle, fontSize: activeMetaFontSize }}>{t("settings_language").toUpperCase()}</label>
                <LanguageSelector
                  value={settings.language}
                  applyImmediately={false}
                  onChange={(nextLanguage) => setSettings((s) => ({ ...s, language: nextLanguage }))}
                  className="w-full px-4 py-3 rounded-xl text-white focus:outline-none transition-all mt-1"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", fontSize: activeFontSize, fontFamily: "DM Sans, sans-serif", color: "rgba(255,255,255,0.7)" }}
                />
              </div>

              {/* Toggles */}
              {[
                { key: "notifications", label: t("profile_notifications"), desc: t("profile_notifications_desc") },
                { key: "autoExport", label: t("profile_auto_export"), desc: t("profile_auto_export_desc") },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between pb-6"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <div>
                    <label style={{ ...labelStyle, marginBottom: "4px", fontSize: activeMetaFontSize }}>{item.label}</label>
                    <p style={{ fontSize: activeFontSize, color: "rgba(255,255,255,0.25)", fontFamily: "DM Sans, sans-serif" }}>
                      {item.desc}
                    </p>
                  </div>
                  <button onClick={() => setSettings(s => ({ ...s, [item.key]: !s[item.key] }))}
                    className="relative w-12 h-6 rounded-full transition-all duration-300 flex-shrink-0"
                    style={{
                      background: settings[item.key] ? "rgba(0,212,255,0.3)" : "rgba(255,255,255,0.1)",
                      border: settings[item.key] ? "1px solid rgba(0,212,255,0.5)" : "1px solid rgba(255,255,255,0.15)",
                    }}>
                    <div className="absolute top-0.5 w-5 h-5 rounded-full transition-all duration-300"
                      style={{
                        background: settings[item.key] ? "#00d4ff" : "rgba(255,255,255,0.3)",
                        left: settings[item.key] ? "24px" : "2px",
                      }} />
                  </button>
                </div>
              ))}

              {/* Save */}
              <button onClick={handleSaveSettings}
                className="w-full py-4 rounded-xl font-semibold transition-all duration-300"
                style={{
                  background: saved ? "rgba(0,230,118,0.1)" : "rgba(0,212,255,0.08)",
                  border: saved ? "1px solid rgba(0,230,118,0.3)" : "1px solid rgba(0,212,255,0.25)",
                  color: saved ? "#00e676" : "#00d4ff",
                  fontFamily: "Orbitron, sans-serif",
                  fontSize: activeFontSize,
                  letterSpacing: "2px",
                }}>
                {saved ? `${t("settings_saved_short")} ✓` : t("settings_save")}
              </button>
              {saved && (
                <p className="text-center text-sm" style={{ color: "#00e676", fontFamily: "DM Sans, sans-serif" }}>
                  {t("settings_saved")}
                </p>
              )}
            </div>
          </div>
        )}

      </main>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
    </div>
  );
}
