import React from "react";
import Link from "next/link";
import { BookOpen, FileText, Scale, CheckCircle } from "lucide-react";

export const metadata = {
  title: "Submission Guidelines - Law Nation Prime Times Journal",
  description: "Submission guidelines for The Law Nation Prime Times Journal (LN).",
};

export default function GuidelinesPage() {
  return (
    <main className="min-h-screen bg-slate-50 py-16 md:py-24 font-sans text-slate-700">
      <div className="max-w-4xl mx-auto px-6">
        
        {/* Header Section */}
        <div className="text-center mb-16 animate-fade-in-up">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 font-serif">
            Submission Guidelines
          </h1>
          <p className="text-xl md:text-2xl text-red-700 font-medium mb-8">
            The Law Nation Prime Times Journal
          </p>
          <div className="w-24 h-1 bg-red-700 mx-auto rounded-full"></div>
        </div>

        {/* Introduction Section */}
        <div className="bg-white p-8 md:p-10 rounded-2xl shadow-sm border border-slate-100 mb-12 animate-fade-in-up hover:shadow-md transition-shadow">
          <p className="text-lg leading-relaxed mb-6">
            The Law Nation Prime Times Journal (LN) warmly invites law students, legal professionals and academicians to contribute their original and unpublished manuscripts for publication in our upcoming Issue. This is an opportunity to showcase your research, engage in meaningful academic dialogue, and add your voice to some of the most significant debates shaping the legal landscape today.
          </p>
          <p className="text-lg leading-relaxed mb-6">
            We encourage submissions that are analytical, critical, and innovative; whether they survey current practice, identify gaps in the law, propose reforms, or offer fresh theoretical perspectives.
          </p>
          <div className="bg-slate-50 border-l-4 border-red-700 p-6 rounded-r-lg mt-8">
            <h3 className="font-bold text-slate-900 mb-2">We welcome thoughtful pieces on:</h3>
            <p className="text-xl italic text-red-700 font-medium">
              "Contemporary legal issues and related Disciplines"
            </p>
          </div>
        </div>

        {/* General Instructions */}
        <div className="mb-12 animate-fade-in-up animation-delay-100">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-8 flex items-center gap-3">
            <span className="bg-red-50 text-red-700 p-2 rounded-lg"><BookOpen size={24} /></span>
            General Instructions
          </h2>
          <div className="bg-white p-6 md:p-8 rounded-xl border border-slate-200">
            <ul className="space-y-5 text-[15px] md:text-base">
              <li className="flex gap-3">
                <CheckCircle size={20} className="text-red-700 shrink-0 mt-0.5" />
                <p>Submissions must be original and unpublished, and not under review elsewhere.</p>
              </li>
              <li className="flex gap-3">
                <CheckCircle size={20} className="text-red-700 shrink-0 mt-0.5" />
                <div>
                  <p className="mb-3 font-medium text-slate-900">We accept submissions in the following formats:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                     <div className="bg-slate-50 p-3 rounded border border-slate-100">
                       <span className="font-bold text-slate-800">a. Research Article</span>
                       <span className="block text-sm text-slate-500 mt-1 mb-0">3000 to 6000 words</span>
                     </div>
                     <div className="bg-slate-50 p-3 rounded border border-slate-100">
                       <span className="font-bold text-slate-800">b. Review Article</span>
                       <span className="block text-sm text-slate-500 mt-1 mb-0">{">"} 2000 words</span>
                     </div>
                     <div className="bg-slate-50 p-3 rounded border border-slate-100">
                       <span className="font-bold text-slate-800">c. Case study</span>
                       <span className="block text-sm text-slate-500 mt-1 mb-0">{">"} 2000 words</span>
                     </div>
                     <div className="bg-slate-50 p-3 rounded border border-slate-100">
                       <span className="font-bold text-slate-800">d. Others (not blogs)</span>
                     </div>
                  </div>
                </div>
              </li>
              <li className="flex gap-3">
                <CheckCircle size={20} className="text-red-700 shrink-0 mt-0.5" />
                <p>Submissions must be accompanied by an abstract (100-120 words).</p>
              </li>
              <li className="flex gap-3">
                <CheckCircle size={20} className="text-red-700 shrink-0 mt-0.5" />
                <p>The submission should not be AI-generated and a maximum of 20% similarity index (plagiarism) is permissible; anything beyond shall result in disqualification.</p>
              </li>
              <li className="flex gap-3">
                <CheckCircle size={20} className="text-red-700 shrink-0 mt-0.5" />
                <p>Authors are fully responsible for the accuracy of references and any disputes over copyright, defamation, or objectionable content.</p>
              </li>
              <li className="flex gap-3">
                <CheckCircle size={20} className="text-red-700 shrink-0 mt-0.5" />
                <p>While word limits are to be observed, <strong className="text-slate-900">"quality will take precedence over length"</strong>.</p>
              </li>
            </ul>
          </div>
        </div>

        {/* Format Requirements */}
        <div className="mb-12 animate-fade-in-up animation-delay-200">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-8 flex items-center gap-3">
             <span className="bg-red-50 text-red-700 p-2 rounded-lg"><FileText size={24} /></span>
             Format Requirements
          </h2>
          <div className="bg-white p-6 md:p-8 rounded-xl border border-slate-200">
             <ul className="space-y-4 text-[15px] md:text-base">
              <li className="flex gap-3">
                <div className="w-2 h-2 rounded-full bg-red-700 mt-2 shrink-0"></div>
                <p>The first page must carry the title, author(s) name, institutional affiliation, and abstract.</p>
              </li>
              <li className="flex gap-3">
                <div className="w-2 h-2 rounded-full bg-red-700 mt-2 shrink-0"></div>
                <p>The second page should begin the main text of the manuscript.</p>
              </li>
              <li className="flex gap-3">
                <div className="w-2 h-2 rounded-full bg-red-700 mt-2 shrink-0"></div>
                <div>
                  <p className="mb-2 font-medium text-slate-900">Manuscripts must use:</p>
                  <ul className="list-disc pl-6 space-y-2 text-slate-600">
                    <li>Times New Roman, 12 pt font, 1.5 spacing (main text).</li>
                    <li>Times New Roman, 10 pt font, 1.0 spacing (footnotes).</li>
                    <li>Uniform formatting for all headings.</li>
                  </ul>
                </div>
              </li>
              <li className="flex gap-3">
                <div className="w-2 h-2 rounded-full bg-red-700 mt-2 shrink-0"></div>
                <p>Citations must conform to the ILI (Indian Law Institute) citation style, accessible at <a href="https://ili.ac.in/cstyle.pdf" target="_blank" rel="noopener noreferrer" className="text-red-700 hover:text-red-800 hover:underline font-medium break-all">https://ili.ac.in/cstyle.pdf</a></p>
              </li>
            </ul>
          </div>
        </div>

        {/* Other Details */}
        <div className="space-y-6 animate-fade-in-up animation-delay-300">
          <div className="bg-slate-900 text-white p-8 rounded-2xl relative overflow-hidden">
            <h3 className="text-xl font-bold mb-3 flex items-center gap-2">Mode of Submission</h3>
            <p className="text-slate-300">All submissions are to be made through the website: <Link href="/submit-paper" className="text-red-400 font-medium hover:text-red-300 hover:underline">www.lawnation.co.in/submit-paper/</Link></p>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow transition-shadow">
             <h3 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">Terms and Conditions</h3>
             <p className="text-slate-600">All submissions to Law Nation are subject to our official Terms and Conditions, which dictate our policies on copyright, originality, and publication. By proceeding with your submission, you agree to these terms, accessible at: <Link href="/terms" className="text-red-700 font-medium hover:text-red-800 hover:underline break-all">www.lawnation.co.in/terms/</Link> & <Link href="/terms/author" className="text-red-700 font-medium hover:text-red-800 hover:underline break-all">www.lawnation.co.in/terms/author/</Link></p>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow transition-shadow">
             <h3 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2"><Scale size={24} className="text-red-700" /> Editorial Note</h3>
             <p className="text-slate-600 mb-0">Upon submission, the manuscript becomes the property of the LN. Accepted submissions may be published or republished at the discretion of the LN, without requiring prior consent from author.</p>
          </div>

          <div className="bg-red-50 p-8 rounded-2xl border border-red-100 text-center relative overflow-hidden">
             <div className="absolute -left-10 -top-10 w-32 h-32 bg-red-700 rounded-full opacity-5"></div>
             <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-red-700 rounded-full opacity-5"></div>
             <div className="relative z-10">
               <h3 className="text-xl font-bold text-slate-900 mb-3">Contact us</h3>
               <p className="text-slate-600 mb-6">All correspondence and queries may be addressed to:</p>
               <a href="mailto:mail@lawnation.co.in" className="inline-block bg-white text-red-700 px-8 py-3 rounded-full font-bold border border-red-200 hover:bg-red-700 hover:text-white transition-all shadow-sm hover:shadow-md active:scale-95">mail@lawnation.co.in</a>
             </div>
          </div>
        </div>

      </div>
    </main>
  );
}
