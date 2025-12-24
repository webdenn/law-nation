"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function HomePage() {
  // 1. Pehle ye states add karein (top par)
  const [publishedArticles, setPublishedArticles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const API_BASE_URL = "http://localhost:4000";

  // 2. Updated useEffect
  useEffect(() => {
    // --- PART A: Verification Logic (Purana wala) ---
    const urlParams = new URLSearchParams(window.location.search);

    if (urlParams.get("verified") === "true") {
      toast.success("Email Verified! Your article is now in review.");
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (urlParams.get("error") === "verification-failed") {
      toast.error("Verification failed or link expired.");
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // --- PART B: Fetch Published Articles (Naya wala) ---
    const fetchArticles = async () => {
      try {
        // Backend se sirf wahi articles mangao jo APPROVED hain
        const res = await fetch(`${API_BASE_URL}/api/articles?status=APPROVED`);
        const data = await res.json();

        // Data extract karein (array check ke saath)
        const list = Array.isArray(data) ? data : data.articles || [];
        setPublishedArticles(list);
      } catch (error) {
        console.error("Error fetching published articles:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchArticles();
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

  const heroIllustration =
    "https://images.pexels.com/photos/2908976/pexels-photo-2908976.jpeg";

  const popularItems = [
    {
      title: "I awoke at ½ past 7",
      category: "Essay / Technology and the self",
      description:
        "Our cursed age of self-monitoring and optimisation didn’t start with big tech: as so often, the Victorians are to blame",
      author: "Elena Mary",
      image:
        "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=900&q=80",
    },
    {
      title: "The deepest South",
      category: "Essay / Global history",
      description:
        "Slavery in Latin America, on a huge scale, was different from that in the United States. Why don’t we know this history?",
      author: "Ana Lucia Araujo",
      image:
        "https://images.unsplash.com/photo-1505761671935-60b3a7427bad?auto=format&fit=crop&w=900&q=80",
    },
    {
      title: "The inflammation age",
      category: "Essay / Illness and disease",
      description:
        "Acute inflammation helps the body heal. But chronic inflammation is different and could provoke a medical paradigm shift",
      author: "Amy K McLennan",
      image:
        "https://images.unsplash.com/photo-1526814887064-7ab5b65b0c4c?auto=format&fit=crop&w=900&q=80",
    },
    {
      title: "From cells to selves",
      category: "Essay / Philosophy of mind",
      description:
        "Contemplating the world requires a body, and a body requires an immune system: the rungs of life create the stuff of thought",
      author: "Anna Ciaunica",
      image:
        "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80",
    },
  ];

  const editorsPicks = [
    {
      title: "Ain’t It a Cold, Cold World?",
      author: "David Ramsey",
      source: "Oxford American",
      date: "December 9, 2025",
      words: "5,242 words",
      excerpt: "The collected stories of Blaze Foley.",
    },
    {
      title: "If You Quit Social Media, Will You Read More Books?",
      author: "Jay Caspian Kang",
      source: "The New Yorker",
      date: "December 9, 2025",
      words: "1,999 words",
      excerpt:
        "Books are inefficient, and the internet is training us to expect optimized experiences.",
    },
    {
      title: "Can Jollibee Beat American Fast Food at Its Own Game?",
      author: "Yasmin Tayag",
      source: "The Atlantic",
      date: "December 9, 2025",
      words: "2,832 words",
      excerpt:
        "The U.S. introduced fast food to the Philippines. Now Jollibee is serving it back to America.",
    },
    {
      title: "Model Employees",
      author: "Max Hancock",
      source: "The Drift",
      date: "December 2, 2025",
      words: "2,926 words",
      excerpt: "The dawn of digital twins.",
    },
    {
      title: "The Business of Care",
      author: "Ginger Thompson",
      source: "Pro Publica",
      date: "December 8, 2025",
      words: "5,523 words",
      excerpt:
        "The story of Phoebe Putney Memorial Hospital — the dominant political and economic institution of Albany, Georgia — is the story of American health care.",
    },
    {
      title: "What If the Economy Was Modeled After Ecology?",
      author: "Christine Ro and John Fullerton",
      source: "Atmos",
      date: "December 4, 2025",
      words: "2,609 words",
      excerpt:
        "By treating economies as living systems, we can build financial frameworks that regenerate rather than exploit.",
    },
  ];

  const sliderRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Search submitted", { query, filters });
  };

  const updateFilter = (name, value) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* ✅ Popup Container for Top-Right side */}
      {/* <ToastContainer position="top-right" autoClose={2000} theme="colored" /> */}

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.35), rgba(0,0,0,0.55)), url(${heroIllustration})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 relative">
          <div className="bg-white/98 backdrop-blur shadow-xl rounded-3xl border border-neutral-200 px-6 sm:px-10 py-10 space-y-6">
            <div className="space-y-2">
              <p className="inline-flex items-center gap-2 rounded-full bg-black text-white px-3 py-1 text-xs font-semibold">
                Tomorrow&apos;s Research Today
              </p>
              <h1 className="text-3xl sm:text-4xl font-semibold text-gray-900">
                Share, discover, and evaluate legal scholarship faster
              </h1>
              <p className="text-base sm:text-lg text-gray-700 leading-relaxed max-w-4xl">
                Connect with a global community of scholars and practitioners.
                Surface preprints, law reviews, and primary sources with
                librarian-grade search and transparent workflows.
              </p>
              <Link
                href="/about"
                className="text-sm font-semibold text-red-700 hover:text-red-800"
              >
                Learn more about Law Nation
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
                  className="sm:w-32 w-full bg-red-700 text-white font-semibold hover:bg-red-800 transition px-5 py-3"
                >
                  Search
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
                <span className="h-1 w-1 rounded-full bg-gray-300" />
                <span>Filter by year, category, and sort order</span>
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
                  Submit your paper
                </Link>
                <Link
                  href="/research-paper"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-neutral-300 text-black font-semibold hover:border-red-300 transition"
                >
                  Browse collections
                </Link>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Popular this month */}
      <section className="bg-[#f5f1e9] py-14 sm:py-16 article-font">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-12">
          <div className="text-center mb-8 sm:mb-12">
            <p className="text-[12px] sm:text-[13px] tracking-[0.32em] uppercase text-neutral-900 font-semibold">
              Popular this month
            </p>
          </div>

          <div className="relative overflow-hidden">
            <div
              ref={sliderRef}
              className="flex gap-6 sm:gap-8 overflow-x-auto snap-x snap-mandatory scrollbar-hidden px-1"
            >
              {popularItems.map((item) => (
                <article
                  key={item.title}
                  className="flex-shrink-0 basis-full sm:basis-5/12 lg:basis-1/3 min-w-[240px] sm:min-w-[280px] lg:min-w-[300px] flex flex-col h-full gap-4 border border-neutral-300/80 rounded-2xl bg-white shadow-sm snap-start"
                >
                  <div className="relative pb-[66%] bg-neutral-200/60 overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="absolute inset-0 h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>

                  <div className="flex flex-col flex-1 px-4 sm:px-5 pb-6">
                    <p className="text-[12px] text-neutral-800 font-semibold tracking-wide flex items-center gap-2">
                      <span className="inline-block h-2 w-2 rounded-sm bg-neutral-800" />
                      {item.category}
                    </p>
                    <h3 className="mt-1 text-xl font-semibold text-neutral-900 leading-snug">
                      {item.title}
                    </h3>
                    <p className="mt-3 text-[15px] text-neutral-700 leading-relaxed flex-1">
                      {item.description}
                    </p>
                    <div className="mt-4 flex items-center justify-between">
                      <p className="text-[15px] font-semibold text-neutral-900">
                        {item.author}
                      </p>
                      <button
                        type="button"
                        className="text-[14px] font-semibold text-red-700 hover:text-red-800"
                      >
                        Read more →
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center justify-between px-1 sm:px-2">
              <button
                type="button"
                onClick={() =>
                  sliderRef.current?.scrollBy({
                    left: -(sliderRef.current?.offsetWidth || 0) * 0.9,
                    behavior: "smooth",
                  })
                }
                className="pointer-events-auto h-10 w-10 rounded-full bg-white/90 border border-neutral-300 shadow-sm flex items-center justify-center text-neutral-800 hover:bg-white transition"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() =>
                  sliderRef.current?.scrollBy({
                    left: (sliderRef.current?.offsetWidth || 0) * 0.9,
                    behavior: "smooth",
                  })
                }
                className="pointer-events-auto h-10 w-10 rounded-full bg-white/90 border border-neutral-300 shadow-sm flex items-center justify-center text-neutral-800 hover:bg-white transition"
              >
                ›
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Editors' picks style list */}
      <section className="bg-white py-14 sm:py-16 article-font">
        <div className="max-w-6xl mx-auto px-6 sm:px-10 lg:px-12">
          <p className="text-sm tracking-wide text-neutral-700 mb-8 font-semibold uppercase">
            Recently Published
          </p>
          <div className="grid gap-x-12 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
            {isLoading ? (
              <p>Loading articles...</p>
            ) : publishedArticles.length > 0 ? (
              publishedArticles.map((item) => (
                <article
                  key={item._id}
                  className="space-y-2 border-b border-gray-100 pb-4"
                >
                  <h3 className="text-2xl font-semibold text-neutral-900 leading-tight">
                    {item.title}
                  </h3>
                  <p className="text-[15px] text-neutral-800">
                    <span className="font-semibold">
                      {item.authorName || "Anonymous"}
                    </span>
                    <span className="text-neutral-600"> | Law Nation | </span>
                    <span className="text-neutral-700">
                      {new Date(item.createdAt).toLocaleDateString("en-GB")}
                    </span>
                  </p>
                  <p className="text-[15px] text-neutral-700 leading-relaxed line-clamp-3 italic">
                    "{item.abstract}"
                  </p>
                  <button
                    onClick={() => {
                      const path = item.currentPdfUrl.startsWith("/")
                        ? item.currentPdfUrl
                        : `/${item.currentPdfUrl}`;
                      window.open(`${API_BASE_URL}${path}`, "_blank");
                    }}
                    className="text-[14px] font-semibold text-red-700 hover:text-red-800"
                  >
                    Read Full Paper →
                  </button>
                </article>
              ))
            ) : (
              <p className="text-gray-500">No articles published yet.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
