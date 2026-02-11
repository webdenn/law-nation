"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import BackgroundCarousel from "../components/BackgroundCarousel";

export default function HomePage() {
    const router = useRouter();
    const [publishedArticles, setPublishedArticles] = useState([]);
    const [banners, setBanners] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSearching, setIsSearching] = useState(false);

    const NEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;
    const { user } = useSelector((state) => state.auth);

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
        const hasSearch = searchQuery.trim() || currentFilters.keywords || currentFilters.authors;
        if (hasSearch) setIsSearching(true);

        try {
            let url;
            if (hasSearch) {
                const params = new URLSearchParams();
                const fallbackQuery = currentFilters.authors || currentFilters.keywords || "all";
                params.append("q", searchQuery.trim() || fallbackQuery);
                if (currentFilters.keywords) params.append("keyword", currentFilters.keywords);
                if (currentFilters.authors) params.append("author", currentFilters.authors);
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
        yearFrom: "",
        yearTo: "",
        category: "all",
        sort: "relevance",
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        await fetchArticles(query, filters);
    };

    const updateFilter = (name, value) => {
        setFilters((prev) => ({ ...prev, [name]: value }));
    };

    return (
        <div className="min-h-screen bg-white text-gray-900">
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
                                        required
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
                                <div className="space-y-4 border border-neutral-200 rounded-2xl p-4 bg-red-50/70">
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-semibold text-gray-700">
                                                Keywords
                                            </label>
                                            <input
                                                type="text"
                                                value={filters.keywords}
                                                onChange={(e) =>
                                                    updateFilter("keywords", e.target.value)
                                                }
                                                placeholder="e.g. constitutional law, AI ethics"
                                                className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-red-100 focus:border-red-300 outline-none text-sm"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-semibold text-gray-700">
                                                Author(s)
                                            </label>
                                            <input
                                                type="text"
                                                value={filters.authors}
                                                onChange={(e) =>
                                                    updateFilter("authors", e.target.value)
                                                }
                                                placeholder="Separate multiple authors with commas"
                                                className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-red-100 focus:border-red-300 outline-none text-sm"
                                            />
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

                    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
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
                                    className="bg-white border border-gray-200 rounded-lg p-8 flex flex-col h-full overflow-hidden"
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
                                        <h3 className="text-xl font-bold text-black leading-snug wrap-break-word overflow-wrap-anywhere">
                                            {item.title}
                                        </h3>
                                        <p className="text-[15px] text-gray-600 leading-relaxed line-clamp-4 wrap-break-word">
                                            {item.abstract || "Description text goes here."}
                                        </p>
                                    </div>

                                    <div className="mt-auto pt-6 flex items-center justify-between border-t border-gray-100">
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
        </div>
    );
}
