"use client";
import React, { useEffect, useState } from 'react';

export default function AboutPage() {
  const [data, setData] = useState({
    heading: 'The future of <span class="text-red-700">Legal Research and Awareness</span>',
    lead: 'Law and society are in constant conversation, each shaping the course of the other. Through accessible scholarship and inclusive participation, we endeavour to keep that dialogue vibrant, rigorous and relevant.',
    mission: 'We are committed to significantly improving the lives of people by inducing motivation to legal knowledge, making it accessible to everyone and demystifying the law to make it a meaningful part of everyday life such that the real function of law which is to bring fundamental rights to everyone becomes a reality.'
  });
  const [loading, setLoading] = useState(true);
  const NEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:4000";

  useEffect(() => {
    const fetchAbout = async () => {
      try {
        const res = await fetch(`${NEXT_PUBLIC_BASE_URL}/api/about`);
        const result = await res.json();
        if (result.success && result.data && result.data.content) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(result.data.content, 'text/html');

          const dbHeading = doc.querySelector('h1')?.innerHTML || data.heading;
          const dbLead = doc.querySelector('.about-lead-text')?.textContent || data.lead;
          const dbMission = doc.querySelector('.about-mission-text')?.textContent || data.mission;

          setData({
            heading: dbHeading,
            lead: dbLead,
            mission: dbMission
          });
        }
      } catch (error) {
        console.error("Error fetching about content:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAbout();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-red-700 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans tracking-tight">
      <section className="py-24 px-6 max-w-5xl mx-auto">

        {/* Dynamic Heading */}
        <h1
          className="text-5xl md:text-6xl font-bold mb-10 text-black leading-[1.1]"
          dangerouslySetInnerHTML={{ __html: data.heading }}
        />

        {/* Dynamic Lead Text */}
        <p className="text-xl md:text-2xl text-gray-500 leading-relaxed border-l-[1px] border-red-700 pl-8 mb-20 max-w-3xl about-lead-text">
          {data.lead}
        </p>

        {/* Dynamic Mission Grid */}
        <div className="grid md:grid-cols-2 gap-20">
          <div className="space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-red-700">
              The Mission
            </h2>
            <p className="text-gray-600 leading-relaxed text-lg font-light about-mission-text">
              {data.mission}
            </p>
          </div>
        </div>

      </section>
    </div>
  );
}