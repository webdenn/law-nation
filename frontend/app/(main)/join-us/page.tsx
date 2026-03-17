import React from "react";
import Link from "next/link";
import { Mail, ArrowRight } from "lucide-react";

export const metadata = {
  title: "Join Us - Law Nation Prime Times Journal",
  description: "Join the Law Nation Community. Empowering Legal Research. Advancing Legal Discourse.",
};

export default function JoinUsPage() {
  return (
    <main className="min-h-screen bg-slate-50 py-16 md:py-24 font-sans text-slate-700">
      <div className="max-w-4xl mx-auto px-6">
        
        {/* Header Section */}
        <div className="text-center mb-16 animate-fade-in-up">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 font-serif">
            Join the Law Nation Community
          </h1>
          <p className="text-xl md:text-2xl text-red-700 font-medium mb-8">
            Empowering Legal Research. Advancing Legal Discourse.
          </p>
          <div className="w-24 h-1 bg-red-700 mx-auto rounded-full"></div>
        </div>

        {/* Introduction */}
        <div className="bg-white p-8 md:p-10 rounded-2xl shadow-sm border border-slate-100 mb-12 animate-fade-in-up hover:shadow-md transition-shadow">
          <p className="text-lg leading-relaxed mb-0">
            At Law Nation Prime Times Journal, we are dedicated to making comprehensive legal research accessible and fostering insightful legal scholarship. Whether you are a professional, a dedicated academician, a passionate law student, or a law seeker, there is a place for you to contribute to the future of legal discourse.
          </p>
        </div>

        {/* Who We Are Looking For */}
        <div className="mb-12 animate-fade-in-up animation-delay-100">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-8 flex items-center gap-3">
            <span className="bg-red-50 text-red-700 p-2 rounded-lg">Target Participants</span>
            Who We Are Looking For
          </h2>
          <div className="grid gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 hover:border-red-200 hover:shadow-sm transition-all group">
              <h3 className="font-bold text-lg text-slate-900 mb-2 group-hover:text-red-700 transition-colors">Legal Researchers & Writers</h3>
              <p className="text-slate-600">Contribute well-researched articles, case briefs, and legal analysis to our growing platform.</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 hover:border-red-200 hover:shadow-sm transition-all group">
              <h3 className="font-bold text-lg text-slate-900 mb-2 group-hover:text-red-700 transition-colors">Journal Reviewers</h3>
              <p className="text-slate-600">Help maintain the highest standards of academic integrity by joining the peer-review board for the Law Nation Prime Times Journal.</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 hover:border-red-200 hover:shadow-sm transition-all group">
              <h3 className="font-bold text-lg text-slate-900 mb-2 group-hover:text-red-700 transition-colors">Campus Ambassadors</h3>
              <p className="text-slate-600">Gain hands-on experience in legal publishing, research, and platform growth while building your professional network.</p>
            </div>
          </div>
        </div>

        {/* Why Contribute */}
        <div className="mb-16 animate-fade-in-up animation-delay-200">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-8 flex items-center gap-3">
             <span className="bg-red-50 text-red-700 p-2 rounded-lg">Benefits</span>
             Why Contribute to Law Nation?
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white p-8 rounded-2xl border border-slate-100 text-center hover:-translate-y-1 transition-transform duration-300 shadow-sm hover:shadow-md">
              <div className="w-12 h-12 bg-red-50 text-red-700 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">1</div>
              <h3 className="font-bold text-slate-900 mb-3">Amplify Your Voice</h3>
              <p className="text-sm text-slate-600">Reach a wide audience of legal professionals, scholars, and students across India and beyond.</p>
            </div>
            <div className="bg-white p-8 rounded-2xl border border-slate-100 text-center hover:-translate-y-1 transition-transform duration-300 shadow-sm hover:shadow-md">
               <div className="w-12 h-12 bg-red-50 text-red-700 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">2</div>
              <h3 className="font-bold text-slate-900 mb-3">Publishing Opportunities</h3>
              <p className="text-sm text-slate-600">Feature your rigorous research and analysis in the Law Nation Prime Times Journal, enhancing your academic and professional footprint.</p>
            </div>
            <div className="bg-white p-8 rounded-2xl border border-slate-100 text-center hover:-translate-y-1 transition-transform duration-300 shadow-sm hover:shadow-md">
               <div className="w-12 h-12 bg-red-50 text-red-700 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">3</div>
              <h3 className="font-bold text-slate-900 mb-3">Make an Impact</h3>
              <p className="text-sm text-slate-600">Help us democratize legal knowledge and provide highly reliable resources to those navigating the complexities of the law.</p>
            </div>
          </div>
        </div>

        {/* How to Apply & CTA */}
        <div className="bg-slate-900 text-white p-10 md:p-12 rounded-3xl text-center relative overflow-hidden animate-fade-in-up animation-delay-300">
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-red-700 rounded-full mix-blend-multiply filter blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-slate-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 translate-y-1/2 -translate-x-1/2"></div>
          
          <div className="relative z-10">
            <h2 className="text-3xl font-bold mb-6 font-serif">How to Apply</h2>
            <p className="text-lg text-slate-300 mb-8 max-w-2xl mx-auto">
              Ready to make your mark? We are always looking for driven individuals to expand our team. We invite dedicated legal professionals and law seekers to collaborate with us.
            </p>
            
            <a 
              href="mailto:mail@lawnation.co.in" 
              className="inline-flex items-center gap-2 bg-red-700 hover:bg-red-600 text-white px-8 py-4 rounded-full font-bold transition-all hover:scale-105 active:scale-95 shadow-lg hover:shadow-red-700/30"
            >
              <Mail size={20} />
              mail@lawnation.co.in
            </a>
            
            <p className="mt-8 text-sm text-slate-400">
              Kindly reach out to us with your resume and area of interest.
            </p>
          </div>
        </div>

      </div>
    </main>
  );
}