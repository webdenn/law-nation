"use client";

import React, { useEffect, useState, use } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";

// Simple Icons
const ArrowLeftIcon = () => (
  <svg
    className="w-4 h-4 mr-2"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M10 19l-7-7m0 0l7-7m-7 7h18"
    />
  </svg>
);
const DownloadIcon = () => (
  <svg
    className="w-4 h-4 mr-2"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
    />
  </svg>
);
const WordIcon = () => (
  <svg
    className="w-4 h-4 mr-2"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);
const LockIcon = () => (
  <svg
    className="w-5 h-5 mr-2"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
    />
  </svg>
);

// --- RECENT ARTICLES WIDGET ---
const RecentArticlesWidget = ({ currentSlug }) => {
  const [recents, setRecents] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const NEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

  useEffect(() => {
    const fetchRecents = async () => {
      try {
        // Fetch published articles (using the same endpoint as Home)
        const res = await fetch(`${NEXT_PUBLIC_BASE_URL}/articles/published`);
        if (res.ok) {
          const data = await res.json();
          const list = data.results || data.articles || [];
          // Filter out current article and take top 5
          const filtered = list.filter(a => a.slug !== currentSlug && a.id !== currentSlug).slice(0, 5);
          setRecents(filtered);
        }
      } catch (e) {
        console.error("Failed to load recents", e);
      } finally {
        setLoading(false);
      }
    };
    fetchRecents();
  }, [currentSlug, NEXT_PUBLIC_BASE_URL]);

  if (loading) return <div className="animate-pulse space-y-4">
    {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-lg"></div>)}
  </div>;

  if (recents.length === 0) return <p className="text-sm text-gray-400">No other articles yet.</p>;

  return (
    <div className="flex flex-col gap-5">
      {recents.map((art) => (
        <div key={art.id} className="group cursor-pointer" onClick={() => router.push(`/article/${art.slug || art.id}`)}>
          <h4 className="text-sm font-bold text-gray-900 leading-snug group-hover:text-red-700 transition-colors line-clamp-2 mb-1">
            {art.title}
          </h4>

        </div>
      ))}
    </div>
  );
};

export default function ArticlePage({ params }) {
  const router = useRouter();
  const pathname = usePathname();

  // ✅ Next.js 15: params ko use() hook se unwrap karna zaroori hai
  const unwrappedParams = use(params);
  const slug = unwrappedParams?.slug;

  const NEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL
  const { token } = useSelector((state) => state.auth);

  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isLimited, setIsLimited] = useState(false);

  const getPdfUrl = (url) => {
    if (!url) return "#";
    if (url.startsWith("http")) return url;
    return `${NEXT_PUBLIC_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  useEffect(() => {
    if (!slug) return;

    const fetchArticleData = async () => {
      try {
        setLoading(true);
        const headers = { "Content-Type": "application/json" };

        // ✅ Missing token fix: Tabhi bhejien jab token ho
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        // ✅ API URL Fix: Backend dev ke mutabiq '/content' hata diya
        const res = await fetch(
          `${NEXT_PUBLIC_BASE_URL}/articles/slug/${slug}/content`,
          {
            method: "GET",
            headers: headers,
          }
        );

        const data = await res.json();

        if (res.ok && data.article) {
          setArticle(data.article);
          // Backend 'requiresLogin' bhejta hai agar user logged in nahi hai aur article limited hai
          setIsLimited(!!(data.requiresLogin || data.article.isLimited));
        } else {
          console.error("Backend error:", data.message);
          setError(true);
        }
      } catch (err) {
        console.error("Fetch error:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchArticleData();
  }, [slug, token]);

  const handleDownload = async (type) => {
    if (!token) {
      toast.warning("Please login to download.");
      router.push("/login");
      return;
    }

    try {
      toast.info(`Downloading ${type.toUpperCase()}...`);
      const endpoint = type === "word" ? "download/word" : "download/pdf";

      // ✅ Database ID use karein kyunki slug se download nahi hota
      const res = await fetch(
        `${NEXT_PUBLIC_BASE_URL}/articles/${article.id || article._id}/${endpoint}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) throw new Error("Download failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${article.title}.${type === "word" ? "docx" : "pdf"}`;
      document.body.appendChild(a);
      a.click();

      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      // Removed success toast as it appears before user actually saves/cancels the file UI
    } catch (err) {
      console.error(err);
      toast.error("Failed to download file. Please try again.");
    }
  };

  if (loading)
    return (
      <div className="max-w-3xl mx-auto py-20 px-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="h-12 bg-gray-200 rounded w-3/4 mb-6"></div>
        <div className="space-y-4 mt-10">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
      </div>
    );


  // Helper: Render text preserving original formatting (whitespace, newlines)
  const renderMediumContent = (text) => {
    if (!text) return null;

    return (
      <div className="whitespace-pre-wrap text-[18px] sm:text-[20px] text-[#292929] leading-[32px] tracking-tight text-justify font-serif">
        {text}
      </div>
    );
  };

  // Calculate guest content preserving structure
  const guestContent = (() => {
    if (token || !article) return "";

    // Helper to strip HTML tags via regex (SSR safe)
    const stripHtml = (html) => html.replace(/<[^>]*>?/gm, '');

    let textContent = article.content;
    if (!textContent || textContent.includes("Text extraction failed")) {
      textContent = article.contentHtml ? stripHtml(article.contentHtml) : (article.abstract || "");
    }

    if (!textContent) return "";

    // Preserve structure: Take lines until word count > 250
    const lines = textContent.split('\n');
    let accumulatedText = "";
    let wordCount = 0;

    for (const line of lines) {
      const words = line.trim().split(/\s+/).length;
      if (line.trim() === "") continue; // Skip empty lines for count, but logic below handles formatting

      wordCount += words;
      accumulatedText += line + "\n";

      if (wordCount > 250) break;
    }

    return accumulatedText;
  })();

  if (error || !article)
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Article unavailable
        </h2>
        <Link
          href="/law/home"
          className="flex items-center text-sm font-medium text-gray-900 hover:underline"
        >
          <ArrowLeftIcon /> Back to Library
        </Link>
      </div>
    );

  return (
    <article className="min-h-screen font-sans text-gray-900 bg-gray-50/30">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-red-700 mb-8 transition-colors group"
        >
          <ArrowLeftIcon />
          <span className="group-hover:translate-x-1 transition-transform">Back to Library</span>
        </button>

        <div className="flex flex-col lg:flex-row gap-12">
          {/* MAIN CONTENT (Left) */}
          <main className="lg:w-[70%]">
            <header className="mb-10">
              <div className="flex items-center gap-3 mb-6">
                <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold tracking-wider uppercase">
                  {article.category || "General"}
                </span>

              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-[1.1] mb-8 text-gray-900 wrap-break-word font-serif">
                {article.title}
              </h1>

              {article.thumbnailUrl && (
                <div className="w-full h-[300px] sm:h-[450px] mb-10 rounded-2xl overflow-hidden shadow-sm bg-gray-100">
                  <img
                    src={
                      article.thumbnailUrl.startsWith("http")
                        ? article.thumbnailUrl
                        : `${NEXT_PUBLIC_BASE_URL}${article.thumbnailUrl}`
                    }
                    alt={article.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              )}

              <div className="flex items-center justify-between border-b border-gray-100 pb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-lg font-bold text-red-700 border border-red-100">
                    {article.authorName?.charAt(0) || "A"}
                  </div>
                  <div>
                    <p className="text-base font-bold text-gray-900">
                      {article.authorName}
                    </p>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Author</p>
                  </div>
                </div>

                {!isLimited && article.currentPdfUrl && (
                  <button
                    onClick={() => handleDownload("pdf")}
                    className="hidden sm:flex items-center text-sm font-bold text-gray-700 hover:text-red-700 border border-gray-200 rounded-lg px-5 py-2.5 hover:border-red-200 hover:bg-red-50 transition-all cursor-pointer"
                  >
                    <DownloadIcon /> Download PDF
                  </button>
                )}
              </div>
            </header>

            {token && article.abstract && (
              <div className="p-8 bg-gray-50 rounded-2xl border border-gray-100 mb-12">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Abstract</h3>
                <div className="text-lg md:text-xl text-gray-700 leading-relaxed font-serif italic">
                  {article.abstract}
                </div>
              </div>
            )}

            <div
              className={`prose prose-lg prose-slate max-w-none prose-headings:font-bold prose-headings:font-sans prose-p:font-serif prose-a:text-red-700 hover:prose-a:text-red-800 prose-img:rounded-xl wrap-break-word overflow-hidden ${(!token || isLimited) ? "relative" : ""
                }`}
            >
              {token ? (
                // ✅ Logged In: Show Full Content (HTML or Text)
                article.contentHtml ? (
                  <div dangerouslySetInnerHTML={{ __html: article.contentHtml }} />
                ) : article.content ? (
                  <div className="font-serif max-w-2xl mx-auto">
                    {renderMediumContent(article.content)}
                  </div>
                ) : (
                  <div className="p-10 bg-gray-50 rounded-xl text-center text-gray-500 text-sm italic">
                    Content unavailable for this article.
                  </div>
                )
              ) : (
                // 🔒 Guest: Show Structured Preview
                <div className="font-serif max-w-2xl mx-auto opacity-70 blur-[0.3px] select-none">
                  {renderMediumContent(guestContent)}
                </div>
              )}

              {!token && (
                <div className="absolute inset-x-0 bottom-0 h-48 bg-linear-to-t from-white via-white/95 to-transparent flex items-end justify-center pb-8 z-10">
                  <div className="text-center w-full px-4">
                    <Link
                      href={`/login?redirect=${pathname}`}
                      className="inline-flex items-center justify-center bg-red-600 text-white font-bold px-8 py-3.5 rounded-full hover:bg-red-700 transition-all shadow-lg hover:shadow-red-200 transform hover:-translate-y-0.5 group"
                    >
                      <LockIcon />
                      <span className="ml-2 text-sm uppercase tracking-wider">Login to Read Full Article</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {!isLimited && article.currentPdfUrl && (
              <div className="mt-16 pt-8 border-t border-gray-100 sm:hidden">
                <a
                  href={getPdfUrl(article.currentPdfUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-full bg-gray-900 text-white text-sm font-bold px-6 py-4 rounded-xl active:scale-95 transition-transform"
                >
                  <DownloadIcon /> Download Full PDF
                </a>
              </div>
            )}
          </main>

          {/* SIDEBAR (Right) */}
          <aside className="lg:w-[30%] space-y-8">
            <div className="sticky top-24">
              {/* Recent Articles Widget */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-6 flex items-center gap-2">
                  <span className="w-1 h-6 bg-red-600 rounded-full"></span>
                  Recent Articles
                </h3>
                <div className="space-y-6">
                  <RecentArticlesWidget currentSlug={slug} />
                </div>
                <div className="mt-8 pt-6 border-t border-gray-50 text-center">
                  <Link href="/articles" className="text-xs font-bold text-red-600 hover:text-red-700 uppercase tracking-widest hover:underline">
                    View All Articles
                  </Link>
                </div>
              </div>

              {/* Newsletter / Call to Action (Optional Future use) */}
              <div className="mt-8 bg-red-50 rounded-2xl p-6 border border-red-100 hidden md:block">
                <h4 className="font-bold text-red-900 mb-2">Submit your work</h4>
                <p className="text-sm text-red-700 mb-4 leading-relaxed">
                  Contributing to Law Nation Prime Times Journal allows you to reach a global audience.
                </p>
                <Link href="/submit-paper" className="text-xs font-bold bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition block text-center">
                  Submit Manuscript
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </article>
  );
}