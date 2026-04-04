"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "../components/Sidebar";

function StarField() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let animId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener("resize", resize);

    const stars = Array.from({ length: 220 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.2 + 0.1,
      o: Math.random() * 0.6 + 0.2,
      t: Math.random() * Math.PI * 2,
      s: Math.random() * 0.006 + 0.002,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach((star) => {
        star.t += star.s;
        const opacity = star.o * (0.6 + 0.4 * Math.sin(star.t));
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${opacity})`;
        ctx.fill();
      });
      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }} />;
}

function formatDate(dateText) {
  try {
    return new Date(dateText).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Unknown date";
  }
}

export default function NewsPage() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [error, setError] = useState("");
  const [pendingArticles, setPendingArticles] = useState([]);
  const [newStoriesCount, setNewStoriesCount] = useState(0);
  const [watchlist, setWatchlist] = useState([]);
  const [watchlistInput, setWatchlistInput] = useState("");
  const currentIdsRef = useRef(new Set());

  const endpoint = useMemo(
    () => "https://api.spaceflightnewsapi.net/v4/articles/?limit=18&ordering=-published_at",
    []
  );
  const POLL_INTERVAL_MS = 45000;

  useEffect(() => {
    const saved = localStorage.getItem("spaceintel_news_watchlist");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setWatchlist(parsed.slice(0, 10));
      } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("spaceintel_news_watchlist", JSON.stringify(watchlist));
  }, [watchlist]);

  const requestNews = useCallback(async ({ bustCache = false } = {}) => {
    const url = bustCache ? `${endpoint}&_=${Date.now()}` : endpoint;
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Failed to fetch latest space news.");
    }

    const data = await response.json();
    return Array.isArray(data?.results) ? data.results : [];
  }, [endpoint]);

  const applyVisibleArticles = useCallback((items) => {
    setArticles(items);
    currentIdsRef.current = new Set(items.map((item) => item.id));
    setPendingArticles([]);
    setNewStoriesCount(0);
    setLastUpdatedAt(new Date());
    setError("");
  }, []);

  const fetchNews = useCallback(
    async ({ withLoader = false, background = false, forceVisible = false, bustCache = false } = {}) => {
      if (withLoader) setLoading(true);

      try {
        const items = await requestNews({ bustCache });

        if (forceVisible || !background || currentIdsRef.current.size === 0) {
          applyVisibleArticles(items);
          return;
        }

        const unseenCount = items.filter((item) => !currentIdsRef.current.has(item.id)).length;
        if (unseenCount > 0) {
          setPendingArticles(items);
          setNewStoriesCount(unseenCount);
        }
      } catch {
        if (!background) {
          setError("Could not load the latest space news right now.");
          setArticles([]);
          setPendingArticles([]);
          setNewStoriesCount(0);
        }
      } finally {
        if (withLoader) setLoading(false);
      }
    },
    [applyVisibleArticles, requestNews]
  );

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await fetchNews({ forceVisible: true, bustCache: true });
    setRefreshVersion((v) => v + 1);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchNews({ withLoader: true });
  }, [fetchNews]);

  useEffect(() => {
    const id = setInterval(() => {
      fetchNews({ background: true });
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchNews]);

  const applyPendingNews = () => {
    if (pendingArticles.length > 0) {
      applyVisibleArticles(pendingArticles);
    }
  };

  const addWatchKeyword = () => {
    const value = watchlistInput.trim();
    if (!value) return;
    const exists = watchlist.some((k) => k.toLowerCase() === value.toLowerCase());
    if (!exists) setWatchlist((prev) => [...prev, value].slice(-10));
    setWatchlistInput("");
  };

  const removeWatchKeyword = (keyword) => {
    setWatchlist((prev) => prev.filter((k) => k !== keyword));
  };

  const matchingCount = watchlist.length === 0
    ? 0
    : articles.filter((a) => {
        const hay = `${a.title || ""} ${a.summary || ""}`.toLowerCase();
        return watchlist.some((k) => hay.includes(k.toLowerCase()));
      }).length;

  return (
    <div className="flex min-h-screen" style={{ background: "#03060e" }}>
      <StarField />

      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 80% 10%, rgba(0,100,160,0.08) 0%, transparent 50%), radial-gradient(ellipse at 10% 90%, rgba(80,20,120,0.08) 0%, transparent 50%)",
          zIndex: 0,
        }}
      />

      <Sidebar />

      <main className="ml-64 flex-1 p-8 relative z-10">
        <div className="max-w-5xl mx-auto pt-8">
          <div className="mb-8 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: "#00d4ff",
                    animation: "pulse 1.5s infinite",
                    boxShadow: "0 0 6px rgba(0,212,255,0.8)",
                  }}
                />
                <span
                  style={{
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: "10px",
                    letterSpacing: "3px",
                    color: "rgba(0,212,255,0.6)",
                  }}
                >
                  LIVE SPACEWIRE
                </span>
              </div>

              <h2
                className="text-2xl font-bold text-white tracking-widest"
                style={{ fontFamily: "Orbitron, sans-serif" }}
              >
                SPACE NEWS
              </h2>
              <p
                className="text-sm mt-1"
                style={{ color: "rgba(255,255,255,0.3)", fontFamily: "DM Sans, sans-serif" }}
              >
                Latest space related headlines from trusted aerospace publishers
              </p>
            </div>

            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="px-4 py-2 rounded-xl text-xs transition-all"
              style={{
                background: "rgba(0,212,255,0.06)",
                border: "1px solid rgba(0,212,255,0.25)",
                color: "#00d4ff",
                fontFamily: "JetBrains Mono, monospace",
                opacity: refreshing ? 0.75 : 1,
                cursor: refreshing ? "default" : "pointer",
              }}
              onMouseEnter={(e) => {
                if (!refreshing) e.currentTarget.style.background = "rgba(0,212,255,0.12)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(0,212,255,0.06)";
              }}
            >
              {refreshing ? "REFRESHING..." : "REFRESH FEED"}
            </button>

            <div
              className="text-xs"
              style={{
                color: "rgba(255,255,255,0.45)",
                fontFamily: "JetBrains Mono, monospace",
                letterSpacing: "0.5px",
              }}
            >
              {lastUpdatedAt ? `UPDATED ${formatDate(lastUpdatedAt)}` : "UPDATED --"}
            </div>
          </div>

          <div
            className="mb-4 rounded-xl p-3"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <input
                value={watchlistInput}
                onChange={(e) => setWatchlistInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addWatchKeyword();
                  }
                }}
                placeholder="Add watch keyword (e.g. ISRO, Artemis, Falcon)"
                style={{
                  flex: "1 1 320px",
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.03)",
                  color: "rgba(255,255,255,0.9)",
                  fontFamily: "DM Sans, sans-serif",
                  fontSize: "13px",
                }}
              />
              <button
                onClick={addWatchKeyword}
                className="px-3 py-2 rounded-lg text-xs transition-all"
                style={{
                  background: "rgba(0,212,255,0.09)",
                  border: "1px solid rgba(0,212,255,0.3)",
                  color: "#00d4ff",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                ADD WATCH
              </button>
              <div
                className="text-xs"
                style={{ color: "rgba(255,255,255,0.55)", fontFamily: "JetBrains Mono, monospace" }}
              >
                ALERTS: {matchingCount}
              </div>
            </div>

            {watchlist.length > 0 && (
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                {watchlist.map((keyword) => (
                  <button
                    key={keyword}
                    onClick={() => removeWatchKeyword(keyword)}
                    className="px-2 py-1 rounded-md text-xs"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      color: "rgba(255,255,255,0.85)",
                      fontFamily: "JetBrains Mono, monospace",
                    }}
                    title="Remove keyword"
                  >
                    {keyword} ×
                  </button>
                ))}
              </div>
            )}
          </div>

          {newStoriesCount > 0 && (
            <div
              className="mb-4 rounded-xl px-4 py-3 flex items-center justify-between gap-3 flex-wrap"
              style={{
                background: "rgba(0,212,255,0.05)",
                border: "1px solid rgba(0,212,255,0.2)",
              }}
            >
              <div
                className="text-sm"
                style={{ color: "#9adfff", fontFamily: "DM Sans, sans-serif" }}
              >
                {newStoriesCount} new stor{newStoriesCount === 1 ? "y is" : "ies are"} available.
              </div>
              <button
                onClick={applyPendingNews}
                className="px-3 py-2 rounded-lg text-xs transition-all"
                style={{
                  background: "rgba(0,212,255,0.1)",
                  border: "1px solid rgba(0,212,255,0.3)",
                  color: "#00d4ff",
                  fontFamily: "JetBrains Mono, monospace",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(0,212,255,0.16)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(0,212,255,0.1)";
                }}
              >
                SHOW NEW STORIES
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full"
                    style={{
                      background: "rgba(0,212,255,0.6)",
                      animation: `pulse 1s infinite ${i * 0.2}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          ) : error ? (
            <div
              className="rounded-2xl p-8 text-center"
              style={{
                background: "rgba(255,82,82,0.05)",
                border: "1px solid rgba(255,82,82,0.2)",
                color: "#ffb3b3",
                fontFamily: "DM Sans, sans-serif",
              }}
            >
              {error}
            </div>
          ) : articles.length === 0 ? (
            <div
              className="rounded-2xl p-12 text-center"
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.35)",
                fontFamily: "DM Sans, sans-serif",
              }}
            >
              No space news found.
            </div>
          ) : (
            <div key={refreshVersion} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {articles.map((article) => {
                const isWatchMatch = watchlist.length > 0 && watchlist.some((k) => {
                  const hay = `${article.title || ""} ${article.summary || ""}`.toLowerCase();
                  return hay.includes(k.toLowerCase());
                });
                return (
                <article
                  key={article.id}
                  className="rounded-2xl p-5 transition-all"
                  style={{
                    background: isWatchMatch ? "rgba(255,196,0,0.06)" : "rgba(255,255,255,0.02)",
                    border: isWatchMatch ? "1px solid rgba(255,196,0,0.28)" : "1px solid rgba(255,255,255,0.08)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.border = "1px solid rgba(0,212,255,0.3)";
                    e.currentTarget.style.background = "rgba(0,212,255,0.04)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.border = isWatchMatch
                      ? "1px solid rgba(255,196,0,0.28)"
                      : "1px solid rgba(255,255,255,0.08)";
                    e.currentTarget.style.background = isWatchMatch
                      ? "rgba(255,196,0,0.06)"
                      : "rgba(255,255,255,0.02)";
                  }}
                >
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className="px-2 py-1 rounded-lg text-xs"
                      style={{
                        background: "rgba(0,212,255,0.06)",
                        border: "1px solid rgba(0,212,255,0.2)",
                        color: "#00d4ff",
                        fontFamily: "JetBrains Mono, monospace",
                      }}
                    >
                      {article.news_site || "Space Source"}
                    </span>
                    {isWatchMatch && (
                      <span
                        className="px-2 py-1 rounded-lg text-[10px]"
                        style={{
                          background: "rgba(255,196,0,0.14)",
                          border: "1px solid rgba(255,196,0,0.35)",
                          color: "#ffd166",
                          fontFamily: "JetBrains Mono, monospace",
                          letterSpacing: "0.4px",
                        }}
                      >
                        WATCHLIST
                      </span>
                    )}
                    <span
                      className="text-xs"
                      style={{ color: "rgba(255,255,255,0.35)", fontFamily: "JetBrains Mono, monospace" }}
                    >
                      {formatDate(article.published_at)}
                    </span>
                  </div>

                  <h3
                    className="text-lg mb-2"
                    style={{ color: "#ffffff", fontFamily: "Syne, sans-serif", lineHeight: 1.35 }}
                  >
                    {article.title}
                  </h3>

                  <p
                    className="text-sm mb-4"
                    style={{ color: "rgba(255,255,255,0.62)", fontFamily: "DM Sans, sans-serif", lineHeight: 1.6 }}
                  >
                    {article.summary || "No summary available."}
                  </p>

                  <a
                    href={article.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.09)",
                      color: "rgba(255,255,255,0.78)",
                      fontFamily: "JetBrains Mono, monospace",
                      letterSpacing: "0.5px",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(0,212,255,0.09)";
                      e.currentTarget.style.borderColor = "rgba(0,212,255,0.25)";
                      e.currentTarget.style.color = "#00d4ff";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)";
                      e.currentTarget.style.color = "rgba(255,255,255,0.78)";
                    }}
                  >
                    READ ARTICLE
                    <span>↗</span>
                  </a>
                </article>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
