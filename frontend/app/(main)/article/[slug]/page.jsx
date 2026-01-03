
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

export default function ArticlePage({ params }) {
  const router = useRouter();
  const pathname = usePathname();

  // ✅ Next.js 15: params ko use() hook se unwrap karna zaroori hai
  const unwrappedParams = use(params);
  const slug = unwrappedParams?.slug;

  const API_BASE_URL = "http://localhost:4000";
  const { token } = useSelector((state) => state.auth);

  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isLimited, setIsLimited] = useState(false);

  const getPdfUrl = (url) => {
    if (!url) return "#";
    if (url.startsWith("http")) return url;
    return `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
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
          `${API_BASE_URL}/api/articles/slug/${slug}/content`,
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
        `${API_BASE_URL}/api/articles/${article.id || article._id}/${endpoint}`,
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
      toast.success("Download complete!");
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
    <article className="min-h-screen bg-white font-sans text-gray-900">
      <div className="max-w-3xl mx-auto py-16 px-6 sm:px-8">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center text-sm text-gray-500 hover:text-black mb-8 transition-colors"
        >
          <ArrowLeftIcon /> Back
        </button>

        <header className="mb-10">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-xs font-semibold tracking-wider uppercase text-blue-600">
              {article.category || "General"}
            </span>
            <span className="text-gray-300">•</span>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              {new Date(article.submittedAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>

          {article.thumbnailUrl && (
            <div className="w-full h-[300px] sm:h-[400px] mb-8 rounded-xl overflow-hidden bg-gray-50 border border-gray-100">
              <img
                src={
                  article.thumbnailUrl.startsWith("http")
                    ? article.thumbnailUrl
                    : `${API_BASE_URL}${article.thumbnailUrl}`
                }
                alt={article.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight leading-[1.1] mb-8 text-gray-900">
            {article.title}
          </h1>

          <div className="flex items-center justify-between border-b border-gray-100 pb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600">
                {article.authorName?.charAt(0) || "A"}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {article.authorName}
                </p>
                <p className="text-xs text-gray-500">Author</p>
              </div>
            </div>

            {!isLimited && article.currentPdfUrl && (
              <button
                onClick={() => handleDownload("pdf")}
                className="hidden sm:flex items-center text-sm font-medium text-gray-600 hover:text-black border border-gray-200 rounded-full px-4 py-2 hover:border-gray-400 transition-all cursor-pointer"
              >
                <DownloadIcon /> PDF
              </button>
            )}
          </div>
        </header>

        {article.abstract && (
          <div className="text-xl text-gray-600 leading-relaxed mb-10 not-italic font-normal">
            {article.abstract}
          </div>
        )}

        <div
          className={`prose prose-lg prose-slate max-w-none prose-headings:font-bold prose-a:text-blue-600 hover:prose-a:text-blue-500 prose-img:rounded-xl ${
            isLimited ? "relative" : ""
          }`}
        >
          {article.contentHtml ? (
            <div dangerouslySetInnerHTML={{ __html: article.contentHtml }} />
          ) : article.content ? (
            <div className="whitespace-pre-wrap">{article.content}</div>
          ) : (
            <div className="p-6 bg-gray-50 rounded-lg text-center text-gray-500 text-sm">
              Preview text unavailable.
            </div>
          )}

          {isLimited && (
            <div className="absolute bottom-0 left-0 w-full h-48 bg-gradient-to-t from-white via-white/90 to-transparent flex items-end justify-center pb-0">
              <div className="w-full text-center bg-white pt-4">
                <p className="text-gray-600 mb-4">You are reading a preview.</p>
                <Link
                  href={`/login?redirect=${pathname}`}
                  className="inline-flex items-center justify-center bg-red-700 text-white font-semibold px-8 py-3 rounded-full hover:bg-red-800 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <LockIcon /> Login to Read Full Article
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
              className="flex items-center justify-center w-full bg-black text-white text-sm font-medium px-6 py-4 rounded-lg active:scale-95 transition-transform"
            >
              <DownloadIcon /> Download Full PDF
            </a>
          </div>
        )}

        {article.currentWordUrl && (
          <button
            onClick={() => handleDownload("word")}
            className="flex sm:hidden items-center justify-center w-full bg-blue-600 text-white text-sm font-medium px-6 py-4 rounded-lg"
          >
            <WordIcon /> Download Word
          </button>
        )}
      </div>
    </article>
  );
}