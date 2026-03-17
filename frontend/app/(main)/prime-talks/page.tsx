import React from "react";
import Link from "next/link";
import { Mic, Users, ExternalLink, Lightbulb, ArrowRight } from "lucide-react";

export const metadata = {
  title: "Prime Talks - Law Nation Prime Times Journal",
  description: "Ideas Worth Debating. Voices That Shape the Future. Join Law Nation Prime Talks.",
};

export default function PrimeTalksPage() {
  return (
    <main className="min-h-screen bg-slate-50 font-sans text-slate-700">
      
      {/* Hero Section */}
      <div className="bg-slate-900 text-white relative overflow-hidden">
        {/* Background Decorative Elements */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-700/20 rounded-full mix-blend-multiply filter blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-slate-500/20 rounded-full mix-blend-multiply filter blur-3xl opacity-50 translate-y-1/2 -translate-x-1/2"></div>
        <div className="absolute inset-0 bg-[url('/img/grid-pattern.svg')] opacity-10"></div>
        
        <div className="max-w-4xl mx-auto px-6 py-24 md:py-32 relative z-10 text-center animate-fade-in-up">
          <div className="inline-flex items-center gap-2 bg-red-700/20 text-red-400 border border-red-700/30 px-4 py-1.5 rounded-full text-sm font-medium mb-8">
            <Mic size={16} />
            LN Prime Talks Initiative
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 font-serif leading-tight">
            Law Nation <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600">Prime Talks</span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 font-medium mb-10 max-w-2xl mx-auto leading-relaxed">
            Ideas Worth Debating.<br className="hidden md:block"/> Voices That Shape the Future.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-16 md:py-24">
        
        {/* About the Initiative */}
        <div className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-slate-200 mb-16 animate-fade-in-up hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-2 h-full bg-red-700"></div>
          <h2 className="text-3xl font-bold text-slate-900 mb-6 font-serif flex items-center gap-3">
            <Lightbulb className="text-red-700" size={32} />
            About the Initiative
          </h2>
          <div className="space-y-6 text-lg leading-relaxed text-slate-600">
            <p>
              Law Nation Prime Talks is an initiative by the Law Nation Prime Times Journal (LNPTJ). We have designed this platform to ignite the critical conversations that shape the future of law, justice, and social change.
            </p>
            <p>
              We believe in ideas worth debating and ideas that motivate and celebrate the true spirit of the Law. Through concise, impactful, and powerful talks, LN Prime Talks brings together diverse legal and civic minds to share experiences and insights.
            </p>
            <p className="font-medium text-slate-800 border-l-4 border-slate-200 pl-4 py-2 mt-8">
              Our mission is to bridge the gap between law and life; provoking thought, inspiring structural reform, and humanizing the broader legal dialogue.
            </p>
          </div>
        </div>

        {/* Who Are We Looking For */}
        <div className="mb-20 animate-fade-in-up animation-delay-100">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 font-serif">Who Are We Looking For?</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              We are searching for visionaries and practitioners who can bridge law and common sense through knowledge. We invite voices from all walks of the legal and civic spectrum, including:
            </p>
            <div className="w-16 h-1 bg-red-700 mx-auto rounded-full mt-8"></div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white p-8 rounded-2xl border border-slate-200 hover:border-red-200 hover:shadow-md transition-all group flex flex-col justify-center items-center text-center">
               <div className="w-16 h-16 bg-slate-50 text-slate-700 rounded-full flex items-center justify-center mb-4 group-hover:bg-red-50 group-hover:text-red-700 transition-colors">
                 <Users size={32} />
               </div>
               <h3 className="font-bold text-xl text-slate-900">Advocates & Legal Practitioners</h3>
            </div>
            
            <div className="bg-white p-8 rounded-2xl border border-slate-200 hover:border-red-200 hover:shadow-md transition-all group flex flex-col justify-center items-center text-center">
               <div className="w-16 h-16 bg-slate-50 text-slate-700 rounded-full flex items-center justify-center mb-4 group-hover:bg-red-50 group-hover:text-red-700 transition-colors">
                 <Users size={32} />
               </div>
               <h3 className="font-bold text-xl text-slate-900">Hon'ble Judges</h3>
            </div>
            
            <div className="bg-white p-8 rounded-2xl border border-slate-200 hover:border-red-200 hover:shadow-md transition-all group flex flex-col justify-center items-center text-center">
               <div className="w-16 h-16 bg-slate-50 text-slate-700 rounded-full flex items-center justify-center mb-4 group-hover:bg-red-50 group-hover:text-red-700 transition-colors">
                 <Users size={32} />
               </div>
               <h3 className="font-bold text-xl text-slate-900">Policymakers / Legislators & Executives</h3>
            </div>
            
            <div className="bg-white p-8 rounded-2xl border border-slate-200 hover:border-red-200 hover:shadow-md transition-all group flex flex-col justify-center items-center text-center">
               <div className="w-16 h-16 bg-slate-50 text-slate-700 rounded-full flex items-center justify-center mb-4 group-hover:bg-red-50 group-hover:text-red-700 transition-colors">
                 <Users size={32} />
               </div>
               <h3 className="font-bold text-xl text-slate-900">Legal Educators & Scholars</h3>
            </div>
          </div>
        </div>

        {/* CTA - Submit Proposal */}
        <div className="bg-red-700 text-white p-10 md:p-14 rounded-3xl text-center relative overflow-hidden shadow-xl animate-fade-in-up animation-delay-200 mb-16 hover:shadow-red-700/20 transition-shadow">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('/img/grid-pattern.svg')] opacity-10 mix-blend-overlay"></div>
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 font-serif">Share Your Vision</h2>
            <p className="text-lg md:text-xl text-red-100 mb-8 max-w-2xl mx-auto leading-relaxed">
              If you have a voice, a vision, or a lived experience that can spark change, we invite you to be part of this thought exchange on a global level.
            </p>
            <p className="text-md text-red-50 mb-10 max-w-2xl mx-auto">
              Kindly fill in your details to help our editorial and events team curate upcoming sessions. Whether you are nominating yourself or recommending a distinguished speaker, your input helps us build a compelling roster.
            </p>
            
            <a 
              href="https://forms.gle/jKQYKtzdT6J8WbfQ9" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-3 bg-white text-red-700 px-8 py-4 rounded-full font-bold text-lg hover:bg-slate-50 transition-all hover:scale-105 active:scale-95 shadow-lg group"
            >
              Submit Your Proposal
              <ExternalLink size={20} className="group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
        </div>

        {/* What Happens Next */}
        <div className="bg-slate-50 p-8 md:p-10 rounded-2xl border border-slate-200 text-center animate-fade-in-up animation-delay-300">
           <h3 className="text-2xl font-bold text-slate-900 mb-6 font-serif">What Happens Next?</h3>
           <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto leading-relaxed">
             Our team evaluates proposals based on originality, relevance, and the potential to inspire actionable change within the legal community and beyond. Selected speakers will be contacted directly by our events team for final scheduling, topic refinement, and media coordination.
           </p>
           <p className="text-xl font-bold text-red-700 italic border-t border-slate-200 pt-8 inline-block px-8">
             "Together, let's bridge law and common sense through knowledge."
           </p>
        </div>

      </div>
    </main>
  );
}
