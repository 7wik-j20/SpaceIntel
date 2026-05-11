"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";

function StarField() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let animId;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    const stars = Array.from({ length: 300 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.2 + 0.1,
      o: Math.random() * 0.8 + 0.2,
      t: Math.random() * Math.PI * 2,
      s: Math.random() * 0.008 + 0.002,
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
  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none" style={{ zIndex: 1 }} />;
}

function CometField() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let animId;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);

    const comets = Array.from({ length: 6 }, () => createComet(canvas));

    function createComet(canvas) {
      return {
        x: Math.random() * canvas.width * 1.5 - canvas.width * 0.2,
        y: -50 - Math.random() * 200,
        len: 120 + Math.random() * 180,
        speed: 6 + Math.random() * 8,
        angle: Math.PI / 4 + (Math.random() - 0.5) * 0.3,
        opacity: 0.4 + Math.random() * 0.5,
        width: 1 + Math.random() * 1.5,
        delay: Math.random() * 300,
        active: false,
      };
    }

    let frame = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;

      comets.forEach(c => {
        if (frame < c.delay) return;
        c.active = true;
        c.x += Math.cos(c.angle) * c.speed;
        c.y += Math.sin(c.angle) * c.speed;

        const tailX = c.x - Math.cos(c.angle) * c.len;
        const tailY = c.y - Math.sin(c.angle) * c.len;

        const grad = ctx.createLinearGradient(tailX, tailY, c.x, c.y);
        grad.addColorStop(0, `rgba(255,255,255,0)`);
        grad.addColorStop(0.7, `rgba(180,230,255,${c.opacity * 0.4})`);
        grad.addColorStop(1, `rgba(255,255,255,${c.opacity})`);

        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(c.x, c.y);
        ctx.strokeStyle = grad;
        ctx.lineWidth = c.width;
        ctx.lineCap = "round";
        ctx.stroke();

        // Head glow
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.width * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,240,255,${c.opacity * 0.8})`;
        ctx.fill();

        // Reset if off screen
        if (c.x > canvas.width + 200 || c.y > canvas.height + 200) {
          Object.assign(c, createComet(canvas));
          c.delay = frame + Math.random() * 200;
          c.active = false;
        }
      });

      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none" style={{ zIndex: 2 }} />;
}

function Planet() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const cx = canvas.width * 0.72;
    const cy = canvas.height * 0.3;
    const r = Math.min(canvas.width, canvas.height) * 0.52;

    const grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.2, r * 0.1, cx, cy, r);
    grad.addColorStop(0, "#0d2a3a");
    grad.addColorStop(0.3, "#071520");
    grad.addColorStop(0.7, "#050d18");
    grad.addColorStop(1, "#020810");
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    const atmGrad = ctx.createRadialGradient(cx, cy - r * 0.85, r * 0.1, cx, cy, r * 1.15);
    atmGrad.addColorStop(0, "rgba(0,180,255,0.0)");
    atmGrad.addColorStop(0.75, "rgba(0,180,255,0.0)");
    atmGrad.addColorStop(0.88, "rgba(0,200,255,0.18)");
    atmGrad.addColorStop(0.94, "rgba(0,220,255,0.32)");
    atmGrad.addColorStop(1, "rgba(0,212,255,0.0)");
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.15, 0, Math.PI * 2);
    ctx.fillStyle = atmGrad;
    ctx.fill();

    const highlightGrad = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.3, 0, cx - r * 0.2, cy - r * 0.15, r * 0.7);
    highlightGrad.addColorStop(0, "rgba(0,180,220,0.12)");
    highlightGrad.addColorStop(0.5, "rgba(0,100,160,0.05)");
    highlightGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = highlightGrad;
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    const patches = [
      { x: cx - r * 0.1, y: cy - r * 0.2, rx: r * 0.25, ry: r * 0.12 },
      { x: cx + r * 0.2, y: cy + r * 0.1, rx: r * 0.18, ry: r * 0.08 },
      { x: cx - r * 0.3, y: cy + r * 0.25, rx: r * 0.2, ry: r * 0.1 },
      { x: cx + r * 0.05, y: cy - r * 0.35, rx: r * 0.15, ry: r * 0.07 },
    ];
    patches.forEach(p => {
      const pg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.rx);
      pg.addColorStop(0, "rgba(10,50,80,0.4)");
      pg.addColorStop(1, "rgba(10,50,80,0)");
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.rx, p.ry, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fillStyle = pg;
      ctx.fill();
    });
    ctx.restore();

    const nebulaGrad = ctx.createRadialGradient(cx * 0.1, canvas.height * 0.9, 0, cx * 0.3, canvas.height * 0.85, canvas.width * 0.4);
    nebulaGrad.addColorStop(0, "rgba(100,30,140,0.25)");
    nebulaGrad.addColorStop(0.5, "rgba(80,20,120,0.1)");
    nebulaGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = nebulaGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cyanGrad = ctx.createRadialGradient(canvas.width * 0.8, canvas.height * 0.95, 0, canvas.width * 0.7, canvas.height * 0.9, canvas.width * 0.35);
    cyanGrad.addColorStop(0, "rgba(0,150,200,0.15)");
    cyanGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = cyanGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const mx = cx * 0.22;
    const my = canvas.height * 0.62;
    const mr = 18;
    const moonGrad = ctx.createRadialGradient(mx - mr * 0.3, my - mr * 0.3, 1, mx, my, mr);
    moonGrad.addColorStop(0, "#2a3a4a");
    moonGrad.addColorStop(1, "#0a1520");
    ctx.beginPath();
    ctx.arc(mx, my, mr, 0, Math.PI * 2);
    ctx.fillStyle = moonGrad;
    ctx.fill();
  }, []);
  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none" style={{ zIndex: 2 }} />;
}

function CornerBorders() {
  const size = 32;
  const style = { position: "fixed", zIndex: 10 };
  const line = "rgba(255,255,255,0.25)";
  return (
    <>
      <svg width={size} height={size} style={{ ...style, top: 24, left: 24 }}>
        <line x1="0" y1={size} x2="0" y2="0" stroke={line} strokeWidth="1" />
        <line x1="0" y1="0" x2={size} y2="0" stroke={line} strokeWidth="1" />
      </svg>
      <svg width={size} height={size} style={{ ...style, top: 24, right: 24 }}>
        <line x1={size} y1={size} x2={size} y2="0" stroke={line} strokeWidth="1" />
        <line x1="0" y1="0" x2={size} y2="0" stroke={line} strokeWidth="1" />
      </svg>
      <svg width={size} height={size} style={{ ...style, bottom: 24, left: 24 }}>
        <line x1="0" y1="0" x2="0" y2={size} stroke={line} strokeWidth="1" />
        <line x1="0" y1={size} x2={size} y2={size} stroke={line} strokeWidth="1" />
      </svg>
      <svg width={size} height={size} style={{ ...style, bottom: 24, right: 24 }}>
        <line x1={size} y1="0" x2={size} y2={size} stroke={line} strokeWidth="1" />
        <line x1="0" y1={size} x2={size} y2={size} stroke={line} strokeWidth="1" />
      </svg>
    </>
  );
}

export default function LandingPage() {
  const [visible, setVisible] = useState(false);
  const [pulse, setPulse] = useState(false);
  const [launching, setLaunching] = useState(false);
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 300);
    const t2 = setTimeout(() => setPulse(true), 1200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const handleGetStarted = () => {
    setLaunching(true);
    setTimeout(() => router.push("/register"), 900);
  };

  return (
    <div className="min-h-screen relative overflow-hidden"
      style={{
        background: "#03060e",
        transition: launching ? "opacity 0.8s ease" : "none",
        opacity: launching ? 0 : 1,
      }}>
      <StarField />
      <CometField />
      <Planet />
      <CornerBorders />

      {/* Launch flash overlay */}
      {launching && (
        <div className="fixed inset-0 z-50 pointer-events-none"
          style={{
            background: "radial-gradient(circle at center, rgba(0,212,255,0.3) 0%, transparent 70%)",
            animation: "flashIn 0.8s ease forwards",
          }} />
      )}

      {/* Center content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen text-center px-6">

        {/* Main title */}
        <div
          className="transition-all duration-1000"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(20px)",
          }}>
          <h1 style={{
            fontFamily: "Orbitron, sans-serif",
            fontSize: "clamp(36px, 7vw, 80px)",
            fontWeight: 900,
            letterSpacing: "0.15em",
            color: "#ffffff",
            marginBottom: "8px",
            textShadow: "0 0 60px rgba(0,212,255,0.15)",
          }}>
            {t("app_name").toUpperCase()}
          </h1>
          <div style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: "clamp(10px, 1.5vw, 14px)",
            letterSpacing: "0.4em",
            color: "rgba(255,255,255,0.45)",
            marginBottom: "56px",
          }}>
            {t("landing_subtitle")}
          </div>
        </div>

        {/* Circular CTA */}
        <div
          className="transition-all duration-1000 delay-500"
          style={{
            opacity: visible ? 1 : 0,
            transform: launching
              ? "scale(1.15) translateY(-10px)"
              : visible ? "translateY(0) scale(1)" : "translateY(10px) scale(0.95)",
            transition: launching ? "transform 0.8s ease" : "all 1s ease 0.5s",
          }}>
          <div
            onClick={handleGetStarted}
            className="relative flex flex-col items-center justify-center cursor-pointer"
            style={{
              width: "150px",
              height: "150px",
              borderRadius: "50%",
              background: launching ? "rgba(0,212,255,0.15)" : "rgba(255,255,255,0.04)",
              border: launching ? "1px solid rgba(0,212,255,0.6)" : "1px solid rgba(255,255,255,0.15)",
              backdropFilter: "blur(10px)",
              transition: "all 0.4s ease",
              boxShadow: launching ? "0 0 60px rgba(0,212,255,0.3)" : "none",
            }}
            onMouseEnter={e => {
              if (launching) return;
              e.currentTarget.style.background = "rgba(0,212,255,0.08)";
              e.currentTarget.style.border = "1px solid rgba(0,212,255,0.4)";
              e.currentTarget.style.boxShadow = "0 0 40px rgba(0,212,255,0.15)";
            }}
            onMouseLeave={e => {
              if (launching) return;
              e.currentTarget.style.background = "rgba(255,255,255,0.04)";
              e.currentTarget.style.border = "1px solid rgba(255,255,255,0.15)";
              e.currentTarget.style.boxShadow = "none";
            }}>
            {/* Rotating ring */}
            <svg width="170" height="170" className="absolute"
              style={{
                animation: pulse ? `spin ${launching ? "1s" : "12s"} linear infinite` : "none",
                top: "-10px", left: "-10px",
              }}>
              <circle cx="85" cy="85" r="80" fill="none"
                stroke={launching ? "rgba(0,212,255,0.5)" : "rgba(0,212,255,0.2)"}
                strokeWidth="0.5" strokeDasharray="8 12" />
            </svg>
            {/* Second ring */}
            <svg width="190" height="190" className="absolute"
              style={{
                animation: pulse ? `spinReverse ${launching ? "0.8s" : "18s"} linear infinite` : "none",
                top: "-20px", left: "-20px",
                opacity: launching ? 1 : 0.4,
              }}>
              <circle cx="95" cy="95" r="90" fill="none"
                stroke="rgba(123,95,255,0.2)"
                strokeWidth="0.5" strokeDasharray="3 20" />
            </svg>

            <span style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: "11px",
              letterSpacing: "2px",
              color: launching ? "rgba(0,212,255,0.9)" : "rgba(255,255,255,0.7)",
              lineHeight: "1.6",
              textAlign: "center",
              transition: "color 0.3s",
            }}>
              {launching ? t("landing_launching") : t("landing_get_started")}
            </span>
            <span style={{
              color: launching ? "rgba(0,212,255,0.9)" : "rgba(255,255,255,0.5)",
              fontSize: "18px",
              marginTop: "6px",
              transition: "all 0.3s",
              transform: launching ? "translateY(4px)" : "none",
              display: "block",
            }}>↓</span>
          </div>
        </div>

        {/* Login link */}
        <div className="mt-10 transition-all duration-1000 delay-700"
          style={{ opacity: visible && !launching ? 1 : 0 }}>
          <span
            onClick={() => router.push("/login")}
            className="cursor-pointer transition-all duration-300"
            style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: "11px",
              letterSpacing: "3px",
              color: "rgba(255,255,255,0.3)",
            }}
            onMouseEnter={e => e.currentTarget.style.color = "rgba(0,212,255,0.8)"}
            onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.3)"}>
            {`${t("register_login")} →`}
          </span>
        </div>
      </div>

      {/* Bottom footer */}
      <div className="fixed bottom-0 left-0 right-0 z-20 flex items-center justify-center pb-8">
        <p style={{
          fontFamily: "JetBrains Mono, monospace",
          fontSize: "10px",
          letterSpacing: "2px",
          color: "rgba(255,255,255,0.18)",
        }}>
          {`© 2025 ${t("app_name").toUpperCase()}. ${t("landing_rights").toUpperCase()}`}
        </p>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes spinReverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes flashIn {
          0% { opacity: 0; }
          50% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}