"use client";
import { useState, useEffect, useRef } from "react";
import axios from "axios";
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

export default function LibraryPage() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [summarizing, setSummarizing] = useState(null);
  const [summary, setSummary] = useState(null);
  const [comparing, setComparing] = useState(false);
  const [compareResult, setCompareResult] = useState(null);
  const [selected, setSelected] = useState([]);

  const getToken = () => localStorage.getItem("token");
  const authHeader = () => ({ Authorization: `Bearer ${getToken()}` });

  const openPdf = (filename) => {
    const token = getToken();
    window.open(
      `http://localhost:8000/documents/pdf/${encodeURIComponent(filename)}?token=${token}`,
      "_blank"
    );
  };

  const fetchDocs = async () => {
    try {
      const res = await axios.get("http://localhost:8000/documents/list", { headers: authHeader() });
      setDocs(res.data);
    } catch { setDocs([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchDocs(); }, []);

  const handleDelete = async (filename) => {
    if (!confirm(`Delete ${filename}?`)) return;
    setDeleting(filename);
    try {
      await axios.delete(`http://localhost:8000/documents/delete/${encodeURIComponent(filename)}`, { headers: authHeader() });
      setDocs((prev) => prev.filter((d) => d.filename !== filename));
      if (summary?.filename === filename) setSummary(null);
      setSelected((prev) => prev.filter((f) => f !== filename));
    } catch { alert("Delete failed."); }
    finally { setDeleting(null); }
  };

  const handleSummarize = async (filename) => {
    setSummarizing(filename); setSummary(null); setCompareResult(null);
    try {
      const res = await axios.get(
        `http://localhost:8000/documents/summarize/${encodeURIComponent(filename)}`,
        { headers: authHeader() }
      );
      setSummary(res.data);
    } catch { alert("Summarization failed."); }
    finally { setSummarizing(null); }
  };

  const toggleSelect = (filename) => {
    setSelected((prev) =>
      prev.includes(filename) ? prev.filter((f) => f !== filename)
        : prev.length < 2 ? [...prev, filename] : prev
    );
  };

  const handleCompare = async () => {
    if (selected.length !== 2) return;
    setComparing(true); setCompareResult(null); setSummary(null);
    try {
      const res = await axios.post(
        "http://localhost:8000/documents/compare",
        { filename1: selected[0], filename2: selected[1] },
        { headers: authHeader() }
      );
      setCompareResult(res.data);
    } catch { alert("Comparison failed."); }
    finally { setComparing(false); }
  };

  return (
    <div className="flex min-h-screen" style={{ background: "#03060e" }}>
      <StarField />
      <div className="fixed inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse at 80% 10%, rgba(0,100,160,0.08) 0%, transparent 50%), radial-gradient(ellipse at 10% 90%, rgba(80,20,120,0.08) 0%, transparent 50%)",
        zIndex: 0,
      }} />
      <Sidebar />
      <main className="ml-64 flex-1 p-8 relative z-10">
        <div className="max-w-4xl mx-auto pt-8">

          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400"
                  style={{ animation: "pulse 1.5s infinite", boxShadow: "0 0 6px rgba(0,212,255,0.8)" }} />
                <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", letterSpacing: "3px", color: "rgba(0,212,255,0.6)" }}>
                  DOCUMENT ARCHIVE
                </span>
              </div>
              <h2 className="text-2xl font-bold text-white tracking-widest"
                style={{ fontFamily: "Orbitron, sans-serif" }}>LIBRARY</h2>
              <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.25)", fontFamily: "DM Sans, sans-serif" }}>
                All indexed space research documents
              </p>
            </div>
            <div className="flex items-center gap-3">
              {selected.length === 2 && (
                <button onClick={handleCompare} disabled={comparing}
                  className="px-4 py-2 rounded-xl text-xs transition-all disabled:opacity-30"
                  style={{ background: "rgba(0,212,255,0.06)", border: "1px solid rgba(0,212,255,0.25)", color: "#00d4ff", fontFamily: "JetBrains Mono, monospace" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(0,212,255,0.12)"}
                  onMouseLeave={e => e.currentTarget.style.background = "rgba(0,212,255,0.06)"}>
                  {comparing ? "ANALYZING..." : "⚡ COMPARE SELECTED"}
                </button>
              )}
              {selected.length > 0 && (
                <button onClick={() => setSelected([])}
                  className="px-3 py-2 rounded-xl text-xs transition-all"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)", fontFamily: "JetBrains Mono, monospace" }}>
                  CLEAR
                </button>
              )}
              <div className="rounded-xl px-4 py-2 text-center"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(0,212,255,0.1)" }}>
                <p className="text-2xl font-bold text-cyan-400" style={{ fontFamily: "Orbitron, sans-serif" }}>{docs.length}</p>
                <p className="text-xs mt-0.5" style={{ fontFamily: "JetBrains Mono, monospace", color: "rgba(255,255,255,0.25)" }}>DOCUMENTS</p>
              </div>
            </div>
          </div>

          {/* Compare hint */}
          {docs.length >= 2 && (
            <div className="mb-4 px-4 py-2.5 rounded-xl text-xs"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", fontFamily: "JetBrains Mono, monospace", color: "rgba(255,255,255,0.2)" }}>
              TIP: Click the checkbox icon to select up to 2 documents for comparison
            </div>
          )}

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-2 h-2 rounded-full"
                    style={{ background: "rgba(0,212,255,0.6)", animation: `pulse 1s infinite ${i * 0.2}s` }} />
                ))}
              </div>
            </div>
          ) : docs.length === 0 ? (
            <div className="rounded-2xl p-16 text-center"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="text-5xl mb-4" style={{ opacity: 0.1 }}>▦</div>
              <p className="mb-2" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "DM Sans, sans-serif" }}>No documents indexed yet</p>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.15)" }}>Upload a PDF to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {docs.map((doc, i) => (
                <div key={i} className="rounded-2xl p-6 transition-all"
                  style={{
                    background: selected.includes(doc.filename) ? "rgba(0,212,255,0.04)" : "rgba(255,255,255,0.02)",
                    border: selected.includes(doc.filename) ? "1px solid rgba(0,212,255,0.3)" : "1px solid rgba(255,255,255,0.06)",
                  }}
                  onMouseEnter={e => { if (!selected.includes(doc.filename)) e.currentTarget.style.border = "1px solid rgba(255,255,255,0.12)"; }}
                  onMouseLeave={e => { if (!selected.includes(doc.filename)) e.currentTarget.style.border = "1px solid rgba(255,255,255,0.06)"; }}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">

                      {/* Select checkbox */}
                      <button onClick={() => toggleSelect(doc.filename)}
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all text-sm"
                        style={{
                          background: selected.includes(doc.filename) ? "rgba(0,212,255,0.15)" : "rgba(255,255,255,0.04)",
                          border: selected.includes(doc.filename) ? "1px solid rgba(0,212,255,0.4)" : "1px solid rgba(255,255,255,0.08)",
                          color: selected.includes(doc.filename) ? "#00d4ff" : "rgba(255,255,255,0.3)",
                        }}>
                        {selected.includes(doc.filename) ? "✓" : "📄"}
                      </button>

                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate mb-2">{doc.filename}</p>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { label: "PAGES", value: doc.total_pages },
                            { label: "CHUNKS", value: doc.total_chunks },
                            { label: "AGENCY", value: doc.metadata?.agency || "Unknown" },
                            { label: "YEAR", value: doc.metadata?.year || "Unknown" },
                          ].map((item) => (
                            <span key={item.label} className="px-2 py-1 rounded-lg text-xs"
                              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", fontFamily: "JetBrains Mono, monospace" }}>
                              <span style={{ color: "rgba(255,255,255,0.3)" }}>{item.label}: </span>
                              <span style={{ color: "rgba(255,255,255,0.6)" }}>{item.value}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => openPdf(doc.filename)}
                        className="px-3 py-2 rounded-lg text-xs transition-all"
                        style={{ background: "rgba(0,212,255,0.05)", border: "1px solid rgba(0,212,255,0.15)", color: "#00d4ff", fontFamily: "JetBrains Mono, monospace" }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(0,212,255,0.12)"}
                        onMouseLeave={e => e.currentTarget.style.background = "rgba(0,212,255,0.05)"}>
                        VIEW
                      </button>
                      <button onClick={() => handleSummarize(doc.filename)} disabled={summarizing === doc.filename}
                        className="px-3 py-2 rounded-lg text-xs transition-all disabled:opacity-30"
                        style={{ background: "rgba(123,95,255,0.05)", border: "1px solid rgba(123,95,255,0.15)", color: "#7b5fff", fontFamily: "JetBrains Mono, monospace" }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(123,95,255,0.12)"}
                        onMouseLeave={e => e.currentTarget.style.background = "rgba(123,95,255,0.05)"}>
                        {summarizing === doc.filename ? "..." : "SUMMARIZE"}
                      </button>
                      <button onClick={() => handleDelete(doc.filename)} disabled={deleting === doc.filename}
                        className="px-3 py-2 rounded-lg text-xs transition-all disabled:opacity-30"
                        style={{ background: "rgba(255,82,82,0.05)", border: "1px solid rgba(255,82,82,0.15)", color: "#ff5252", fontFamily: "JetBrains Mono, monospace" }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,82,82,0.12)"}
                        onMouseLeave={e => e.currentTarget.style.background = "rgba(255,82,82,0.05)"}>
                        {deleting === doc.filename ? "..." : "DELETE"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Summary Panel */}
          {summary && (
            <div className="mt-8 rounded-2xl p-6"
              style={{ background: "rgba(123,95,255,0.04)", border: "1px solid rgba(123,95,255,0.2)" }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-violet-400" />
                  <span className="text-sm font-medium tracking-wider"
                    style={{ fontFamily: "Orbitron, sans-serif", color: "#7b5fff" }}>AI SUMMARY</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs" style={{ fontFamily: "JetBrains Mono, monospace", color: "rgba(255,255,255,0.25)" }}>
                    {summary.chunks_analyzed} CHUNKS ANALYZED
                  </span>
                  <button onClick={() => setSummary(null)} className="text-xs transition-colors"
                    style={{ color: "rgba(255,255,255,0.3)" }}
                    onMouseEnter={e => e.target.style.color = "#ff5252"}
                    onMouseLeave={e => e.target.style.color = "rgba(255,255,255,0.3)"}>✕</button>
                </div>
              </div>
              <p className="text-xs mb-4 truncate"
                style={{ fontFamily: "JetBrains Mono, monospace", color: "rgba(255,255,255,0.3)" }}>
                {summary.filename}
              </p>
              <div className="text-sm leading-relaxed whitespace-pre-wrap"
                style={{ color: "rgba(255,255,255,0.7)" }}>
                {summary.summary}
              </div>
            </div>
          )}

          {/* Compare Panel */}
          {compareResult && (
            <div className="mt-8 rounded-2xl p-6"
              style={{ background: "rgba(0,212,255,0.03)", border: "1px solid rgba(0,212,255,0.2)" }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-cyan-400" />
                  <span className="text-sm font-medium tracking-wider"
                    style={{ fontFamily: "Orbitron, sans-serif", color: "#00d4ff" }}>COMPARISON ANALYSIS</span>
                </div>
                <button onClick={() => setCompareResult(null)} className="text-xs transition-colors"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                  onMouseEnter={e => e.target.style.color = "#ff5252"}
                  onMouseLeave={e => e.target.style.color = "rgba(255,255,255,0.3)"}>✕</button>
              </div>
              <div className="flex gap-2 mb-4">
                <span className="px-3 py-1 rounded-lg text-xs truncate max-w-xs"
                  style={{ background: "rgba(0,212,255,0.06)", border: "1px solid rgba(0,212,255,0.2)", color: "#00d4ff", fontFamily: "JetBrains Mono, monospace" }}>
                  {compareResult.filename1}
                </span>
                <span className="text-xs flex items-center" style={{ color: "rgba(255,255,255,0.3)" }}>vs</span>
                <span className="px-3 py-1 rounded-lg text-xs truncate max-w-xs"
                  style={{ background: "rgba(123,95,255,0.06)", border: "1px solid rgba(123,95,255,0.2)", color: "#7b5fff", fontFamily: "JetBrains Mono, monospace" }}>
                  {compareResult.filename2}
                </span>
              </div>
              <div className="text-sm leading-relaxed whitespace-pre-wrap"
                style={{ color: "rgba(255,255,255,0.7)" }}>
                {compareResult.comparison}
              </div>
            </div>
          )}

        </div>
      </main>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
    </div>
  );
}