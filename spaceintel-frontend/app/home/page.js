"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../components/Sidebar";

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

function CometField() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let animId;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    function createComet() {
      return {
        x: Math.random() * canvas.width * 1.5 - canvas.width * 0.2,
        y: -50 - Math.random() * 200,
        len: 100 + Math.random() * 150,
        speed: 5 + Math.random() * 7,
        angle: Math.PI / 4 + (Math.random() - 0.5) * 0.3,
        opacity: 0.3 + Math.random() * 0.4,
        width: 0.8 + Math.random() * 1.2,
        delay: Math.random() * 400,
      };
    }
    const comets = Array.from({ length: 5 }, createComet);
    let frame = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;
      comets.forEach(c => {
        if (frame < c.delay) return;
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
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.width * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,240,255,${c.opacity * 0.8})`;
        ctx.fill();
        if (c.x > canvas.width + 200 || c.y > canvas.height + 200) {
          Object.assign(c, createComet());
          c.delay = frame + Math.random() * 200;
        }
      });
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }} />;
}

function RocketIcon({ color, size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C9 5.5 9 9.5 9 13h6c0-3.5 0-7.5-3-11z" stroke={color} strokeWidth="1.3"/>
      <circle cx="12" cy="10" r="1.5" fill={color}/>
      <path d="M9 13L6.5 16H9" stroke={color} strokeWidth="1.3"/>
      <path d="M15 13L17.5 16H15" stroke={color} strokeWidth="1.3"/>
      <path d="M10.5 13L10 17.5M12 13L12 18.5M13.5 13L14 17.5" stroke={color} strokeWidth="0.9" opacity="0.5"/>
      <path d="M11 2.5L12 1L13 2.5" stroke={color} strokeWidth="1" opacity="0.7"/>
    </svg>
  );
}

function PulsarIcon({ color, size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeLinecap="round">
      <circle cx="12" cy="12" r="2.5" stroke={color} strokeWidth="1.3"/>
      <circle cx="12" cy="12" r="5.5" stroke={color} strokeWidth="0.7" strokeDasharray="1.5 2.5" opacity="0.5"/>
      <line x1="12" y1="2" x2="12" y2="6.5" stroke={color} strokeWidth="1.3"/>
      <line x1="12" y1="17.5" x2="12" y2="22" stroke={color} strokeWidth="1.3"/>
      <line x1="2" y1="12" x2="6.5" y2="12" stroke={color} strokeWidth="1.3"/>
      <line x1="17.5" y1="12" x2="22" y2="12" stroke={color} strokeWidth="1.3"/>
      <line x1="5" y1="5" x2="7.8" y2="7.8" stroke={color} strokeWidth="1" opacity="0.55"/>
      <line x1="16.2" y1="16.2" x2="19" y2="19" stroke={color} strokeWidth="1" opacity="0.55"/>
      <line x1="19" y1="5" x2="16.2" y2="7.8" stroke={color} strokeWidth="1" opacity="0.55"/>
      <line x1="7.8" y1="16.2" x2="5" y2="19" stroke={color} strokeWidth="1" opacity="0.55"/>
    </svg>
  );
}

function OrbitIcon({ color, size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeLinecap="round">
      <circle cx="12" cy="12" r="2.5" fill={color} opacity="0.9"/>
      <circle cx="12" cy="12" r="6" stroke={color} strokeWidth="0.8" strokeDasharray="2 2.5" opacity="0.45"/>
      <ellipse cx="12" cy="12" rx="10.5" ry="3.8" stroke={color} strokeWidth="1.3" transform="rotate(-22 12 12)"/>
      <circle cx="21" cy="10.5" r="1.5" fill={color} opacity="0.75"/>
    </svg>
  );
}

const cards = [
  {
    href: "/upload",
    Icon: RocketIcon,
    label: "ORBITAL UPLOAD",
    sublabel: "DOCUMENT INDEXING",
    title: "Upload",
    desc: "Launch NASA, ISRO, ESA mission reports into orbit. Index research PDFs into your personal knowledge base.",
    cta: "LAUNCH SEQUENCE",
    color: "#00d4ff",
    glow: "rgba(0,212,255,0.07)",
    border: "rgba(0,212,255,0.3)",
    shadow: "rgba(0,212,255,0.15)",
    gradFrom: "rgba(0,212,255,0.06)",
  },
  {
    href: "/chat",
    Icon: PulsarIcon,
    label: "NEURAL QUERY",
    sublabel: "AI INTELLIGENCE",
    title: "Ask AI",
    desc: "Transmit queries to the neural core. Receive grounded answers with verified source citations.",
    cta: "INITIATE QUERY",
    color: "#7b5fff",
    glow: "rgba(123,95,255,0.07)",
    border: "rgba(123,95,255,0.3)",
    shadow: "rgba(123,95,255,0.15)",
    gradFrom: "rgba(123,95,255,0.06)",
  },
  {
    href: "/library",
    Icon: OrbitIcon,
    label: "STELLAR ARCHIVE",
    sublabel: "DOCUMENT REGISTRY",
    title: "Library",
    desc: "Navigate the stellar archive. Browse, summarize, and compare indexed space research documents.",
    cta: "ENTER ARCHIVE",
    color: "#00e676",
    glow: "rgba(0,230,118,0.07)",
    border: "rgba(0,230,118,0.3)",
    shadow: "rgba(0,230,118,0.15)",
    gradFrom: "rgba(0,230,118,0.06)",
  },
];

export default function HomePage() {
  const router = useRouter();
  const [hovered, setHovered] = useState(null);

  // Collapsed = 80px, Expanded fills remaining space
  const COLLAPSED_W = 80;
  const GAP = 12;
  const TOTAL_COLLAPSED = COLLAPSED_W * 2 + GAP * 2; // two collapsed cards
  // Expanded card takes remaining space - calculated via flex

  return (
    <div className="flex min-h-screen" style={{ background: "#03060e" }}>
      <StarField />
      <CometField />
      <div className="fixed inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse at 80% 10%, rgba(0,100,160,0.08) 0%, transparent 50%), radial-gradient(ellipse at 10% 90%, rgba(80,20,120,0.08) 0%, transparent 50%)",
        zIndex: 0,
      }} />

      <Sidebar layout="profile" />

      <main className="ml-64 flex-1 relative z-10 flex flex-col" style={{ padding: "32px 36px 28px" }}>

        {/* ── TOP BAR ── */}
        <div className="flex items-center justify-between" style={{ marginBottom: "28px" }}>
          <div>
            <div className="flex items-center gap-3" style={{ marginBottom: "6px" }}>
              <div className="w-1.5 h-1.5 rounded-full" style={{
                background: "#00e676",
                animation: "pulse 1.5s infinite",
                boxShadow: "0 0 6px rgba(0,230,118,0.8)",
              }} />
              <span style={{
                fontFamily: "JetBrains Mono, monospace",
                fontSize: "9px",
                letterSpacing: "3px",
                color: "rgba(0,212,255,0.55)",
              }}>MISSION CONTROL · ACTIVE</span>
            </div>
            <h1 style={{
              fontFamily: "Orbitron, sans-serif",
              fontSize: "clamp(22px, 2.8vw, 34px)",
              fontWeight: 900,
              letterSpacing: "0.12em",
              color: "#ffffff",
              textShadow: "0 0 40px rgba(0,212,255,0.12)",
            }}>SPACEINTEL</h1>
          </div>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 16px",
            borderRadius: "100px",
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}>
            <div style={{
              width: "6px", height: "6px", borderRadius: "50%",
              background: "#00e676",
              boxShadow: "0 0 6px rgba(0,230,118,0.8)",
              animation: "pulse 2s infinite",
            }} />
            <span style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: "9px",
              letterSpacing: "2px",
              color: "rgba(255,255,255,0.28)",
            }}>llama-3.3-70b · ONLINE</span>
          </div>
        </div>

        {/* ── SECTION LABEL ── */}
        <div style={{ marginBottom: "20px" }}>
          <span style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: "9px",
            letterSpacing: "4px",
            color: "rgba(255,255,255,0.18)",
          }}>SELECT MODULE · HOVER TO EXPAND</span>
        </div>

        {/* ── EXPANDABLE CARDS ── */}
        <div style={{
          display: "flex",
          gap: `${GAP}px`,
          flex: 1,
          minHeight: 0,
        }}>
          {cards.map((card) => {
            const isHovered = hovered === card.href;

            return (
              <div
                key={card.href}
                onMouseEnter={() => setHovered(card.href)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => router.push(card.href)}
                style={{
                  position: "relative",
                  flex: isHovered ? "5 1 0%" : "1 1 0%",
                  minWidth: `${COLLAPSED_W}px`,
                  borderRadius: "18px",
                  cursor: "pointer",
                  overflow: "hidden",
                  transition: "flex 0.5s cubic-bezier(0.4, 0, 0.2, 1), background 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease",
                  background: isHovered
                    ? `linear-gradient(160deg, ${card.gradFrom} 0%, rgba(0,0,0,0.0) 60%)`
                    : "rgba(255,255,255,0.022)",
                  border: `1px solid ${isHovered ? card.border : "rgba(255,255,255,0.07)"}`,
                  boxShadow: isHovered
                    ? `0 0 60px ${card.shadow}, 0 20px 60px rgba(0,0,0,0.35)`
                    : "none",
                }}>

                {/* Top scan line */}
                {isHovered && (
                  <div style={{
                    position: "absolute",
                    left: 0, right: 0, height: "1px",
                    background: `linear-gradient(90deg, transparent 0%, ${card.color}88 50%, transparent 100%)`,
                    animation: "scan 3s linear infinite",
                    zIndex: 2,
                  }} />
                )}

                {/* Corner accent — top left */}
                <div style={{
                  position: "absolute",
                  top: "14px", left: "14px",
                  width: "12px", height: "12px",
                  borderTop: `1px solid ${card.color}`,
                  borderLeft: `1px solid ${card.color}`,
                  opacity: isHovered ? 0.7 : 0.2,
                  transition: "opacity 0.3s ease",
                  borderRadius: "2px 0 0 0",
                }} />

                {/* Corner accent — bottom right */}
                <div style={{
                  position: "absolute",
                  bottom: "14px", right: "14px",
                  width: "12px", height: "12px",
                  borderBottom: `1px solid ${card.color}`,
                  borderRight: `1px solid ${card.color}`,
                  opacity: isHovered ? 0.7 : 0.2,
                  transition: "opacity 0.3s ease",
                  borderRadius: "0 0 2px 0",
                }} />

                {/* ── COLLAPSED STATE ── centered icon + rings + vertical label */}
                <div style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0px",
                  opacity: isHovered ? 0 : 1,
                  transition: "opacity 0.2s ease",
                  pointerEvents: "none",
                }}>
                  {/* Outer pulse ring */}
                  <div style={{
                    position: "absolute",
                    width: "70px", height: "70px",
                    borderRadius: "50%",
                    border: `1px solid ${card.color}22`,
                    animation: "ringpulse 3s ease-in-out infinite 0.4s",
                  }} />
                  {/* Inner ring */}
                  <div style={{
                    position: "absolute",
                    width: "54px", height: "54px",
                    borderRadius: "50%",
                    border: `1px solid ${card.color}44`,
                    animation: "ringpulse 3s ease-in-out infinite",
                  }} />

                  {/* Icon */}
                  <div style={{
                    filter: `drop-shadow(0 0 8px ${card.color}66)`,
                    marginBottom: "0px",
                    zIndex: 2,
                  }}>
                    <card.Icon color={card.color} size={32} />
                  </div>

                  {/* Vertical text */}
                  <div style={{
                    position: "absolute",
                    bottom: "22px",
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: "7px",
                    letterSpacing: "3px",
                    color: card.color,
                    opacity: 0.35,
                    writingMode: "vertical-rl",
                    textOrientation: "mixed",
                    transform: "rotate(180deg)",
                    whiteSpace: "nowrap",
                  }}>{card.label}</div>
                </div>

                {/* ── EXPANDED STATE ── */}
                <div style={{
                  position: "absolute",
                  inset: 0,
                  padding: "36px 36px 32px",
                  display: "flex",
                  flexDirection: "column",
                  opacity: isHovered ? 1 : 0,
                  transform: isHovered ? "translateX(0)" : "translateX(-10px)",
                  transition: "opacity 0.28s ease, transform 0.28s ease",
                  transitionDelay: isHovered ? "0.2s" : "0s",
                  pointerEvents: "none",
                  minWidth: "280px",
                }}>

                  {/* Icon + sublabel row */}
                  <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "28px" }}>
                    <div style={{ filter: `drop-shadow(0 0 10px ${card.color}88)` }}>
                      <card.Icon color={card.color} size={36} />
                    </div>
                    <div>
                      <div style={{
                        fontFamily: "JetBrains Mono, monospace",
                        fontSize: "8px",
                        letterSpacing: "3px",
                        color: card.color,
                        opacity: 0.55,
                        marginBottom: "4px",
                      }}>{card.sublabel}</div>
                      <div style={{
                        fontFamily: "Orbitron, sans-serif",
                        fontSize: "10px",
                        fontWeight: 700,
                        letterSpacing: "2px",
                        color: card.color,
                      }}>{card.label}</div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div style={{
                    width: "100%", height: "1px",
                    background: `linear-gradient(90deg, ${card.color}44, transparent)`,
                    marginBottom: "28px",
                  }} />

                  {/* Title */}
                  <div style={{
                    fontFamily: "Orbitron, sans-serif",
                    fontSize: "clamp(22px, 2vw, 30px)",
                    fontWeight: 900,
                    color: "#ffffff",
                    letterSpacing: "0.06em",
                    marginBottom: "16px",
                    lineHeight: 1.1,
                    whiteSpace: "nowrap",
                  }}>{card.title}</div>

                  {/* Description */}
                  <p style={{
                    fontFamily: "DM Sans, sans-serif",
                    fontSize: "13px",
                    color: "rgba(255,255,255,0.38)",
                    lineHeight: "1.8",
                    flex: 1,
                    maxWidth: "320px",
                  }}>{card.desc}</p>

                  {/* CTA */}
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginTop: "24px",
                  }}>
                    <div style={{
                      width: "28px", height: "1px",
                      background: card.color,
                      opacity: 0.5,
                    }} />
                    <span style={{
                      fontFamily: "JetBrains Mono, monospace",
                      fontSize: "9px",
                      letterSpacing: "2.5px",
                      color: card.color,
                    }}>{card.cta}</span>
                    <span style={{
                      fontFamily: "JetBrains Mono, monospace",
                      fontSize: "11px",
                      color: card.color,
                      opacity: 0.7,
                    }}>→</span>
                  </div>
                </div>

                {/* Bottom accent bar */}
                <div style={{
                  position: "absolute",
                  bottom: 0, left: 0, right: 0,
                  height: "2px",
                  background: `linear-gradient(90deg, transparent, ${card.color}, transparent)`,
                  opacity: isHovered ? 0.5 : 0.12,
                  transition: "opacity 0.3s ease",
                }} />

              </div>
            );
          })}
        </div>

        {/* ── FOOTER ── */}
        <div style={{ marginTop: "20px", textAlign: "center" }}>
          <p style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: "9px",
            letterSpacing: "3px",
            color: "rgba(255,255,255,0.09)",
          }}>
            SPACEINTEL · AI KNOWLEDGE ASSISTANT FOR SPACE RESEARCH · © 2025
          </p>
        </div>

      </main>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes ringpulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(1.1); }
        }
        @keyframes scan {
          0% { top: -1px; }
          100% { top: 100%; }
        }
      `}</style>
    </div>
  );
}