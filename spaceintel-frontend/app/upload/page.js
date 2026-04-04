"use client";
import { useState, useRef, useEffect } from "react";
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

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);

  const getToken = () => localStorage.getItem("token");

  const handleFile = (f) => {
    if (!f || !f.name.endsWith(".pdf")) { setError("Only PDF files are allowed."); return; }
    setFile(f); setError(null); setResult(null); setStatus(""); setProgress(0);
  };

  const handleDrop = (e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true); setError(null); setResult(null); setProgress(0); setStatus("Uploading file...");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await axios.post("http://localhost:8000/documents/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          "Authorization": `Bearer ${getToken()}`,
        },
        onUploadProgress: (e) => {
          const pct = Math.round((e.loaded * 100) / e.total);
          setProgress(pct);
          setStatus(pct < 100 ? `Uploading... ${pct}%` : "Processing and indexing PDF...");
        },
      });
      setProgress(100); setStatus("Indexed successfully!"); setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Upload failed. Please try again.");
      setStatus("");
    } finally {
      setUploading(false);
    }
  };

  const resetUpload = () => { setFile(null); setProgress(0); setStatus(""); setResult(null); setError(null); };

  return (
    <div className="flex min-h-screen" style={{ background: "#03060e" }}>
      <StarField />
      <div className="fixed inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse at 80% 10%, rgba(0,100,160,0.08) 0%, transparent 50%), radial-gradient(ellipse at 10% 90%, rgba(80,20,120,0.08) 0%, transparent 50%)",
        zIndex: 0,
      }} />
      <Sidebar />
      <main className="ml-64 flex-1 p-8 relative z-10">
        <div className="max-w-2xl mx-auto pt-12">

          <div className="mb-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400"
                style={{ animation: "pulse 1.5s infinite", boxShadow: "0 0 6px rgba(0,212,255,0.8)" }} />
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", letterSpacing: "3px", color: "rgba(0,212,255,0.6)" }}>
                DOCUMENT INDEXING
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-widest mb-2"
              style={{ fontFamily: "Orbitron, sans-serif" }}>UPLOAD</h2>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "DM Sans, sans-serif" }}>
              Index a space research PDF into SpaceIntel
            </p>
          </div>

          {!result && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => !file && fileInputRef.current?.click()}
              className="relative rounded-2xl transition-all cursor-pointer"
              style={{
                background: dragging ? "rgba(0,212,255,0.05)" : file ? "rgba(0,212,255,0.03)" : "rgba(255,255,255,0.02)",
                border: `2px dashed ${dragging ? "rgba(0,212,255,0.5)" : file ? "rgba(0,212,255,0.3)" : "rgba(255,255,255,0.08)"}`,
                padding: "48px 32px",
              }}>
              <input ref={fileInputRef} type="file" accept=".pdf" className="hidden"
                onChange={(e) => handleFile(e.target.files[0])} />
              {!file ? (
                <div className="text-center">
                  <div className="text-4xl mb-4" style={{ opacity: 0.2 }}>⬆</div>
                  <p className="text-sm mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>Drag & drop a PDF here</p>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>or click to browse</p>
                  <p className="text-xs mt-3" style={{ color: "rgba(255,255,255,0.15)", fontFamily: "JetBrains Mono, monospace" }}>MAX SIZE: 200MB</p>
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-3xl mb-3">📄</div>
                  <p className="text-white text-sm font-medium mb-1 truncate max-w-xs mx-auto">{file.name}</p>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  {!uploading && (
                    <button onClick={(e) => { e.stopPropagation(); resetUpload(); }}
                      className="mt-3 text-xs transition-colors"
                      style={{ color: "rgba(255,255,255,0.3)" }}
                      onMouseEnter={e => e.target.style.color = "#ff5252"}
                      onMouseLeave={e => e.target.style.color = "rgba(255,255,255,0.3)"}>
                      ✕ Remove
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {uploading && (
            <div className="mt-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs" style={{ fontFamily: "JetBrains Mono, monospace", color: "rgba(255,255,255,0.3)" }}>{status}</span>
                <span className="text-xs text-cyan-400" style={{ fontFamily: "JetBrains Mono, monospace" }}>{progress}%</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                <div className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${progress}%`, background: progress < 100 ? "linear-gradient(90deg, #00d4ff, #7b5fff)" : "#00e676" }} />
              </div>
              {progress === 100 && (
                <p className="text-xs mt-2 text-center" style={{ fontFamily: "JetBrains Mono, monospace", color: "rgba(255,255,255,0.2)" }}>
                  Indexing may take 1-2 minutes for large PDFs...
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="mt-4 px-4 py-3 rounded-xl text-sm"
              style={{ background: "rgba(255,82,82,0.08)", border: "1px solid rgba(255,82,82,0.2)", color: "#ff5252" }}>
              {error}
            </div>
          )}

          {file && !uploading && !result && (
            <button onClick={handleUpload}
              className="w-full mt-6 py-3.5 rounded-2xl text-sm font-medium tracking-widest transition-all"
              style={{ background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.25)", color: "#00d4ff", fontFamily: "Orbitron, sans-serif" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(0,212,255,0.15)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(0,212,255,0.08)"}>
              INDEX DOCUMENT
            </button>
          )}

          {result && (
            <div className="mt-6 rounded-2xl p-6"
              style={{ background: "rgba(0,230,118,0.04)", border: "1px solid rgba(0,230,118,0.2)" }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-green-400"></div>
                <span className="text-green-400 text-sm tracking-wider" style={{ fontFamily: "Orbitron, sans-serif" }}>INDEXED SUCCESSFULLY</span>
              </div>
              <p className="text-white text-sm font-medium mb-4 truncate">{result.filename}</p>
              <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                  { label: "PAGES", value: result.total_pages },
                  { label: "CHUNKS", value: result.total_chunks },
                  { label: "AGENCY", value: result.metadata?.agency || "Unknown" },
                ].map((item) => (
                  <div key={item.label} className="text-center rounded-xl py-3"
                    style={{ background: "rgba(0,212,255,0.04)", border: "1px solid rgba(0,212,255,0.08)" }}>
                    <p className="text-lg font-bold text-cyan-400" style={{ fontFamily: "Orbitron, sans-serif" }}>{item.value}</p>
                    <p className="text-xs mt-1" style={{ fontFamily: "JetBrains Mono, monospace", color: "rgba(255,255,255,0.25)" }}>{item.label}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={resetUpload}
                  className="flex-1 py-3 rounded-xl text-sm tracking-widest transition-all"
                  style={{ background: "rgba(0,212,255,0.06)", border: "1px solid rgba(0,212,255,0.2)", color: "#00d4ff", fontFamily: "Orbitron, sans-serif" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(0,212,255,0.12)"}
                  onMouseLeave={e => e.currentTarget.style.background = "rgba(0,212,255,0.06)"}>
                  UPLOAD ANOTHER
                </button>
                <button onClick={() => window.location.href = "/chat"}
                  className="flex-1 py-3 rounded-xl text-sm tracking-widest transition-all"
                  style={{ background: "rgba(0,230,118,0.06)", border: "1px solid rgba(0,230,118,0.2)", color: "#00e676", fontFamily: "Orbitron, sans-serif" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(0,230,118,0.12)"}
                  onMouseLeave={e => e.currentTarget.style.background = "rgba(0,230,118,0.06)"}>
                  ASK AI →
                </button>
              </div>
            </div>
          )}

        </div>
      </main>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
    </div>
  );
}