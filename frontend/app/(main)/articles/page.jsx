// "use client";

// import React, { useState, useEffect } from "react";
// import Link from "next/link";
// import { useRouter, useSearchParams } from "next/navigation";
// import { ToastContainer, toast } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";

// // --- Icons Components ---
// const SearchIcon = () => (
//   <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
//   </svg>
// );

// const ArrowLeftIcon = () => (
//   <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
//   </svg>
// );

// export default function AllArticlesPage() {
//   const router = useRouter();
//   const searchParams = useSearchParams();

//   const NEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

//   // --- States ---
//   const [articles, setArticles] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [searchTerm, setSearchTerm] = useState("");

//   // --- Initial Load & URL Sync ---
//   // --- Initial Load & URL Sync ---
//   useEffect(() => {
//     // 1. URL parameter mat padho, bas blank search set kar do
//     setSearchTerm("");

//     // 2. Saare articles fetch karo (bina filter ke)
//     fetchArticles("");

//     // 3. URL ko saaf kar do (agar wahan ?q=something likha hai to hata do)
//     router.replace('/articles');
//   }, []); // Empty dependency array -> Sirf page load par chalega

//   // --- Fetch Function ---
//   const fetchArticles = async (query = "") => {
//     setLoading(true);

//     try {
//       let url;

//       // Agar kuch search kiya hai to Search API call karo
//       if (query.trim()) {
//         const params = new URLSearchParams();
//         // Backend ko 'q' bhejo, wo title/author/keyword sab search karega
//         params.append("q", query.trim());
//         url = `${NEXT_PUBLIC_BASE_URL}/articles/search?${params.toString()}`;
//       } else {
//         // Warna saare published articles load karo
//         url = `${NEXT_PUBLIC_BASE_URL}/articles/published`;
//       }

//       const res = await fetch(url);
//       const data = await res.json();

//       const list = data.results || data.articles || [];
//       setArticles(list);

//     } catch (error) {
//       console.error("Error fetching articles:", error);
//       toast.error("Failed to load articles.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   // --- Handle Search Submit (Updated) ---
//   const handleSearchSubmit = (e) => {
//     e.preventDefault();

//     // ✅ Change: Fetch function manually call karo
//     fetchArticles(searchTerm);

//     // URL update karo (Sirf dikhane ke liye history maintain karne ke liye)
//     if (searchTerm.trim()) {
//       router.push(`/articles?q=${searchTerm.trim()}`);
//     } else {
//       router.push(`/articles`);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
//       <ToastContainer position="top-right" theme="colored" />

//       {/* --- Header Section --- */}
//       <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

//           {/* Back Button - Fixed Route */}
//           <div className="mb-4">
//             <button
//               // ✅ FIXED: Seedha root ('/') par bhejega. 
//               // Agar tumhara home '/home' par hai to yahan '/home' likhna.
//               onClick={() => window.location.href = '/law/home'}
//               className="inline-flex items-center text-gray-500 hover:text-red-700 font-medium transition-colors"
//             >
//               <ArrowLeftIcon /> Back to Home
//             </button>
//           </div>

//           <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">

//             {/* Title */}
//             <div>
//               <h1 className="text-2xl font-bold text-gray-900">Research Library</h1>
//               <p className="text-sm text-gray-500 mt-1">Search through our complete collection of articles.</p>
//             </div>

//             {/* Single Search Bar */}
//             <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">

//               <div className="relative w-full sm:w-80">
//                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
//                   <SearchIcon />
//                 </div>
//                 <input
//                   type="text"
//                   value={searchTerm}
//                   onChange={(e) => setSearchTerm(e.target.value)}
//                   placeholder="Search title, author, or keywords..."
//                   className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-100 focus:border-red-500 outline-none text-sm shadow-sm"
//                 />
//               </div>

//               <button
//                 type="submit"
//                 className="bg-red-700 hover:bg-red-800 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors text-sm shrink-0"
//               >
//                 Search
//               </button>
//             </form>

//           </div>
//         </div>
//       </div>

//       {/* --- Content Grid --- */}
//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

//         {loading ? (
//           // Skeleton Loader
//           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
//             {[1, 2, 3, 4, 5, 6].map((n) => (
//               <div key={n} className="bg-white rounded-xl h-96 animate-pulse border border-gray-200">
//                 <div className="h-48 bg-gray-200 rounded-t-xl" />
//                 <div className="p-6 space-y-4">
//                   <div className="h-4 bg-gray-200 rounded w-1/4" />
//                   <div className="h-6 bg-gray-200 rounded w-3/4" />
//                   <div className="h-4 bg-gray-200 rounded w-full" />
//                 </div>
//               </div>
//             ))}
//           </div>
//         ) : articles.length > 0 ? (
//           // Article Cards
//           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
//             {articles.map((item) => (
//               <Link
//                 href={`/article/${item.slug || item._id}`}
//                 key={item._id || item.id}
//                 className="group flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden "
//               >
//                 {/* Thumbnail */}
//                 <div className="relative h-52 overflow-hidden bg-gray-100">
//                   {item.thumbnailUrl ? (
//                     <img
//                       src={item.thumbnailUrl.startsWith("http") ? item.thumbnailUrl : `${NEXT_PUBLIC_BASE_URL}${item.thumbnailUrl}`}
//                       alt={item.title}
//                       className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
//                       loading="lazy"
//                       onError={(e) => e.target.style.display = 'none'}
//                     />
//                   ) : (
//                     <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50">
//                       <span className="text-sm font-medium">No Image</span>
//                     </div>
//                   )}

//                   {/* Category Badge */}
//                   {item.category && (
//                     <span className="absolute top-4 left-4 bg-white/95 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-red-700 shadow-sm">
//                       {item.category}
//                     </span>
//                   )}
//                 </div>

//                 <div className="flex flex-col grow p-6">

//                   {/* Title */}
//                   <h3 className="text-xl font-bold text-gray-900 mb-3 leading-snug  line-clamp-2">
//                     {item.title}
//                   </h3>

//                   {/* Abstract */}
//                   <p className="text-gray-600 text-sm leading-relaxed mb-6 line-clamp-3">
//                     {item.abstract || "No description available for this article."}
//                   </p>

//                   {/* Footer */}
//                   <div className="mt-auto pt-5 border-t border-gray-100 flex items-center justify-between">
//                     <div className="flex items-center gap-2">
//                       <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-bold">
//                         {item.authorName?.charAt(0) || "A"}
//                       </div>
//                       <span className="text-sm font-medium text-gray-800 truncate max-w-[120px]">
//                         {item.authorName || "Unknown"}
//                       </span>
//                     </div>
//                     <span className="text-red-700 text-sm font-bold group-hover:translate-x-1 transition-transform flex items-center gap-1">
//                       Read <span className="text-lg">→</span>
//                     </span>
//                   </div>
//                 </div>
//               </Link>
//             ))}
//           </div>
//         ) : (
//           // Empty State
//           <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
//             <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
//               <SearchIcon />
//             </div>
//             <h3 className="text-lg font-bold text-gray-900">No articles found</h3>
//             <p className="text-gray-500 mt-2 text-center max-w-sm">
//               We couldn&apos;t find any articles matching &quot;{searchTerm}&quot;.
//             </p>
//             <button
//               onClick={() => {
//                 setSearchTerm("");
//                 router.push("/articles");
//                 fetchArticles("");
//               }}
//               className="mt-6 text-red-700 font-semibold hover:underline"
//             >
//               Show All Articles
//             </button>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }




"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

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

  // Initialize from URL
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");

  // --- Effect: Handle Fetching based on URL ---
  useEffect(() => {
    const query = searchParams.get("q") || "";
    setSearchTerm(query);
    fetchArticles(query);
  }, [searchParams]);

  // --- Fetch Function ---
  const fetchArticles = async (query = "") => {
    setLoading(true);
    try {
      let url;
      if (query.trim()) {
        const params = new URLSearchParams();
        params.append("q", query.trim());
        url = `${NEXT_PUBLIC_BASE_URL}/articles/search?${params.toString()}`;
      } else {
        url = `${NEXT_PUBLIC_BASE_URL}/articles/published`;
      }

      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch");

      const data = await res.json();
      const list = data.results || data.articles || [];
      setArticles(list);
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
    if (searchTerm.trim()) {
      router.push(`/articles?q=${searchTerm.trim()}`);
    } else {
      router.push(`/articles`);
    }
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
                      router.push("/articles");
                    }}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                )}
              </div>
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
          // Skeleton Loader
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((n) => (
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
          // Article Cards
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-start">
            {articles.map((item) => (
              <Link
                href={`/article/${item.slug || item._id}`}
                key={item._id || item.id}
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
                        e.target.onerror = null;
                        e.target.style.display = 'none';
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