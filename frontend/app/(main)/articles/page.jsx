"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Pagination from "@/app/components/Pagination";

// --- Icons Components ---
const SearchIcon = () => (
  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const ArrowLeftIcon = () => (
  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

// --- PART 1: The Logic Component (Internal) ---
function ArticlesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const NEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

  // --- States ---
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10; // Updated: 10 items per page as requested

  // Initialize from URL
  // Helper to extract parts from citation string "Year LN(Vol)A Page" or "Year LN(Vol)APage"
  const getCitationParts = (cit) => {
    if (!cit) return { year: "", vol: "", page: "" };
    // Standard format: "Year LN(Vol)APage" or "Year LN(Vol)A Page"
    const match = cit.match(/^([^ ]*)\s?LN\(([^)]*)\)A\s?(.*)$/);
    if (match) {
        return {
            year: match[1]?.replace(/_/g, "") || "",
            vol: match[2]?.replace(/_/g, "") || "",
            page: match[3]?.replace(/_/g, "").trim() || "",
        };
    }
    return { year: "", vol: "", page: "" };
  };

  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");
  const [citationTerm, setCitationTerm] = useState(searchParams.get("citation") || " LN()A");
  const [keywordTerm, setKeywordTerm] = useState(searchParams.get("keyword") || "");
  const [authorTerm, setAuthorTerm] = useState(searchParams.get("author") || "");

  // --- Effect: Handle Fetching based on URL ---
  useEffect(() => {
    const query = searchParams.get("q") || "";
    const citation = searchParams.get("citation") || " LN()A";
    const keyword = searchParams.get("keyword") || "";
    const author = searchParams.get("author") || "";
    const page = parseInt(searchParams.get("page")) || 1;
    
    setSearchTerm(query);
    setCitationTerm(citation);
    setKeywordTerm(keyword);
    setAuthorTerm(author);
    setCurrentPage(page);
    
    fetchArticles({ query, citation, keyword, author, page });
  }, [searchParams]);

  // --- Fetch Function ---
  const fetchArticles = async ({ query = "", citation = "", keyword = "", author = "", page = 1 }) => {
    setLoading(true);
    try {
      let url;
      const hasNumbers = /\d/.test(citation);
      
      const params = new URLSearchParams();
      params.append("page", page);
      params.append("limit", itemsPerPage);

      const hasSearch = query.trim() || (citation.trim() && citation !== " LN()A" && hasNumbers) || keyword.trim() || author.trim();

      if (hasSearch) {
        if (query.trim()) params.append("q", query.trim());
        if (keyword.trim()) params.append("keyword", keyword.trim());
        if (author.trim()) params.append("author", author.trim());
        if (citation.trim() && citation !== " LN()A" && hasNumbers) {
          const formatted = citation.replace(/_/g, "%");
          params.append("citation", formatted);
        }
        url = `${NEXT_PUBLIC_BASE_URL}/articles/search?${params.toString()}`;
      } else {
        url = `${NEXT_PUBLIC_BASE_URL}/articles/published?${params.toString()}`;
      }

      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch");

      const data = await res.json();
      const list = data.results || data.articles || [];
      setArticles(list);
      
      // Update pagination info from backend (robust mapping)
      if (data.pagination) {
        setTotalPages(Number(data.pagination.totalPages) || 1);
        setTotalItems(Number(data.pagination.total) || list.length);
      } else {
        // Fallback for search or older endpoints
        const total = Number(data.total || data.totalItems || data.totalArticles || list.length);
        setTotalItems(total);
        setTotalPages(Math.ceil(total / itemsPerPage) || 1);
      }
    } catch (error) {
      console.error("Error fetching articles:", error);
      toast.error("Failed to load articles.");
    } finally {
      setLoading(false);
    }
  };

  // --- Handle Search Submit ---
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchTerm.trim()) params.append("q", searchTerm.trim());
    
    const hasNumbers = /\d/.test(citationTerm);
    if (citationTerm.trim() && citationTerm !== " LN()A" && hasNumbers) {
      const formatted = citationTerm.replace(/_/g, "%");
      params.append("citation", formatted);
    }

    const queryString = params.toString();
    if (queryString) {
      router.push(`/articles?${queryString}`);
    } else {
      router.push(`/articles`);
    }
  };

  // --- Handle Page Change ---
  const handlePageChange = (newPage) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage);
    router.push(`/articles?${params.toString()}`);
    // Scroll to top of grid
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <ToastContainer position="top-right" theme="colored" />

      {/* --- Header Section --- */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

          {/* Back Button */}
          <div className="mb-4">
            <Link
              href="/"
              className="inline-flex items-center text-gray-500 hover:text-red-700 font-medium transition-colors"
            >
              <ArrowLeftIcon /> Back to Home
            </Link>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">

            {/* Title */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Research Library</h1>
              <p className="text-sm text-gray-500 mt-1">Search through our complete collection of articles.</p>
            </div>

            {/* Search Form */}
            <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <div className="relative w-full sm:w-80">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <SearchIcon />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search title, author, or keywords..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-100 focus:border-red-500 outline-none text-sm shadow-sm"
                />
                {/* Clear Button */}
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm("");
                      const params = new URLSearchParams(searchParams);
                      params.delete("q");
                      const dest = params.toString() ? `/articles?${params.toString()}` : "/articles";
                      router.push(dest);
                    }}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                )}
              </div>

              {(() => {
                const parts = getCitationParts(citationTerm);
                const updateCitationPart = (part, value) => {
                  const val = value.replace(/\D/g, "");
                  const newParts = { ...parts };
                  newParts[part] = val;
                  // Format: "Year LN(Vol)APage" (no space after A to match database)
                  setCitationTerm(`${newParts.year} LN(${newParts.vol})A${newParts.page}`);
                };
                
                return (
                  <div className="relative w-full sm:w-80 flex items-center bg-white border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-red-100 focus-within:border-red-500 overflow-hidden px-2 shadow-sm h-[40px]">
                    <div className="flex flex-1 items-center justify-center">
                    <input
                      type="text"
                      value={parts.year}
                      onChange={(e) => updateCitationPart("year", e.target.value)}
                      placeholder="____"
                      className="w-12 bg-transparent outline-none text-sm text-center font-mono placeholder:text-gray-300"
                    />
                    <span className="text-gray-400 text-xs font-mono px-0.5">LN(</span>
                    <input
                      type="text"
                      value={parts.vol}
                      onChange={(e) => updateCitationPart("vol", e.target.value)}
                      placeholder="__"
                      className="w-8 bg-transparent outline-none text-sm text-center font-mono placeholder:text-gray-300"
                    />
                    <span className="text-gray-400 text-xs font-mono px-0.5">)A</span>
                    <input
                      type="text"
                      value={parts.page}
                      onChange={(e) => updateCitationPart("page", e.target.value)}
                      placeholder="____"
                      className="w-12 bg-transparent outline-none text-sm text-center font-mono placeholder:text-gray-300"
                    />
                    </div>
                    {citationTerm && citationTerm !== " LN()A" && (
                      <button
                        type="button"
                        onClick={() => setCitationTerm(" LN()A")}
                        className="ml-auto p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </button>
                    )}
                  </div>
                );
              })()}
              <button
                type="submit"
                className="bg-red-700 hover:bg-red-800 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors text-sm shrink-0"
              >
                Search
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* --- Content Grid --- */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {loading ? (
          // Skeleton Loader (10 items)
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(itemsPerPage)].map((_, n) => (
              <div key={n} className="bg-white rounded-xl h-96 animate-pulse border border-gray-200">
                <div className="h-48 bg-gray-200 rounded-t-xl" />
                <div className="p-6 space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-1/4" />
                  <div className="h-6 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : articles.length > 0 ? (
          <>
            {/* Article Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-start relative z-10">
              {articles.map((item, idx) => (
                <Link
                  href={`/article/${item.slug || item.id || item._id}`}
                  key={item.id || item._id || idx}
                  className="group flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow duration-300"
                >
                  <div className="relative h-52 overflow-hidden bg-gray-100">
                    {item.thumbnailUrl ? (
                      <img
                        src={item.thumbnailUrl.startsWith("http") ? item.thumbnailUrl : `${NEXT_PUBLIC_BASE_URL}${item.thumbnailUrl}`}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50">
                        <span className="text-sm font-medium">No Image</span>
                      </div>
                    )}

                    {item.category && (
                      <span className="absolute top-4 left-4 bg-white/95 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-red-700 shadow-sm border border-gray-100">
                        {item.category}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col p-6">
                    {item.citationNumber && (
                      <span className="inline-block self-start px-2 py-0.5 rounded bg-red-50 text-red-600 text-[10px] font-bold uppercase tracking-wider border border-red-100 mb-2">
                        {item.citationNumber}
                      </span>
                    )}
                    <h3 className="text-xl font-bold text-gray-900 mb-3 leading-snug line-clamp-2 group-hover:text-red-700 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed mb-6 line-clamp-3">
                      {item.abstract || "No description available for this article."}
                    </p>
                    <div className="mt-6 pt-5 border-t border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-bold uppercase">
                          {item.authorName?.charAt(0) || "A"}
                        </div>
                        <span className="text-sm font-medium text-gray-800 truncate max-w-[120px]">
                          {item.authorName || "Unknown"}
                        </span>
                      </div>
                      <span className="text-red-700 text-sm font-bold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                        Read <span className="text-lg">→</span>
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination Container */}
            {totalItems > 0 && (
              <div className="mt-12 bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm relative z-10">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  totalItems={totalItems}
                  itemsPerPage={itemsPerPage}
                />
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <SearchIcon />
            </div>
            <h3 className="text-lg font-bold text-gray-900">No articles found</h3>
            <p className="text-gray-500 mt-2 text-center max-w-sm">
              We couldn&apos;t find any articles matching &quot;{searchTerm}&quot;.
            </p>
            <button
              onClick={() => {
                setSearchTerm("");
                router.push("/articles");
              }}
              className="mt-6 text-red-700 font-semibold hover:underline"
            >
              Show All Articles
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// --- PART 2: The Main Page Wrapper (The Fix) ---
export default function AllArticlesPage() {
  return (
    // This Suspense boundary is what fixes the Build Error
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading Library...</div>}>
      <ArticlesContent />
    </Suspense>
  );
}