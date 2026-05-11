"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { t } = useTranslation();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("http://localhost:8000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || t("error_something_wrong"));

      localStorage.setItem("token", data.access_token);

      // Decode token to get user info
      const payload = JSON.parse(atob(data.access_token.split(".")[1]));
      localStorage.setItem("user", JSON.stringify({
        email: payload.email,
        username: payload.username || email.split("@")[0],
      }));

      router.push("/home");
    } catch (err) {
      setError(err.message || t("error_something_wrong"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 relative"
      style={{ background: "#03060e" }}>

      <div className="fixed inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse at 70% 20%, rgba(0,100,160,0.12) 0%, transparent 60%), radial-gradient(ellipse at 20% 80%, rgba(80,20,120,0.1) 0%, transparent 60%)"
      }} />

      {["tl","tr","bl","br"].map(c => (
        <div key={c} className="fixed w-6 h-6" style={{
          top: c.startsWith("t") ? 20 : "auto",
          bottom: c.startsWith("b") ? 20 : "auto",
          left: c.endsWith("l") ? 20 : "auto",
          right: c.endsWith("r") ? 20 : "auto",
          borderTop: c.startsWith("t") ? "1px solid rgba(255,255,255,0.2)" : "none",
          borderBottom: c.startsWith("b") ? "1px solid rgba(255,255,255,0.2)" : "none",
          borderLeft: c.endsWith("l") ? "1px solid rgba(255,255,255,0.2)" : "none",
          borderRight: c.endsWith("r") ? "1px solid rgba(255,255,255,0.2)" : "none",
        }} />
      ))}

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-10">
          <span onClick={() => router.push("/")} className="cursor-pointer">
            <h1 style={{
              fontFamily: "Orbitron, sans-serif",
              fontSize: "32px",
              fontWeight: 900,
              letterSpacing: "0.15em",
              color: "#ffffff",
              marginBottom: "8px",
            }}>{t("app_name")}</h1>
          </span>
          <p style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: "10px",
            letterSpacing: "3px",
            color: "rgba(255,255,255,0.3)",
          }}>{t("login_title")}</p>
        </div>

        <div style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "20px",
          padding: "40px",
          backdropFilter: "blur(10px)",
        }}>
          <form onSubmit={handleLogin}>
            <div className="mb-5">
              <label style={{
                fontFamily: "JetBrains Mono, monospace",
                fontSize: "10px",
                letterSpacing: "2px",
                color: "rgba(0,212,255,0.7)",
                display: "block",
                marginBottom: "8px",
              }}>{t("login_email")}</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full px-4 py-3 rounded-xl text-white focus:outline-none transition-all"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", fontSize: "14px", fontFamily: "DM Sans, sans-serif" }}
                onFocus={e => e.target.style.borderColor = "rgba(0,212,255,0.4)"}
                onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
            </div>

            <div className="mb-8">
              <label style={{
                fontFamily: "JetBrains Mono, monospace",
                fontSize: "10px",
                letterSpacing: "2px",
                color: "rgba(0,212,255,0.7)",
                display: "block",
                marginBottom: "8px",
              }}>{t("login_password")}</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                className="w-full px-4 py-3 rounded-xl text-white focus:outline-none transition-all"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", fontSize: "14px", fontFamily: "DM Sans, sans-serif" }}
                onFocus={e => e.target.style.borderColor = "rgba(0,212,255,0.4)"}
                onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
            </div>

            {error && (
              <div className="mb-4 px-4 py-3 rounded-xl text-sm"
                style={{ background: "rgba(255,82,82,0.08)", border: "1px solid rgba(255,82,82,0.2)", color: "#ff5252", fontFamily: "DM Sans, sans-serif" }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-4 rounded-xl font-semibold transition-all duration-300 disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, rgba(0,212,255,0.15), rgba(123,95,255,0.15))",
                border: "1px solid rgba(0,212,255,0.3)",
                color: "#ffffff",
                fontFamily: "Orbitron, sans-serif",
                fontSize: "13px",
                letterSpacing: "2px",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "linear-gradient(135deg, rgba(0,212,255,0.25), rgba(123,95,255,0.25))"}
              onMouseLeave={e => e.currentTarget.style.background = "linear-gradient(135deg, rgba(0,212,255,0.15), rgba(123,95,255,0.15))"}>
              {loading ? t("login_authenticating") : t("login_button")}
            </button>
          </form>

          <p className="text-center mt-6" style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: "10px",
            letterSpacing: "1px",
            color: "rgba(255,255,255,0.25)",
          }}>
            {t("login_register")}{" "}
            <span onClick={() => router.push("/register")} className="cursor-pointer"
              style={{ color: "rgba(0,212,255,0.6)" }}>
              →
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}