"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import BackgroundCarousel from "../components/BackgroundCarousel";

// Small Search Icon for buttons
const SearchIconSmall = () => (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
    </svg>
);

export default function HomePage() {
    const router = useRouter();
    const [publishedArticles, setPublishedArticles] = useState([]);
    const [banners, setBanners] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSearching, setIsSearching] = useState(false);
    const [showDisclaimer, setShowDisclaimer] = useState(false);
    const [disclaimerAcceptedNow, setDisclaimerAcceptedNow] = useState(false);

    const NEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;
    const { user } = useSelector((state) => state.auth);

    useEffect(() => {
        try {
            const accepted = localStorage.getItem("ln_disclaimer_accepted") === "true";
            if (!accepted) setShowDisclaimer(true);
        } catch {
            setShowDisclaimer(true);
        }
    }, []);

    const handleProtectedRead = (item) => {
        const slug = item.slug;
        if (slug) {
            router.push(`/article/${slug}`);
        } else {
            router.push(`/article/${item._id || item.id}`);
        }
    };

    const fetchArticles = async (searchQuery = "", currentFilters = {}) => {
        setIsLoading(true);
        const hasSearch = searchQuery.trim() || currentFilters.keywords || currentFilters.authors || currentFilters.citation;
        if (hasSearch) setIsSearching(true);

        try {
            let url;
            if (hasSearch) {
                const params = new URLSearchParams();
                params.append("q", searchQuery.trim());
                if (currentFilters.keywords) params.append("keyword", currentFilters.keywords);
                if (currentFilters.authors) params.append("author", currentFilters.authors);
                if (currentFilters.citation && currentFilters.citation.trim() && currentFilters.citation !== " LN()A" && /\d/.test(currentFilters.citation)) {
                    // Replace underscores with % for SQL wildcard matching
                    // Format is "Year LN(Vol)APage"
                    const formatted = currentFilters.citation
                        .replace(/_/g, "%");
                    params.append("citation", formatted);
                }
                if (currentFilters.category && currentFilters.category !== "all") {
                    params.append("category", currentFilters.category);
                }
                url = `${NEXT_PUBLIC_BASE_URL}/articles/search?${params.toString()}`;
            } else {
                url = `${NEXT_PUBLIC_BASE_URL}/articles/published`;
            }

            const res = await fetch(url);
            const data = await res.json();
            const list = data.results || data.articles || [];
            setPublishedArticles(list.slice(0, 9));

            if (hasSearch && list.length === 0) {
                toast.info("No articles found.");
            }
        } catch (error) {
            console.error("Fetch error:", error);
            toast.error("Failed to load articles");
        } finally {
            setIsLoading(false);
            setIsSearching(false);
        }
    };

    const fetchBanners = async () => {
        try {
            const res = await fetch(`${NEXT_PUBLIC_BASE_URL}/banners`);
            if (res.ok) {
                const data = await res.json();
                if (data.banners) {
                    setBanners(data.banners);
                }
            }
        } catch (error) {
            console.error("Failed to load banners", error);
        }
    };

    useEffect(() => {
        fetchArticles();
        fetchBanners();
    }, []);

    const [query, setQuery] = useState("");
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [filters, setFilters] = useState({
        keywords: "",
        authors: "",
        citation: "",
        yearFrom: "",
        yearTo: "",
        category: "all",
        sort: "relevance",
    });

    const getSearchUrl = (searchQuery = "", currentFilters = {}) => {
        const params = new URLSearchParams();
        const trimmedQuery = searchQuery.trim();
        if (trimmedQuery) params.append("q", trimmedQuery);
        
        if (currentFilters.keywords) params.append("keyword", currentFilters.keywords);
        if (currentFilters.authors) params.append("author", currentFilters.authors);
        if (currentFilters.citation && currentFilters.citation.trim() && currentFilters.citation !== " LN()A" && /\d/.test(currentFilters.citation)) {
            const formatted = currentFilters.citation.replace(/_/g, "%");
            params.append("citation", formatted);
        }
        if (currentFilters.category && currentFilters.category !== "all") {
            params.append("category", currentFilters.category);
        }
        
        return `/articles${params.toString() ? `?${params.toString()}` : ""}`;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        router.push(getSearchUrl(query, filters));
    };

    const handleAdvancedSearch = (searchType, value) => {
        const newFilters = { ...filters, keywords: "", authors: "", citation: " LN()A" };
        newFilters[searchType] = value;
        router.push(getSearchUrl("", newFilters));
    };

    const updateFilter = (name, value) => {
        setFilters((prev) => ({ ...prev, [name]: value }));
    };

    // Helper to extract parts from citation string "Year LN(Vol)A Page" or "Year LN(Vol)APage"
    const getCitationParts = (cit) => {
        if (!cit) return { year: "", vol: "", page: "" };
        const match = cit.match(/^([^ ]*) LN\(([^)]*)\)A ?(.*)$/);
        if (match) {
            return {
                year: match[1].replace(/_/g, ""),
                vol: match[2].replace(/_/g, ""),
                page: match[3].replace(/_/g, "").trim(),
            };
        }
        return { year: "", vol: "", page: "" };
    };

    const updateCitationPart = (part, value) => {
        // Only allow numbers
        const val = value.replace(/\D/g, "");
        const parts = getCitationParts(filters.citation);
        parts[part] = val;

        // Reconstruct string: "Year LN(Vol)A Page"
        const year = parts.year || "";
        const vol = parts.vol || "";
        const page = parts.page || "";

        // We'll store it in a way that backend can ILIKE it easily
        // Format: "Year LN(Vol)APage" (no space after A to match database)
        const combined = `${year} LN(${vol})A${page}`;
        setFilters((prev) => ({ ...prev, citation: combined }));
    };

    const parts = getCitationParts(filters.citation);

    return (
        <div className="min-h-screen bg-white text-gray-900">
            {showDisclaimer && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="ln-disclaimer-title"
                >
                    <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-neutral-200">
                        <div className="p-6 sm:p-8">
                            <h2 id="ln-disclaimer-title" className="text-2xl font-semibold text-gray-900">
                                DISCLAIMER
                            </h2>
                            <div className="mt-4 text-sm sm:text-base text-gray-700 leading-relaxed space-y-4">
                                <p>
                                    The content published on the Law Nation Prime Times Journal (&lsquo;LN&rsquo;) is
                                    provided solely for informational and educational purposes and does not constitute
                                    any legal opinion/advice, professional guidance, and/or an endorsement of any kind.
                                    The articles, analysis, or any other material published on the website should not be
                                    relied upon as a substitute of legal advice from a qualified legal professional
                                    licensed in your jurisdiction. LN disclaims all liability for any actions taken
                                    based on the information provided herein. Users are strongly encouraged to consult
                                    with a Legal Professional for personalized legal advice.
                                </p>
                            </div>

                            <label className="mt-6 flex items-center gap-3 text-sm text-gray-700 select-none">
                                <input
                                    type="checkbox"
                                    checked={disclaimerAcceptedNow}
                                    onChange={(e) => setDisclaimerAcceptedNow(e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-red-700 focus:ring-red-600"
                                />
                                I accept the above.
                            </label>

                            <div className="mt-6 flex items-center justify-end">
                                <button
                                    type="button"
                                    disabled={!disclaimerAcceptedNow}
                                    onClick={() => {
                                        try {
                                            localStorage.setItem("ln_disclaimer_accepted", "true");
                                        } catch {
                                            // ignore storage failures
                                        }
                                        setShowDisclaimer(false);
                                    }}
                                    className="inline-flex items-center justify-center rounded-xl bg-red-700 px-5 py-2.5 text-white font-semibold hover:bg-red-800 transition disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed"
                                >
                                    PROCEED TO WEBSITE
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <section className="relative overflow-hidden">
                <BackgroundCarousel banners={banners} />
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 relative z-10">
                    <div className="bg-white/98 backdrop-blur shadow-xl rounded-3xl border border-neutral-200 px-6 sm:px-10 py-10 space-y-6">
                        <div className="space-y-2">
                            <p className="inline-flex items-center gap-2 rounded-full bg-black text-white px-3 py-1 text-xs font-semibold">
                                Tomorrow&apos;s Research Today
                            </p>
                            <h1 className="text-3xl sm:text-4xl font-semibold text-gray-900">
                                Where legal minds meet and discover Contribute and discover legal research faster
                            </h1>
                            <p className="text-base sm:text-lg text-gray-700 leading-relaxed max-w-4xl">
                                Read literary pieces with research and reflective writing which offer perspectives that bridge the gap between theory and practice while encouraging open and informed dialogue amongst readers.
                            </p>
                            <Link
                                href="/about"
                                className="text-sm font-semibold text-red-700 hover:text-red-800"
                            >
                                Learn More About Law Nation Prime Times Journal
                            </Link>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="flex flex-col sm:flex-row w-full rounded-2xl border border-neutral-200 shadow-sm overflow-hidden bg-white">
                                <div className="flex items-center px-4 py-3 gap-2 flex-1">
                                    <svg
                                        className="w-5 h-5 text-gray-400"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 103.5 3.5a7.5 7.5 0 0013.15 13.15z"
                                        />
                                    </svg>
                                    <input
                                        type="text"
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        placeholder="Search by title, abstract, keywords, or author"
                                        className="w-full bg-transparent outline-none text-gray-900 placeholder:text-gray-500"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={isSearching}
                                    className="sm:w-32 w-full bg-red-700 text-white font-semibold hover:bg-red-800 transition px-5 py-3 disabled:bg-gray-400"
                                >
                                    {isSearching ? "..." : "Search"}
                                </button>
                            </div>

                            <div className="flex items-center gap-3 text-sm text-gray-600">
                                <button
                                    type="button"
                                    onClick={() => setShowAdvanced(!showAdvanced)}
                                    className="text-red-700 font-semibold hover:text-red-800"
                                >
                                    {showAdvanced ? "Hide advanced filters" : "Advanced filters"}
                                </button>
                            </div>

                            {showAdvanced && (
                                <div className="space-y-4 border border-neutral-200 rounded-2xl p-5 bg-red-50/70 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="grid sm:grid-cols-3 gap-6">
                                        {/* Keywords Search */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-gray-700 uppercase tracking-wide ml-1">
                                                By Keywords
                                            </label>
                                            <div className="flex items-center h-[42px] bg-white border border-neutral-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-red-100 focus-within:border-red-300 shadow-sm transition-all">
                                                <input
                                                    type="text"
                                                    value={filters.keywords}
                                                    onChange={(e) =>
                                                        updateFilter("keywords", e.target.value)
                                                    }
                                                    placeholder="e.g. law, AI"
                                                    className="flex-1 bg-transparent px-3 py-2.5 outline-none text-sm"
                                                />
                                                <button
                                                    type="button"
                                                    disabled={isSearching || !filters.keywords.trim()}
                                                    onClick={() => handleAdvancedSearch("keywords", filters.keywords)}
                                                    className="shrink-0 w-12 h-[42px] bg-red-700 text-white flex items-center justify-center hover:bg-black transition-all disabled:bg-gray-200 disabled:text-gray-400 border-l border-neutral-100"
                                                >
                                                    <SearchIconSmall />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Author Search */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-gray-700 uppercase tracking-wide ml-1">
                                                By Author(s)
                                            </label>
                                            <div className="flex items-center h-[42px] bg-white border border-neutral-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-red-100 focus-within:border-red-300 shadow-sm transition-all">
                                                <input
                                                    type="text"
                                                    value={filters.authors}
                                                    onChange={(e) =>
                                                        updateFilter("authors", e.target.value)
                                                    }
                                                    placeholder="Author name"
                                                    className="flex-1 bg-transparent px-3 py-2.5 outline-none text-sm"
                                                />
                                                <button
                                                    type="button"
                                                    disabled={isSearching || !filters.authors.trim()}
                                                    onClick={() => handleAdvancedSearch("authors", filters.authors)}
                                                    className="shrink-0 w-12 h-[42px] bg-red-700 text-white flex items-center justify-center hover:bg-black transition-all disabled:bg-gray-200 disabled:text-gray-400 border-l border-neutral-100"
                                                >
                                                    <SearchIconSmall />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Citation Search */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-gray-700 uppercase tracking-wide ml-1">
                                                By Citation No.
                                            </label>
                                            <div className="flex flex-1 items-center bg-white rounded-xl border border-neutral-200 focus-within:ring-2 focus-within:ring-red-100 focus-within:border-red-300 overflow-hidden shadow-sm h-[42px]">
                                                <div className="flex flex-1 items-center px-2">
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
                                                    {filters.citation && filters.citation !== " LN()A" && (
                                                        <button
                                                            type="button"
                                                            onClick={() => updateFilter("citation", "")}
                                                            className="ml-auto p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                </div>
                                                <button
                                                    type="button"
                                                    disabled={isSearching || !filters.citation.trim() || filters.citation === " LN()A"}
                                                    onClick={() => handleAdvancedSearch("citation", filters.citation)}
                                                    className="shrink-0 w-12 h-full bg-red-700 text-white flex items-center justify-center hover:bg-black transition-all disabled:bg-gray-200 disabled:text-gray-400 border-l border-neutral-100"
                                                >
                                                    <SearchIconSmall />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-wrap gap-3">
                                <Link
                                    href="/submit-paper"
                                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-red-700 text-white font-semibold hover:bg-red-800 transition"
                                >
                                    Submit Manuscript
                                </Link>
                                <Link
                                    href="/articles" // Updated common path
                                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-neutral-300 text-black font-semibold hover:border-red-300 transition"
                                >
                                    Browse Issues
                                </Link>
                            </div>
                        </form>
                    </div>
                </div>
            </section>

            <section className="bg-white py-14 sm:py-16 font-sans">
                <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-12">
                    <div className="mb-12">
                        <h2 className="text-4xl font-bold text-black leading-tight text-center">
                            Latest <span className="text-black"> Updates</span>
                        </h2>
                    </div>

                    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 items-start">
                        {isLoading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 col-span-full w-full">
                                {[1, 2, 3].map((n) => (
                                    <div key={n} className="bg-white rounded-lg p-8 h-96 animate-pulse border border-gray-200">
                                        <div className="h-48 bg-gray-100 rounded-md mb-6" />
                                        <div className="space-y-4">
                                            <div className="h-6 bg-gray-100 rounded w-3/4" />
                                            <div className="h-4 bg-gray-100 rounded w-full" />
                                            <div className="h-4 bg-gray-100 rounded w-full" />
                                            <div className="h-4 bg-gray-100 rounded w-2/3" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : publishedArticles.length > 0 ? (
                            publishedArticles.map((item) => (
                                <article
                                    key={item.slug || item.id || item._id}
                                    className="bg-white border border-gray-200 rounded-lg p-8 flex flex-col overflow-hidden"
                                >
                                    {item.thumbnailUrl &&
                                        item.thumbnailUrl !== "null" &&
                                        item.thumbnailUrl !== "undefined" && (
                                            <div className="w-full h-48 mb-6 rounded-md overflow-hidden bg-gray-100">
                                                <img
                                                    src={
                                                        item.thumbnailUrl.startsWith("http")
                                                            ? item.thumbnailUrl
                                                            : `${NEXT_PUBLIC_BASE_URL}${item.thumbnailUrl}`
                                                    }
                                                    alt={item.title}
                                                    className="w-full h-full object-cover"
                                                    loading="lazy"
                                                    onError={(e) => {
                                                        e.target.parentElement.style.display = "none";
                                                    }}
                                                />
                                            </div>
                                        )}

                                    <div className="space-y-4">
                                        {item.citationNumber && (
                                            <span className="inline-block px-2 py-0.5 rounded bg-red-50 text-red-600 text-[10px] font-bold uppercase tracking-wider border border-red-100 mb-1">
                                                {item.citationNumber}
                                            </span>
                                        )}
                                        <h3 className="text-xl font-bold text-black leading-snug wrap-break-word overflow-wrap-anywhere">
                                            {item.title}
                                        </h3>
                                        <p className="text-[15px] text-gray-600 leading-relaxed line-clamp-4 wrap-break-word">
                                            {item.abstract || "Description text goes here."}
                                        </p>
                                    </div>

                                    <div className="mt-6 pt-6 flex items-center justify-between border-t border-gray-100">
                                        <span className="text-sm font-semibold text-black truncate max-w-[140px]">
                                            {item.authorName || "Anonymous"}
                                        </span>
                                        <button
                                            onClick={() => handleProtectedRead(item)}
                                            className="text-sm font-bold text-red-500 hover:underline flex items-center gap-1 shrink-0"
                                        >
                                            Read more <span className="text-lg">→</span>
                                        </button>
                                    </div>
                                </article>
                            ))
                        ) : (
                            <p className="text-gray-500 col-span-full text-center">
                                No articles published yet.
                            </p>
                        )}
                    </div>
                    <div className="mt-16 text-center">
                        <Link href="/articles">
                            <button className="bg-red-600 text-white px-8 py-3 rounded-full font-semibold hover:bg-gray-800 transition">
                                View All
                            </button>
                        </Link>
                    </div>
                </div>
            </section>

            <section className="bg-gray-50 py-16 border-t border-gray-200">
                <div className="max-w-5xl mx-auto px-6">
                    <div className="mb-10 text-center">
                        <h2 className="text-3xl font-bold text-slate-900">
                            Terms of Service and Conditions
                        </h2>
                        <p className="mt-3 text-slate-600 max-w-3xl mx-auto">
                            Please review the key terms governing your use of Law Nation Prime Times Journal.
                        </p>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-8 text-slate-700 leading-relaxed text-justify">
                        <div>
                            <p>
                                Welcome to Law Nation Prime Times Journal (&ldquo;LN,&rdquo; &ldquo;we,&rdquo;
                                &ldquo;us,&rdquo; or &ldquo;our&rdquo;). By accessing, browsing, or using the website
                                located at <span className="font-semibold">lawnation.co.in</span> (the &ldquo;Site&rdquo;),
                                you acknowledge that you have read, understood, and agree to be unequivocally bound by these
                                Terms of Service (&ldquo;Terms&rdquo;). If you do not agree to these Terms, you must
                                immediately cease use of the Site.
                            </p>
                        </div>

                        <div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Intellectual Property Rights</h3>
                            <p>
                                Unless otherwise explicitly stated, LN and/or its licensors own the intellectual property
                                rights for all material on the Site, including but not limited to the user interface, design,
                                code, text, graphics, and scholarly content (collectively, &ldquo;Materials&rdquo;). All
                                intellectual property rights are reserved with LN.
                            </p>
                        </div>

                        <div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">License to Use the Site</h3>
                            <p className="mb-3">
                                LN grants you a limited, non-exclusive, non-transferable, and revocable right to access the
                                Site for personal, non-commercial, educational, and scholarly research purposes only, subject
                                to the following restrictions:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>
                                    <strong>Prohibited Commercial Use:</strong> You shall not sell, rent, sub-license, or
                                    monetize any Materials from this Site.
                                </li>
                                <li>
                                    <strong>No Republication:</strong> You shall not republish material from this Site on any
                                    other website, database, or platform without express written consent from LN.
                                </li>
                                <li>
                                    <strong>No Derivative Works:</strong> You shall not edit, modify, or create derivative
                                    works from any Materials on this Site.
                                </li>
                                <li>
                                    <strong>Systematic Retrieval:</strong> You are strictly prohibited from using automated
                                    systems (e.g., robots, spiders, scrapers, crawlers) to access the Site for the purpose of
                                    &ldquo;data mining,&rdquo; &ldquo;text mining,&rdquo; or scraping content for AI training
                                    datasets or machine learning models.
                                </li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">User Conduct and Acceptable Use</h3>
                            <p className="mb-3">
                                By accessing this Site, you unequivocally agree and covenant not to engage, whether directly
                                or indirectly, in any conduct that disrupts, damages, or limits the functionality of the Site.
                                This prohibition extends to any use that compromises the Site&rsquo;s security or creates an
                                undue burden on our resources, thereby impairing the availability or accessibility of the Site
                                for us or other users. You must not:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>
                                    Use the Site in connection with any unlawful, illegal, fraudulent, or harmful purpose or
                                    activity.
                                </li>
                                <li>
                                    Distribute any spyware, computer virus, Trojan horse, worm, keystroke logger, rootkit, or
                                    other malicious computer software.
                                </li>
                                <li>
                                    Engage in any conduct that restricts or inhibits any other user from using or enjoying the
                                    Site.
                                </li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">User-Generated Content and Submissions</h3>
                            <p className="mb-3">
                                In these Terms, &ldquo;User Content&rdquo; shall mean material (including articles, comments,
                                and multimedia) that you or an author submit to this Site.
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>
                                    By submitting User Content, you grant LN a worldwide, irrevocable, non-exclusive,
                                    royalty-free, and perpetual license to use, reproduce, adapt, publish, translate, archive,
                                    and distribute said content in any existing or future media.
                                </li>
                                <li>
                                    You warrant that your User Content is original, does not infringe upon any third party&apos;s
                                    legal rights (including copyright and moral rights), and is not the subject of any
                                    threatened or actual legal proceedings.
                                </li>
                                <li>
                                    LN reserves the right to edit, reject, or remove any User Content at its sole discretion
                                    without prior notice.
                                </li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Disclaimer of Warranties</h3>
                            <p className="mb-3">
                                The Site and all Materials are provided on an &ldquo;as is&rdquo; and &ldquo;as
                                available&rdquo; basis. To the fullest extent permitted by law, LN makes no representations or
                                warranties, express or implied, regarding:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>
                                    The completeness, accuracy, reliability, or currency of the information found on the Site.
                                </li>
                                <li>The continuous, uninterrupted, or error-free availability of the Site.</li>
                                <li>
                                    <strong>Legal Advice:</strong> Nothing contained on this Site constitutes, or is intended
                                    to constitute, legal advice. Content is for informational and academic purposes only.
                                </li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Limitation of Liability</h3>
                            <p>
                                To the extent permitted by applicable law, LN and its affiliates (including but not limited to
                                editors, reviewers, employees, and agents) shall not be liable for any direct, indirect,
                                special, or consequential loss; or for any business losses, loss of revenue, income, profits,
                                or anticipated savings, loss of contracts or business relationships, loss of reputation or
                                goodwill, or loss or corruption of information or data in connection with the use of this
                                Site.
                            </p>
                        </div>

                        <div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Indemnification</h3>
                            <p>
                                You agree to indemnify, defend, and hold harmless LN and its affiliates (including but not
                                limited to editors, reviewers, employees, and agents) against any losses, damages, costs,
                                liabilities, and expenses (including legal fees) arising out of any breach by you of these
                                Terms or your violation of any law or the rights of a third party.
                            </p>
                        </div>

                        <div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Governing Law and Jurisdiction</h3>
                            <p>
                                These Terms shall be governed by and construed in accordance with the laws of India. Any
                                disputes regarding the ownership or publication of your submission shall be subject to the
                                exclusive jurisdiction of the courts located in New Delhi.
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
