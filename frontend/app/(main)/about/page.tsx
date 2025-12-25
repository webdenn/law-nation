"use client";
import React from 'react';
import Link from 'next/link';

export default function AboutPage() {
  return (
    /* Using font-sans for a formal, clean, and minimal look */
    <div className="min-h-screen bg-white text-gray-900 font-sans tracking-tight">
      <section className="py-24 px-6 max-w-5xl mx-auto">
        
        {/* Formal Header: Minimal and bold with tight tracking */}
        <h1 className="text-5xl md:text-6xl font-bold mb-10 text-black leading-[1.1]">
          The future of <span className="text-red-700">Legal Intelligence.</span>
        </h1>
        
        {/* Minimalist Subtext: Uses gray text and a thin red accent border */}
        <p className="text-xl md:text-2xl text-gray-500 leading-relaxed border-l-[1px] border-red-700 pl-8 mb-20 max-w-3xl">
          Law Nation is a premier open-access platform dedicated to accelerating legal scholarship through high-fidelity search and transparent academic workflows.
        </p>
        
        {/* Organized Content Grid: Minimal layout with focus on readability */}
        <div className="grid md:grid-cols-2 gap-20">
          <div className="space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-red-700">
              The Platform
            </h2>
            <p className="text-gray-600 leading-relaxed text-lg font-light">
              We leverage advanced PostgreSQL full-text search to index global legal research, making it easier for scholars to discover emerging theories and primary sources instantly.
            </p>
          </div>
          
          <div className="space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-red-700">
              The Vision
            </h2>
            <p className="text-gray-600 leading-relaxed text-lg font-light">
              Our goal is to democratize legal information. By providing a stage for law reviews and preprints, we bridge the gap between complex research and practical application.
            </p>
          </div>
        </div>

        {/* Clean CTA Section: Professional Red and White styling without heavy shadows */}
       
      </section>
    </div>
  );
}