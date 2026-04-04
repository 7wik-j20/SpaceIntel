"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Registration failed");
      router.push("/login");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    fontSize: "14px",
    fontFamily: "DM Sans, sans-serif",
  };

  const labelStyle = {
    fontFamily: "JetBrains Mono, monospace",
    fontSize: "10px",
    letterSpacing: "2px",
    color: "rgba(0,212,255,0.7)",
    display: "block",
    marginBottom: "8px",
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
            }}>SPACEINTEL</h1>
          </span>
          <p style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: "10px",
            letterSpacing: "3px",
            color: "rgba(255,255,255,0.3)",
          }}>CREATE YOUR ACCOUNT</p>
        </div>

        <div style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "20px",
          padding: "40px",
          backdropFilter: "blur(10px)",
        }}>
          <form onSubmit={handleRegister}>

            {/* Name */}
            <div className="mb-5">
              <label style={labelStyle}>NAME</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required
                className="w-full px-4 py-3 rounded-xl text-white focus:outline-none transition-all"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = "rgba(0,212,255,0.4)"}
                onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
            </div>

            {/* Email */}
            <div className="mb-5">
              <label style={labelStyle}>EMAIL</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full px-4 py-3 rounded-xl text-white focus:outline-none transition-all"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = "rgba(0,212,255,0.4)"}
                onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
            </div>

            {/* Password */}
            <div className="mb-5">
              <label style={labelStyle}>PASSWORD</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                className="w-full px-4 py-3 rounded-xl text-white focus:outline-none transition-all"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = "rgba(0,212,255,0.4)"}
                onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
            </div>

            {/* Confirm Password */}
            <div className="mb-8">
              <label style={labelStyle}>CONFIRM PASSWORD</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required
                className="w-full px-4 py-3 rounded-xl text-white focus:outline-none transition-all"
                style={{
                  ...inputStyle,
                  borderColor: confirmPassword && password !== confirmPassword
                    ? "rgba(255,82,82,0.4)"
                    : confirmPassword && password === confirmPassword
                    ? "rgba(0,230,118,0.4)"
                    : "rgba(255,255,255,0.1)"
                }}
                onFocus={e => {
                  if (!confirmPassword) e.target.style.borderColor = "rgba(0,212,255,0.4)";
                }}
                onBlur={e => {
                  e.target.style.borderColor = confirmPassword && password !== confirmPassword
                    ? "rgba(255,82,82,0.4)"
                    : confirmPassword && password === confirmPassword
                    ? "rgba(0,230,118,0.4)"
                    : "rgba(255,255,255,0.1)";
                }} />
              {confirmPassword && password !== confirmPassword && (
                <p className="mt-1 text-xs" style={{ color: "#ff5252", fontFamily: "JetBrains Mono, monospace" }}>
                  Passwords do not match
                </p>
              )}
              {confirmPassword && password === confirmPassword && (
                <p className="mt-1 text-xs" style={{ color: "#00e676", fontFamily: "JetBrains Mono, monospace" }}>
                  Passwords match ✓
                </p>
              )}
            </div>

            {error && (
              <div className="mb-4 px-4 py-3 rounded-xl text-sm"
                style={{ background: "rgba(255,82,82,0.08)", border: "1px solid rgba(255,82,82,0.2)", color: "#ff5252", fontFamily: "DM Sans, sans-serif" }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading || (confirmPassword && password !== confirmPassword)}
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
              {loading ? "CREATING ACCOUNT..." : "REGISTER"}
            </button>
          </form>

          <p className="text-center mt-6" style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: "10px",
            letterSpacing: "1px",
            color: "rgba(255,255,255,0.25)",
          }}>
            HAVE AN ACCOUNT?{" "}
            <span onClick={() => router.push("/login")} className="cursor-pointer"
              style={{ color: "rgba(0,212,255,0.6)" }}>
              LOGIN →
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}