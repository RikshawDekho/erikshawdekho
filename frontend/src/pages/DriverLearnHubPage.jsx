/**
 * DriverLearnHubPage — Driver content hub for videos and blogs.
 * Public route, no login required.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/NavbarNew";
import FooterNew from "../components/FooterNew";
import { useI18n } from "../i18n";
import { CardSkeleton } from "../components/PageSkeleton";
import { ROLE_C, TYPO, RADIUS, CONTROL, LAYOUT } from "../theme";

const API = import.meta.env.VITE_API_URL || (import.meta.env.MODE === "demo" ? "https://demo-api.erikshawdekho.com/api" : import.meta.env.MODE === "development" ? "http://localhost:8000/api" : "https://api.erikshawdekho.com/api");
const G = ROLE_C.driver;
const D = ROLE_C.dealer;

const VIDEO_CATEGORY_META = {
  tutorial: "learn.category.tutorial",
  maintenance: "learn.category.maintenance",
  earning: "learn.category.earning",
  review: "learn.category.review",
  general: "learn.category.general",
};

const BLOG_CATEGORY_META = {
  maintenance: "learn.category.maintenance",
  earning: "learn.category.earning",
  news: "learn.category.news",
  scheme: "learn.category.scheme",
  general: "learn.category.general",
};

function normalizeList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

function matchesSearch(item, query) {
  if (!query) return true;
  const haystack = `${item?.title || ""} ${item?.description || ""} ${item?.excerpt || ""} ${item?.content || ""} ${item?.dealer_name || ""}`.toLowerCase();
  return haystack.includes(query);
}

function formatDate(value) {
  if (!value) return "";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function EmptyState({ title, subtitle }) {
  return (
    <div style={{ textAlign: "center", padding: 60 }}>
      <div style={{ fontSize: 46, marginBottom: 10 }}>📚</div>
      <div style={{ fontWeight: 700, color: "#374151", marginBottom: 4 }}>{title}</div>
      <div style={{ color: "#9ca3af", fontSize: 14 }}>{subtitle}</div>
    </div>
  );
}

function VideoCard({ video, t }) {
  const categoryLabelKey = VIDEO_CATEGORY_META[video.category] || VIDEO_CATEGORY_META.general;
  const openHref = video.youtube_url || "";

  return (
    <div style={{ background: "#fff", borderRadius: 14, overflow: "hidden", border: "1px solid #e5e7eb", boxShadow: "0 2px 10px rgba(0,0,0,0.06)", transition: "all 0.2s" }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 10px 24px rgba(0,0,0,0.1)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.06)"; }}>
      <div style={{ height: 168, background: `linear-gradient(135deg, ${G}16, #fbbf2410)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {video.thumbnail_url ? (
          <img src={video.thumbnail_url} alt={video.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ fontSize: 44 }}>🎬</div>
        )}
      </div>

      <div style={{ padding: 16 }}>
        <span style={{ display: "inline-block", background: "#f0fdf4", color: G, fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 999, marginBottom: 8 }}>
          {t(categoryLabelKey)}
        </span>
        <div style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 6, lineHeight: 1.4 }}>{video.title}</div>
        <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6, minHeight: 62 }}>
          {video.description || t("learn.no_description")}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, gap: 8 }}>
          <span style={{ fontSize: 12, color: "#9ca3af" }}>{video.dealer_name || ""}</span>
          {openHref ? (
            <a href={openHref} target="_blank" rel="noopener noreferrer"
              style={{ background: G, color: "#fff", textDecoration: "none", borderRadius: 8, padding: "8px 12px", fontSize: 12, fontWeight: 700 }}>
              {t("learn.watch_video")}
            </a>
          ) : (
            <span style={{ fontSize: 12, color: "#9ca3af", fontWeight: 600 }}>{t("learn.link_unavailable")}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function BlogCard({ blog, onRead, t }) {
  const categoryLabelKey = BLOG_CATEGORY_META[blog.category] || BLOG_CATEGORY_META.general;
  const hasLocalContent = Boolean(String(blog.content || "").trim());
  const hasExternalUrl = Boolean(String(blog.url || "").trim());

  return (
    <div style={{ background: "#fff", borderRadius: 14, overflow: "hidden", border: "1px solid #e5e7eb", boxShadow: "0 2px 10px rgba(0,0,0,0.06)", transition: "all 0.2s" }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 10px 24px rgba(0,0,0,0.1)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.06)"; }}>
      <div style={{ height: 168, background: `linear-gradient(135deg, ${D}18, #e0e7ff)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {blog.cover_image_url ? (
          <img src={blog.cover_image_url} alt={blog.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ fontSize: 44 }}>📰</div>
        )}
      </div>

      <div style={{ padding: 16 }}>
        <span style={{ display: "inline-block", background: "#eff6ff", color: D, fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 999, marginBottom: 8 }}>
          {t(categoryLabelKey)}
        </span>
        <div style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 6, lineHeight: 1.4 }}>{blog.title}</div>
        <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6, minHeight: 62 }}>
          {blog.excerpt || t("learn.no_description")}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "#9ca3af" }}>{formatDate(blog.created_at)}</span>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {hasLocalContent && (
              <button onClick={() => onRead(blog)}
                style={{ border: `1px solid ${D}`, background: "#fff", color: D, borderRadius: 8, padding: "8px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                {t("learn.read_article")}
              </button>
            )}
            {hasExternalUrl && (
              <a href={blog.url} target="_blank" rel="noopener noreferrer"
                style={{ background: G, color: "#fff", textDecoration: "none", borderRadius: 8, padding: "8px 12px", fontSize: 12, fontWeight: 700 }}>
                {t("learn.open_source")}
              </a>
            )}
            {!hasLocalContent && !hasExternalUrl && (
              <span style={{ fontSize: 12, color: "#9ca3af", fontWeight: 600 }}>{t("learn.link_unavailable")}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DriverLearnHubPage() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState("videos");
  const [videos, setVideos] = useState([]);
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [videoCategory, setVideoCategory] = useState("");
  const [blogCategory, setBlogCategory] = useState("");
  const [selectedBlog, setSelectedBlog] = useState(null);

  useEffect(() => {
    localStorage.setItem("erd_last_page", "/driver/learn");
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadContent() {
      setLoading(true);
      const [videosRes, blogsRes] = await Promise.all([
        fetch(`${API}/videos/`).catch(() => null),
        fetch(`${API}/blogs/`).catch(() => null),
      ]);

      if (!mounted) return;

      if (videosRes?.ok) {
        const videosData = await videosRes.json();
        if (!mounted) return;
        setVideos(normalizeList(videosData));
      } else {
        setVideos([]);
      }

      if (blogsRes?.ok) {
        const blogsData = await blogsRes.json();
        if (!mounted) return;
        setBlogs(normalizeList(blogsData));
      } else {
        setBlogs([]);
      }

      setLoading(false);
    }

    loadContent();
    return () => { mounted = false; };
  }, []);

  const query = useMemo(() => search.trim().toLowerCase(), [search]);

  const videoCategories = useMemo(
    () => Array.from(new Set(videos.map(v => v.category).filter(Boolean))),
    [videos]
  );

  const blogCategories = useMemo(
    () => Array.from(new Set(blogs.map(b => b.category).filter(Boolean))),
    [blogs]
  );

  const filteredVideos = useMemo(
    () => videos.filter(v => (!videoCategory || v.category === videoCategory) && matchesSearch(v, query)),
    [videos, videoCategory, query]
  );

  const filteredBlogs = useMemo(
    () => blogs.filter(b => (!blogCategory || b.category === blogCategory) && matchesSearch(b, query)),
    [blogs, blogCategory, query]
  );

  const categoryOptions = activeTab === "videos" ? videoCategories : blogCategories;
  const activeCategory = activeTab === "videos" ? videoCategory : blogCategory;

  const setActiveCategory = (value) => {
    if (activeTab === "videos") setVideoCategory(value);
    else setBlogCategory(value);
  };

  const contentCount = activeTab === "videos" ? filteredVideos.length : filteredBlogs.length;

  const inputStyle = {
    padding: "12px 14px",
    border: "1.5px solid #e5e7eb",
    borderRadius: RADIUS.md,
    fontSize: 15,
    fontFamily: "inherit",
    outline: "none",
    minHeight: CONTROL.md,
  };

  return (
    <div style={{ fontFamily: TYPO.body, background: "#f9fafb", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <style>{`* { box-sizing: border-box; margin: 0; padding: 0; }`}</style>
      <Navbar />

      <section style={{ background: `linear-gradient(135deg, ${G}, #15803d 50%, ${D})`, color: "#fff", padding: "26px 24px" }}>
        <div style={{ maxWidth: LAYOUT.contentWidth, margin: "0 auto" }}>
          <h1 style={{ fontSize: "clamp(20px,3vw,30px)", fontWeight: 800, marginBottom: 6 }}>{t("learn.title")}</h1>
          <p style={{ color: "#d1fae5", fontSize: 14, maxWidth: 760 }}>{t("learn.subtitle")}</p>
          <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link to="/driver/marketplace" style={{ background: "#fff", color: G, padding: "9px 14px", borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
              {t("driver.explore")}
            </Link>
            <Link to="/driver/dealers" style={{ background: "rgba(255,255,255,0.16)", color: "#fff", padding: "9px 14px", borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: "none", border: "1px solid rgba(255,255,255,0.25)" }}>
              {t("driver.find_dealer")}
            </Link>
          </div>
        </div>
      </section>

      <section style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "12px 24px", position: "sticky", top: 60, zIndex: 50 }}>
        <div style={{ maxWidth: LAYOUT.contentWidth, margin: "0 auto", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <button onClick={() => setActiveTab("videos")}
            style={{ border: activeTab === "videos" ? `2px solid ${G}` : "1px solid #e5e7eb", background: activeTab === "videos" ? "#f0fdf4" : "#fff", color: activeTab === "videos" ? G : "#6b7280", borderRadius: 10, padding: "10px 12px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", minHeight: 46 }}>
            {t("learn.videos")} ({videos.length})
          </button>
          <button onClick={() => setActiveTab("blogs")}
            style={{ border: activeTab === "blogs" ? `2px solid ${D}` : "1px solid #e5e7eb", background: activeTab === "blogs" ? "#eff6ff" : "#fff", color: activeTab === "blogs" ? D : "#6b7280", borderRadius: 10, padding: "10px 12px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", minHeight: 46 }}>
            {t("learn.blogs")} ({blogs.length})
          </button>

          <input
            style={{ ...inputStyle, flex: 1, minWidth: 180 }}
            placeholder={`🔍 ${t("learn.search")}`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            style={{ ...inputStyle, minWidth: 180, background: "#fff", cursor: "pointer" }}
            value={activeCategory}
            onChange={(e) => setActiveCategory(e.target.value)}
          >
            <option value="">{t("learn.all_categories")}</option>
            {categoryOptions.map((cat) => {
              const map = activeTab === "videos" ? VIDEO_CATEGORY_META : BLOG_CATEGORY_META;
              const labelKey = map[cat] || "learn.category.general";
              return <option key={cat} value={cat}>{t(labelKey)}</option>;
            })}
          </select>

          {(search || activeCategory) && (
            <button onClick={() => { setSearch(""); setActiveCategory(""); }}
              style={{ padding: "10px 14px", border: "none", borderRadius: 8, background: "#f3f4f6", color: "#374151", cursor: "pointer", fontSize: 13, fontFamily: "inherit", minHeight: 46 }}>
              {t("action.clear")} ✕
            </button>
          )}

          <span style={{ fontSize: 13, color: "#9ca3af", marginLeft: "auto" }}>
            {contentCount} {activeTab === "videos" ? t("learn.video_results") : t("learn.blog_results")}
          </span>
        </div>
      </section>

      <main style={{ maxWidth: LAYOUT.contentWidth, margin: "0 auto", width: "100%", padding: "24px", flex: 1 }}>
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20 }}>
            <CardSkeleton count={6} />
          </div>
        ) : activeTab === "videos" ? (
          filteredVideos.length === 0 ? (
            <EmptyState title={t("learn.no_videos")} subtitle={t("learn.try_other_filters")} />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20 }}>
              {filteredVideos.map((video) => <VideoCard key={video.id} video={video} t={t} />)}
            </div>
          )
        ) : filteredBlogs.length === 0 ? (
          <EmptyState title={t("learn.no_blogs")} subtitle={t("learn.try_other_filters")} />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20 }}>
            {filteredBlogs.map((blog) => <BlogCard key={blog.id} blog={blog} onRead={setSelectedBlog} t={t} />)}
          </div>
        )}
      </main>

      {selectedBlog && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 220, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={(e) => e.target === e.currentTarget && setSelectedBlog(null)}>
          <div style={{ width: 760, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto", borderRadius: 16, background: "#fff", boxShadow: "0 20px 60px rgba(0,0,0,0.22)", padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 20, color: "#111827", lineHeight: 1.4 }}>{selectedBlog.title}</div>
                <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>{formatDate(selectedBlog.created_at)}</div>
              </div>
              <button onClick={() => setSelectedBlog(null)} style={{ border: "none", background: "none", fontSize: 24, color: "#9ca3af", cursor: "pointer" }}>✕</button>
            </div>

            {selectedBlog.excerpt && (
              <div style={{ background: "#f9fafb", border: "1px solid #f3f4f6", borderRadius: 10, padding: "10px 12px", color: "#4b5563", fontSize: 14, lineHeight: 1.6, marginBottom: 12 }}>
                {selectedBlog.excerpt}
              </div>
            )}

            <div style={{ color: "#1f2937", fontSize: 14, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
              {selectedBlog.content || t("learn.no_content")}
            </div>

            <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <button onClick={() => setSelectedBlog(null)} style={{ border: "1px solid #d1d5db", background: "#fff", color: "#374151", borderRadius: 8, padding: "10px 14px", cursor: "pointer", fontWeight: 700, fontFamily: "inherit" }}>
                {t("action.close")}
              </button>
              {selectedBlog.url && (
                <a href={selectedBlog.url} target="_blank" rel="noopener noreferrer"
                  style={{ background: G, color: "#fff", textDecoration: "none", borderRadius: 8, padding: "10px 14px", fontWeight: 700 }}>
                  {t("learn.open_source")}
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      <FooterNew />

      <div style={{ height: 60 }} className="mobile-bottom-spacer" />
      <style>{`@media (min-width: 769px) { .mobile-bottom-spacer { display: none; } }`}</style>
    </div>
  );
}
