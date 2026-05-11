"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "../components/Sidebar";
import { useTranslation } from "react-i18next";

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

function formatDate(dateText, unknownLabel, locale = undefined) {
  try {
    return new Date(dateText).toLocaleString(locale, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return unknownLabel;
  }
}

const MAX_FEED_ITEMS = 18;
const LATEST_WINDOW_DAYS = 14;

function normalizeLanguageCode(rawLanguage) {
  const normalized = (rawLanguage || "en").toLowerCase();
  if (normalized.startsWith("hi")) return "hi";
  if (normalized.startsWith("te")) return "te";
  if (normalized.startsWith("ta")) return "ta";
  if (normalized.startsWith("kn")) return "kn";
  if (normalized.startsWith("ml")) return "ml";
  if (normalized.startsWith("bn")) return "bn";
  return "en";
}

function normalizeArticles(items) {
  const seen = new Set();
  const deduped = [];
  const now = Date.now();
  const cutoff = now - LATEST_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  (items || []).forEach((item) => {
    if (!item || seen.has(item.id)) return;
    const publishedAt = new Date(item?.published_at || 0).getTime();
    if (!Number.isFinite(publishedAt) || publishedAt < cutoff) return;
    seen.add(item.id);
    deduped.push(item);
  });

  return deduped.sort((a, b) => {
    const aTime = new Date(a?.published_at || 0).getTime();
    const bTime = new Date(b?.published_at || 0).getTime();
    return bTime - aTime;
  }).slice(0, MAX_FEED_ITEMS);
}

function NewsThumbnail({ article, fallbackTitle, imagePlaceholderLabel }) {
  const [failed, setFailed] = useState(false);
  const imageUrl = article?.image_url || article?.imageUrl || article?.featured_image || "";
  const showImage = imageUrl && !failed;

  return (
    <div
      className="mb-4 rounded-xl overflow-hidden"
      style={{
        height: "180px",
        background: "linear-gradient(135deg, rgba(0,212,255,0.08), rgba(123,95,255,0.08))",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {showImage ? (
        <img
          src={imageUrl}
          alt={article?.title || fallbackTitle}
          className="w-full h-full"
          style={{ objectFit: "cover" }}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center"
          style={{
            color: "rgba(255,255,255,0.45)",
            fontFamily: "JetBrains Mono, monospace",
            fontSize: "11px",
            letterSpacing: "1px",
          }}
        >
          {imagePlaceholderLabel}
        </div>
      )}
    </div>
  );
}

function articleMatchesWatchlist(article, keywords) {
  if (!Array.isArray(keywords) || keywords.length === 0) return false;
  const hay = `${article?.title || ""} ${article?.summary || ""} ${article?.news_site || ""} ${article?.url || ""}`.toLowerCase();
  return keywords.some((keyword) => hay.includes((keyword || "").toLowerCase()));
}

export default function NewsPage() {
  const [articles, setArticles] = useState([]);
  const [translatedArticlesById, setTranslatedArticlesById] = useState({});
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
  const { t, i18n } = useTranslation();
  const activeLanguage = useMemo(
    () => normalizeLanguageCode(i18n.resolvedLanguage || i18n.language),
    [i18n.language, i18n.resolvedLanguage]
  );

  const endpoints = useMemo(
    () => ({
      general: "https://api.spaceflightnewsapi.net/v4/articles/?limit=24&ordering=-published_at",
      isroBoost: [
        "https://api.spaceflightnewsapi.net/v4/articles/?limit=10&search=isro",
        "https://api.spaceflightnewsapi.net/v4/articles/?limit=8&search=chandrayaan",
        "https://api.spaceflightnewsapi.net/v4/articles/?limit=8&search=gaganyaan",
        "https://api.spaceflightnewsapi.net/v4/articles/?limit=8&search=aditya",
      ],
    }),
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

  const fetchEndpointArticles = useCallback(async (baseUrl, { bustCache = false } = {}) => {
    const url = bustCache ? `${baseUrl}&_=${Date.now()}` : baseUrl;
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("endpoint_fetch_failed");
    }

    const data = await response.json();
    return Array.isArray(data?.results) ? data.results : [];
  }, []);

  const requestNews = useCallback(async ({ bustCache = false } = {}) => {
    const requests = [
      fetchEndpointArticles(endpoints.general, { bustCache }),
      ...endpoints.isroBoost.map((url) => fetchEndpointArticles(url, { bustCache })),
    ];

    const settled = await Promise.allSettled(requests);
    const merged = [];

    settled.forEach((result) => {
      if (result.status === "fulfilled" && Array.isArray(result.value)) {
        merged.push(...result.value);
      }
    });

    if (merged.length === 0) {
      throw new Error(t("news_fetch_failed"));
    }

    return normalizeArticles(merged);
  }, [endpoints, fetchEndpointArticles, t]);

  const translateVisibleArticles = useCallback(async (visibleArticles, languageCode) => {
    if (!Array.isArray(visibleArticles) || visibleArticles.length === 0 || languageCode === "en") {
      return {};
    }

    try {
      const payload = {
        language: languageCode,
        articles: visibleArticles.slice(0, 20).map((article) => ({
          id: String(article.id),
          title: article.title || "",
          summary: article.summary || "",
        })),
      };

      const response = await fetch("http://localhost:8000/news/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        return {};
      }

      const data = await response.json();
      if (!Array.isArray(data?.items)) {
        return {};
      }

      return data.items.reduce((acc, item) => {
        const itemId = String(item?.id || "").trim();
        if (!itemId) return acc;
        acc[itemId] = {
          title: String(item?.title || "").trim(),
          summary: String(item?.summary || "").trim(),
        };
        return acc;
      }, {});
    } catch {
      return {};
    }
  }, []);

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

        const unseenItems = items.filter((item) => !currentIdsRef.current.has(item.id));
        const unseenCount = watchlist.length > 0
          ? unseenItems.filter((item) => articleMatchesWatchlist(item, watchlist)).length
          : unseenItems.length;
        if (unseenCount > 0) {
          setPendingArticles(items);
          setNewStoriesCount(unseenCount);
        }
      } catch {
        if (!background) {
          setError(t("news_load_failed"));
          setArticles([]);
          setPendingArticles([]);
          setNewStoriesCount(0);
        }
      } finally {
        if (withLoader) setLoading(false);
      }
    },
    [applyVisibleArticles, requestNews, t, watchlist]
  );

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      const latestItems = await requestNews({ bustCache: true });
      applyVisibleArticles(latestItems);
      setRefreshVersion((v) => v + 1);
    } catch {
      setError(t("news_load_failed"));
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNews({ withLoader: true });
  }, [fetchNews]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const translated = await translateVisibleArticles(articles, activeLanguage);
      if (!cancelled) {
        setTranslatedArticlesById(translated);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [activeLanguage, articles, translateVisibleArticles]);

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
    const values = watchlistInput
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    if (values.length === 0) return;

    setWatchlist((prev) => {
      const existing = new Set(prev.map((item) => item.toLowerCase()));
      const next = [...prev];

      values.forEach((value) => {
        const normalized = value.toLowerCase();
        if (!existing.has(normalized)) {
          next.push(value);
          existing.add(normalized);
        }
      });

      return next.slice(-10);
    });

    setWatchlistInput("");
  };

  const removeWatchKeyword = (keyword) => {
    setWatchlist((prev) => prev.filter((k) => k !== keyword));
  };

  const matchingCount = watchlist.length === 0
    ? 0
    : articles.filter((article) => {
        const translated = translatedArticlesById[String(article.id)];
        const articleForMatch = translated
          ? {
              ...article,
              title: translated.title || article.title,
              summary: translated.summary || article.summary,
            }
          : article;
        return articleMatchesWatchlist(articleForMatch, watchlist);
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
                  {t("news_live_label")}
                </span>
              </div>

              <h2
                className="text-2xl font-bold text-white tracking-widest"
                style={{ fontFamily: "Orbitron, sans-serif" }}
              >
                {t("news_title")}
              </h2>
              <p
                className="text-sm mt-1"
                style={{ color: "rgba(255,255,255,0.3)", fontFamily: "DM Sans, sans-serif" }}
              >
                {t("news_subtitle")}
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
              {refreshing ? t("news_refreshing") : t("news_refresh_feed")}
            </button>

            <div
              className="text-xs"
              style={{
                color: "rgba(255,255,255,0.45)",
                fontFamily: "JetBrains Mono, monospace",
                letterSpacing: "0.5px",
              }}
            >
              {lastUpdatedAt ? `${t("news_updated_prefix")} ${formatDate(lastUpdatedAt, t("news_unknown_date"), activeLanguage)}` : `${t("news_updated_prefix")} --`}
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
                placeholder={t("news_watch_placeholder")}
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
                type="button"
                className="px-3 py-2 rounded-lg text-xs transition-all"
                style={{
                  background: "rgba(0,212,255,0.09)",
                  border: "1px solid rgba(0,212,255,0.3)",
                  color: "#00d4ff",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                {t("news_add_watch")}
              </button>
              <div
                className="text-xs"
                style={{ color: "rgba(255,255,255,0.55)", fontFamily: "JetBrains Mono, monospace" }}
              >
                {`${t("news_alerts")}: ${matchingCount}`}
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
                    title={t("news_remove_keyword")}
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
                {t("news_new_stories_available", { count: newStoriesCount })}
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
                {t("news_show_new_stories")}
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
              {t("news_empty")}
            </div>
          ) : (
            <div key={refreshVersion} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {articles.map((article) => {
                const translated = translatedArticlesById[String(article.id)];
                const displayTitle = translated?.title || article.title;
                const displaySummary = translated?.summary || article.summary;
                const articleForMatch = {
                  ...article,
                  title: displayTitle,
                  summary: displaySummary,
                };
                const isWatchMatch = articleMatchesWatchlist(articleForMatch, watchlist);
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
                  <NewsThumbnail
                    article={article}
                    fallbackTitle={t("news_title")}
                    imagePlaceholderLabel={t("news_title").toUpperCase()}
                  />

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
                      {article.news_site || t("news_source_fallback")}
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
                        {t("news_watchlist")}
                      </span>
                    )}
                    <span
                      className="text-xs"
                      style={{ color: "rgba(255,255,255,0.35)", fontFamily: "JetBrains Mono, monospace" }}
                    >
                      {formatDate(article.published_at, t("news_unknown_date"), activeLanguage)}
                    </span>
                  </div>

                  <h3
                    className="text-lg mb-2"
                    style={{ color: "#ffffff", fontFamily: "Syne, sans-serif", lineHeight: 1.35 }}
                  >
                    {displayTitle}
                  </h3>

                  <p
                    className="text-sm mb-4"
                    style={{ color: "rgba(255,255,255,0.62)", fontFamily: "DM Sans, sans-serif", lineHeight: 1.6 }}
                  >
                    {displaySummary || t("news_no_summary")}
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
                    {t("news_read_article")}
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
