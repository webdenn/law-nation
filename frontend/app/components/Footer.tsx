"use client";

import React from "react";
import Link from "next/link";
import { 
  Mail, 
  Phone, 
  MapPin, 
  Linkedin, 
  Twitter, 
  Instagram, 
  Facebook, 
  Scale, // Briefcase ki jagah Scale use kiya (Law icon)
  BookOpen 
} from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white text-slate-600 font-sans pt-16 pb-8 border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* --- Top Section: Main Content --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-16">
          
          {/* Brand and Mission - 5 columns wide */}
          <div className="lg:col-span-5 space-y-6">
            <Link href="/" className="flex items-center gap-2 text-red-700 font-bold text-2xl">
              <Scale size={28} />
              <span>LAW<span className="text-slate-900">NATION</span></span>
            </Link>
            
            <p className="text-[15px] leading-relaxed">
              Bridging the gap between legal scholarship and global practice. 
              We provide <strong>open-access research, peer-reviewed journals</strong>, and a platform for legal innovation.
              Connecting scholars, practitioners, and students to the future of law.
            </p>
            
            <p className="text-[14px]">
              <span className="font-bold text-slate-900">For Researchers:</span> From citations to publication, 
              we offer industry-standard reviewing processes, DOI assignments, and global indexing 
              to ensure your work reaches the right audience.
            </p>
            
            <p className="italic text-red-700 font-medium">"Justice through Knowledge, Our Ultimate Mission."</p>
          </div>

          {/* Explore - 2 columns */}
          <div className="lg:col-span-2">
            <h3 className="text-slate-900 font-bold text-lg mb-6">Explore</h3>
            <ul className="space-y-3 text-[15px]">
              <li><Link href="/articles" className="hover:text-red-700 transition-colors">Browse Journals</Link></li>
              <li><Link href="/latest" className="hover:text-red-700 transition-colors">Latest Articles</Link></li>
              <li><Link href="/authors" className="hover:text-red-700 transition-colors">Top Authors</Link></li>
              <li><Link href="/conferences" className="hover:text-red-700 transition-colors">Legal Conferences</Link></li>
              <li><Link href="/case-studies" className="hover:text-red-700 transition-colors">Case Studies</Link></li>
            </ul>
          </div>

          {/* Submission - 3 columns */}
          <div className="lg:col-span-3">
            <h3 className="text-slate-900 font-bold text-lg mb-6">For Authors</h3>
            <ul className="space-y-3 text-[15px]">
              <li><Link href="/submit-paper" className="hover:text-red-700 transition-colors">Submit Your Paper</Link></li>
              <li><Link href="/guidelines" className="hover:text-red-700 transition-colors">Submission Guidelines</Link></li>
              <li><Link href="/peer-review" className="hover:text-red-700 transition-colors">Peer Review Process</Link></li>
              <li><Link href="/indexing" className="hover:text-red-700 transition-colors">Indexing & Impact</Link></li>
              <li><Link href="/ethics" className="hover:text-red-700 transition-colors">Publication Ethics</Link></li>
              <li><Link href="/track" className="hover:text-red-700 transition-colors">Track Manuscript</Link></li>
            </ul>
          </div>

          {/* Quick Support - 2 columns */}
          <div className="lg:col-span-2">
             <h3 className="text-slate-900 font-bold text-lg mb-6">Support</h3>
             <ul className="space-y-3 text-[15px]">
              <li><Link href="/help" className="hover:text-red-700">Help Center</Link></li>
              <li><Link href="/editorial-board" className="hover:text-red-700">Editorial Board</Link></li>
              <li><Link href="/privacy" className="hover:text-red-700">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-red-700">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        {/* --- Contact & Socials --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 py-12 border-t border-slate-100">
          <div>
            <h3 className="text-slate-900 font-bold text-lg mb-6">Contact Us</h3>
            <div className="space-y-4 text-[15px]">
              <div className="flex items-center gap-3">
                <Mail size={18} className="text-red-700" />
                <a href="mailto:support@lawnation.com" className="hover:underline">support@lawnation.com</a>
              </div>
              <div className="flex items-center gap-3">
                <Phone size={18} className="text-red-700" />
                <span>+91 9876 543 210</span>
              </div>
              <div className="flex items-start gap-3">
                <MapPin size={18} className="text-red-700 mt-1 shrink-0" />
                <span>Supreme Court Lane, New Delhi - 110001</span>
              </div>
            </div>
          </div>

          <div className="md:text-right">
            <h3 className="text-slate-900 font-bold text-lg mb-6 md:pr-2">Connect With Us</h3>
            <div className="flex md:justify-end gap-3 mb-6">
              {[Linkedin, Twitter, Instagram, Facebook].map((Icon, idx) => (
                <a key={idx} href="#" className="p-3 border border-slate-200 rounded-lg text-slate-600 hover:text-red-700 hover:border-red-700 transition-all">
                  <Icon size={20} />
                </a>
              ))}
            </div>
            <p className="text-sm">
              Indexing partner with <span className="text-red-700 font-semibold">Google Scholar & Scopus</span>
            </p>
          </div>
        </div>

        {/* --- Legal Keywords SEO Tag Cloud --- */}
        <div className="bg-slate-50 p-8 rounded-xl mt-8 border border-slate-100">
          <p className="text-[12px] leading-relaxed text-slate-400 text-center uppercase tracking-tight">
            <span className="font-bold text-slate-600">Popular Research Topics:</span> Constitutional Law | Criminal Justice | Human Rights | International Law | Corporate Governance | Intellectual Property Rights | Cyber Law | Family Law | Environmental Law | Torts | Contract Law | Jurisprudence | Legal History | Administrative Law | Labor Laws | Arbitration & Conciliation | Evidence Act | IPC Section Analysis | Supreme Court Judgments | High Court Rulings | Legal Aid | Women & Law | Child Rights | Maritime Law | Space Law | Artificial Intelligence in Law | Data Privacy | GDPR Compliance | White Collar Crimes | Taxation Law | GST Implications | Insolvency and Bankruptcy | Medical Negligence | Consumer Protection | Competition Law | Mergers & Acquisitions | Public Interest Litigation (PIL) | Legal Education | Bar Council Updates | Moot Court Memorials | Legal Internships
          </p>
        </div>

        {/* --- Final Copyright --- */}
        <div className="mt-8 pt-8 border-t border-slate-100 text-center text-sm text-slate-400 flex flex-col sm:flex-row justify-between items-center">
          <p>© {currentYear} Law Nation. All rights reserved.</p>
          <p>ISSN: 2025-4890 • Impact Factor: 4.5</p>
        </div>
      </div>
    </footer>
  );
};