"use client";
import { useState, useRef, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import ReactMarkdown from "react-markdown";

const DEFAULT_SETTINGS = {
  language: "English",
  notifications: true,
  autoExport: false,
  fontSize: "medium",
  responseLength: "balanced",
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

function FactCheckPanel({ facts }) {
  const [expanded, setExpanded] = useState(false);
  if (!facts || facts.length === 0) return null;
  const unsupported = facts.filter((f) => !f.supported).length;
  return (
    <div className="mt-3">
      <button onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs transition-colors"
        style={{ fontFamily: "JetBrains Mono, monospace", color: unsupported > 0 ? "#ff5252" : "#00e676" }}>
        <span>{expanded ? "▼" : "▶"}</span>
        <span className="tracking-widest">
          FACT CHECK · {unsupported > 0 ? `${unsupported} UNVERIFIED` : "ALL VERIFIED"}
        </span>
      </button>
      {expanded && (
        <div className="mt-2 space-y-1.5">
          {facts.map((fact, i) => (
            <div key={i} className="flex items-start gap-3 px-3 py-2 rounded-lg"
              style={{
                background: fact.supported ? "rgba(0,230,118,0.05)" : "rgba(255,82,82,0.05)",
                border: `1px solid ${fact.supported ? "rgba(0,230,118,0.15)" : "rgba(255,82,82,0.15)"}`,
              }}>
              <span style={{ color: fact.supported ? "#00e676" : "#ff5252" }} className="mt-0.5 flex-shrink-0">
                {fact.supported ? "✓" : "⚠"}
              </span>
              <p className="text-sm leading-relaxed" style={{ color: fact.supported ? "#a0c0a0" : "#e0a0a0" }}>
                {fact.claim}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SourcePanel({ sources }) {
  const [expanded, setExpanded] = useState(false);
  const openPdf = (src) => {
    const token = localStorage.getItem("token");
    window.open(
      `http://localhost:8000/documents/pdf/${encodeURIComponent(src.filename)}?token=${token}#page=${src.page_number}`,
      "_blank"
    );
  };
  return (
    <div className="mt-3">
      <button onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs text-gray-600 hover:text-cyan-400 transition-colors"
        style={{ fontFamily: "JetBrains Mono, monospace" }}>
        <span>{expanded ? "▼" : "▶"}</span>
        <span className="tracking-widest">{sources.length} SOURCE{sources.length > 1 ? "S" : ""}</span>
      </button>
      {expanded && (
        <div className="mt-2 space-y-2">
          {sources.map((src, i) => (
            <div key={i} className="rounded-xl px-4 py-3 cursor-pointer group transition-all"
              style={{ background: "rgba(0,212,255,0.03)", border: "1px solid rgba(0,212,255,0.1)" }}
              onClick={() => openPdf(src)}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-bold text-cyan-400"
                  style={{ fontFamily: "JetBrains Mono, monospace" }}>
                  PAGE {src.page_number}
                </span>
                <div className="flex-1 h-px" style={{ background: "rgba(0,212,255,0.1)" }} />
                <span className="text-xs text-gray-700 group-hover:text-cyan-500 transition-colors">
                  OPEN PDF →
                </span>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">{src.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MessageContent({ content, streaming, fontSize }) {
  const size = fontSize || "16px";

  return (
    <div className="prose prose-invert prose-sm max-w-none" style={{ color: "#ddeeff", lineHeight: "1.75" }}>
      <ReactMarkdown components={{
        h1: ({ children }) => <h1 className="text-xl font-bold text-white mt-4 mb-2" style={{ fontFamily: "Orbitron, sans-serif" }}>{children}</h1>,
        h2: ({ children }) => <h2 className="text-lg font-semibold text-cyan-300 mt-4 mb-2">{children}</h2>,
        h3: ({ children }) => <h3 className="text-base font-semibold text-cyan-400 mt-3 mb-1">{children}</h3>,
        p: ({ children }) => <p className="mb-3 leading-relaxed text-gray-300" style={{ fontSize: size }}>{children}</p>,
        ul: ({ children }) => <ul className="mb-3 space-y-1 pl-1">{children}</ul>,
        ol: ({ children }) => <ol className="mb-3 space-y-1 pl-4 list-decimal">{children}</ol>,
        li: ({ children }) => (
          <li className="text-gray-300 flex gap-2 items-start" style={{ fontSize: size }}>
            <span className="text-cyan-400 mt-1 flex-shrink-0">·</span>
            <span>{children}</span>
          </li>
        ),
        strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
        em: ({ children }) => <em className="text-cyan-200 italic">{children}</em>,
        code: ({ inline, children }) => inline ? (
          <code className="px-1.5 py-0.5 rounded text-cyan-300"
            style={{ background: "rgba(0,212,255,0.1)", fontFamily: "JetBrains Mono, monospace" }}>
            {children}
          </code>
        ) : (
          <pre className="p-4 rounded-xl overflow-x-auto mb-3"
            style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(0,212,255,0.1)", fontFamily: "JetBrains Mono, monospace", color: "#00d4ff" }}>
            <code>{children}</code>
          </pre>
        ),
        table: ({ children }) => <div className="overflow-x-auto mb-3"><table className="w-full text-sm border-collapse">{children}</table></div>,
        th: ({ children }) => <th className="px-3 py-2 text-left text-cyan-400 font-semibold text-sm" style={{ background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.1)", fontFamily: "JetBrains Mono, monospace" }}>{children}</th>,
        td: ({ children }) => <td className="px-3 py-2 text-gray-300 text-sm" style={{ border: "1px solid rgba(255,255,255,0.05)" }}>{children}</td>,
        blockquote: ({ children }) => <blockquote className="pl-4 py-1 my-3 text-gray-400 italic text-base" style={{ borderLeft: "3px solid rgba(0,212,255,0.4)" }}>{children}</blockquote>,
      }}>
        {content}
      </ReactMarkdown>
      {streaming && (
        <span className="inline-block w-1.5 h-4 ml-0.5 animate-pulse"
          style={{ background: "#00d4ff", verticalAlign: "middle" }} />
      )}
    </div>
  );
}

export default function ChatPage() {
  const [messages, setMessages]               = useState([]);
  const [input, setInput]                     = useState("");
  const [loading, setLoading]                 = useState(false);
  const [listening, setListening]             = useState(false);
  const [currentStrategy, setCurrentStrategy] = useState(null);
  const [sessionId, setSessionId]             = useState(null);
  const [sessionLoading, setSessionLoading]   = useState(true);
  const [userSettings, setUserSettings]       = useState(DEFAULT_SETTINGS);
  const bottomRef   = useRef(null);
  const wsRef       = useRef(null);
  const textareaRef = useRef(null);

  const fontSizeMap = { small: "14px", medium: "16px", large: "18px" };
  const activeFontSize = fontSizeMap[userSettings.fontSize] || fontSizeMap.medium;

  // On mount: get or create session_id then load its messages
  useEffect(() => {
    let id = localStorage.getItem("session_id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("session_id", id);
    }
    setSessionId(id);
    loadSession(id);
  }, []);

  async function loadSession(id) {
    setSessionLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!id || !token || token === "undefined" || token === "null") {
        setMessages([]);
        return;
      }
      const res  = await fetch(
        `http://localhost:8000/history/sessions/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setMessages([]);
        return;
      }

      if (!res.ok) {
        setMessages([]);
        return;
      }

      const data = await res.json();
      if (data.messages && data.messages.length > 0) {
        const loaded = data.messages.flatMap(m => ([
          { role: "user", content: m.question },
          { role: "bot",  content: m.answer, streaming: false, sources: [], facts: [] },
        ]));
        setMessages(loaded);
      } else {
        setMessages([]);
      }
    } catch {
      setMessages([]);
    } finally {
      setSessionLoading(false);
    }
  }

  // Listen for sidebar session switches
  useEffect(() => {
    const handler = (e) => {
      const { sessionId: newId } = e.detail;
      localStorage.setItem("session_id", newId);
      setSessionId(newId);
      setMessages([]);
      loadSession(newId);
    };
    window.addEventListener("spaceintel:load-session", handler);
    return () => window.removeEventListener("spaceintel:load-session", handler);
  }, []);

  useEffect(() => {
    const loadSettings = () => {
      const raw = localStorage.getItem("spaceintel_settings");
      if (!raw) {
        setUserSettings(DEFAULT_SETTINGS);
        return;
      }

      try {
        const parsed = JSON.parse(raw);
        setUserSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } catch {
        setUserSettings(DEFAULT_SETTINGS);
      }
    };

    const onStorage = (e) => {
      if (e.key === "spaceintel_settings") loadSettings();
    };

    loadSettings();
    window.addEventListener("storage", onStorage);
    window.addEventListener("spaceintel:settings-updated", loadSettings);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("spaceintel:settings-updated", loadSettings);
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // WebSocket connection with auto-reconnect
  useEffect(() => {
    let ws;
    let reconnectTimeout;
    let isUnmounted = false;
    const connect = () => {
      if (isUnmounted) return;
      ws = new WebSocket("ws://localhost:8000/ws/ask");
      ws.onopen = () => { wsRef.current = ws; };
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "strategy") setCurrentStrategy(data.label);
        if (data.type === "token") {
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.role === "bot" && last.streaming) {
              return prev.map((m, i) =>
                i === prev.length - 1 ? { ...m, content: m.content + data.content } : m
              );
            }
            return [...prev, { role: "bot", content: data.content, streaming: true, sources: [], facts: [] }];
          });
        }
        if (data.type === "done") {
          if (data.session_id) {
            localStorage.setItem("session_id", data.session_id);
            setSessionId(data.session_id);
          }
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.role === "bot") {
              updated[updated.length - 1] = {
                ...last,
                streaming: false,
                sources: data.sources,
                facts: data.fact_check || [],
              };
            }
            return updated;
          });
          setCurrentStrategy(null);
          setLoading(false);
          // Refresh sidebar only after backend has saved this turn.
          window.dispatchEvent(new CustomEvent("spaceintel:session-updated"));
        }
        if (data.type === "answer") {
          setMessages((prev) => [...prev, {
            role: "bot", content: data.content,
            streaming: false, sources: [], facts: [],
          }]);
          setCurrentStrategy(null);
          setLoading(false);
          // Refresh sidebar for non-streaming/guardrail answers as well.
          window.dispatchEvent(new CustomEvent("spaceintel:session-updated"));
        }
      };
      ws.onclose = () => {
        wsRef.current = null;
        if (!isUnmounted) reconnectTimeout = setTimeout(connect, 3000);
      };
      ws.onerror = () => { setLoading(false); ws.close(); };
    };
    connect();
    return () => { isUnmounted = true; clearTimeout(reconnectTimeout); if (ws) ws.close(); };
  }, []);

  const sendMessage = () => {
    const question = input.trim();
    if (!question || loading) return;
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setInput("");
    setLoading(true);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        question,
        token:      localStorage.getItem("token"),
        session_id: localStorage.getItem("session_id"),
        response_length: userSettings.responseLength,
        language: userSettings.language,
      }));
    } else {
      setMessages((prev) => [...prev, {
        role: "bot", content: "Connection error. Please refresh the page.",
        streaming: false, sources: [], facts: [],
      }]);
      setLoading(false);
    }
  };

  const exportReport = async () => {
    if (messages.length === 0) return;
    try {
      const res = await fetch("http://localhost:8000/documents/export-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      });
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = "spaceintel_report.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Export failed. Please try again.");
    }
  };

  const startVoice = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      alert("Voice input not supported in this browser. Use Chrome.");
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart  = () => setListening(true);
    recognition.onend    = () => setListening(false);
    recognition.onerror  = () => setListening(false);
    recognition.onresult = (event) => setInput(event.results[0][0].transcript);
    recognition.start();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleInput = (e) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
  };

  return (
    <div className="flex min-h-screen" style={{ background: "#03060e" }}>
      <StarField />
      <div className="fixed inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse at 80% 10%, rgba(0,100,160,0.08) 0%, transparent 50%), radial-gradient(ellipse at 10% 90%, rgba(80,20,120,0.08) 0%, transparent 50%)",
        zIndex: 0,
      }} />
      <Sidebar />
      <main className="ml-64 flex-1 flex flex-col h-screen relative z-10">

        {/* Header */}
        <div className="px-8 py-4 flex items-center justify-between flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(0,212,255,0.08)" }}>
          <div>
            <h2 className="font-bold text-white tracking-widest text-base"
              style={{ fontFamily: "Orbitron, sans-serif" }}>ASK AI</h2>
            <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.25)" }}>
              Query your space documents
            </p>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button onClick={exportReport}
                className="px-3 py-1.5 rounded-full text-sm transition-all"
                style={{ background: "rgba(0,230,118,0.08)", border: "1px solid rgba(0,230,118,0.2)", color: "#00e676", fontFamily: "JetBrains Mono, monospace" }}>
                ↓ EXPORT PDF
              </button>
            )}
            {currentStrategy && (
              <div className="px-3 py-1.5 rounded-full"
                style={{ background: "rgba(123,95,255,0.1)", border: "1px solid rgba(123,95,255,0.2)" }}>
                <span className="text-sm text-violet-400" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                  {currentStrategy.toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{ background: "rgba(0,212,255,0.05)", border: "1px solid rgba(0,212,255,0.1)" }}>
              <div className="w-1.5 h-1.5 rounded-full bg-green-400"
                style={{ animation: "pulse 1.5s infinite" }} />
              <span className="text-sm" style={{ fontFamily: "JetBrains Mono, monospace", color: "rgba(255,255,255,0.3)" }}>
                llama-3.3-70b
              </span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {sessionLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex gap-1.5">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-2 h-2 rounded-full"
                    style={{ background: "rgba(0,212,255,0.4)", animation: `pulse 1s infinite ${i * 0.2}s` }} />
                ))}
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="text-5xl mb-6" style={{ opacity: 0.08 }}>◈</div>
              <h3 className="text-xl font-medium mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>
                Ready for queries
              </h3>
              <p className="text-base max-w-sm" style={{ color: "rgba(255,255,255,0.2)" }}>
                Ask anything about your uploaded space research documents
              </p>
            </div>
          ) : (
            <div className="py-6">
              {messages.map((msg, idx) => (
                <div key={idx} className="px-8 py-5 hover:bg-white/[0.01] transition-colors"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.02)" }}>
                  {msg.role === "user" ? (
                    <div className="flex justify-end">
                      <div className="max-w-xl">
                        <div className="flex items-center gap-2 justify-end mb-2">
                          <span className="text-xs text-gray-600"
                            style={{ fontFamily: "JetBrains Mono, monospace" }}>YOU</span>
                          <div className="w-6 h-6 rounded-md flex items-center justify-center text-xs"
                            style={{ background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.2)", color: "#00d4ff" }}>
                            U
                          </div>
                        </div>
                        <p className="text-gray-200 leading-relaxed text-right" style={{ fontSize: activeFontSize }}>{msg.content}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="max-w-3xl">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-md flex items-center justify-center text-xs"
                          style={{ background: "rgba(123,95,255,0.1)", border: "1px solid rgba(123,95,255,0.2)", color: "#7b5fff" }}>
                          ✦
                        </div>
                        <span className="text-xs text-violet-500"
                          style={{ fontFamily: "JetBrains Mono, monospace" }}>SPACEINTEL</span>
                      </div>
                      <MessageContent content={msg.content} streaming={msg.streaming} fontSize={activeFontSize} />
                      {!msg.streaming && msg.facts?.length > 0 && <FactCheckPanel facts={msg.facts} />}
                      {!msg.streaming && msg.sources?.length > 0 && <SourcePanel sources={msg.sources} />}
                    </div>
                  )}
                </div>
              ))}

              {loading && messages[messages.length - 1]?.role === "user" && (
                <div className="px-8 py-5">
                  <div className="max-w-3xl">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-md flex items-center justify-center text-xs"
                        style={{ background: "rgba(123,95,255,0.1)", border: "1px solid rgba(123,95,255,0.2)", color: "#7b5fff" }}>
                        ✦
                      </div>
                      <span className="text-xs text-violet-500"
                        style={{ fontFamily: "JetBrains Mono, monospace" }}>SPACEINTEL</span>
                    </div>
                    <div className="flex gap-1.5 items-center h-5">
                      {[0, 1, 2].map(i => (
                        <div key={i} className="w-2 h-2 rounded-full"
                          style={{ background: "rgba(0,212,255,0.5)", animation: `pulse 1s infinite ${i * 0.2}s` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="flex-shrink-0 px-8 py-5"
          style={{ borderTop: "1px solid rgba(0,212,255,0.08)" }}>
          <div className="max-w-3xl mx-auto relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Ask about space missions, satellites, research... (Enter to send, Shift+Enter for new line)"
              rows={1}
              className="w-full resize-none rounded-2xl px-5 py-4 pr-28 text-base text-white placeholder-gray-700 focus:outline-none transition-all"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(0,212,255,0.1)",
                fontFamily: "DM Sans, sans-serif",
                fontSize: activeFontSize,
                lineHeight: "1.6",
                maxHeight: "160px",
                scrollbarWidth: "none",
              }}
            />
            <div className="absolute right-3 bottom-3 flex gap-2">
              <button onClick={startVoice} disabled={loading || listening}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-base transition-all disabled:opacity-20"
                style={{
                  background: listening ? "rgba(255,82,82,0.15)" : "rgba(0,212,255,0.05)",
                  border: `1px solid ${listening ? "rgba(255,82,82,0.4)" : "rgba(0,212,255,0.2)"}`,
                  color: listening ? "#ff5252" : "#4a6880",
                }}>
                {listening ? "⬤" : "🎙"}
              </button>
              <button onClick={sendMessage} disabled={loading || !input.trim()}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all disabled:opacity-20"
                style={{
                  background: input.trim() ? "rgba(0,212,255,0.15)" : "rgba(0,212,255,0.05)",
                  border: "1px solid rgba(0,212,255,0.2)",
                  color: "#00d4ff",
                }}>↑</button>
            </div>
          </div>
          <p className="text-center text-sm mt-2" style={{ color: "rgba(255,255,255,0.15)" }}>
            SpaceIntel answers from your uploaded documents only
          </p>
        </div>

      </main>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}