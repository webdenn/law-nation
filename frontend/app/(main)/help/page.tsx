import React from "react";
import Link from "next/link";
import { LifeBuoy, Mail, HelpCircle, ChevronDown } from "lucide-react";

export const metadata = {
  title: "Help Center - Law Nation Prime Times Journal",
  description: "Welcome to the Law Nation Support Hub. Find answers to common questions or reach out to our support team.",
};

const faqs = [
  {
    q: "How do I create an account on Law Nation?",
    a: "To have complete access to website, click the “Sign Up” button located at the top right corner of the homepage. Follow the prompts to enter your professional details and verify your email address."
  },
  {
    q: "I forgot my password. How can I reset it?",
    a: "Navigate to the login page and click “Forgot Password.” Enter your registered email address, and we will send you a secure link to reset your password."
  },
  {
    q: "Is Law Nation free to use?",
    a: "Yes. As part of our commitment to accessible legal education and research, we provide a comprehensive repository of open-access legal articles, commentary, and resources completely free of charge to the public."
  },
  {
    q: "How do I search for specific articles or research papers?",
    a: "Use the primary search bar to find publications by title, abstract, keywords, or author."
  },
  {
    q: "How do I use the advanced search filters?",
    a: "If you need to narrow your results, toggle the \"Advanced Filters\" option. This allows you to pinpoint research specifically by entering Keywords (e.g., law, AI), searching by specific Author(s), or entering an exact Citation No. using our unique Law Nation numbering format."
  },
  {
    q: "How can I view past publications?",
    a: "You can easily explore previous editions and archives by clicking the \"Browse Issues\" button."
  },
  {
    q: "Where can I find the submission guidelines?",
    a: (
      <>
        Detailed submission guidelines for articles are available at <Link href="/guidelines" className="text-red-700 hover:text-red-800 hover:underline">www.lawnation.co.in/guidelines/</Link> within this section. Please review them thoroughly before preparing your work.
      </>
    )
  },
  {
    q: "How do I submit an article or manuscript for publication?",
    a: (
      <>
        We welcome your insightful legal analysis and commentary. Upon reviewing the submission guidelines, kindly upload your manuscript for the editorial team's consideration at <Link href="/submit-paper" className="text-red-700 hover:text-red-800 hover:underline break-all">https://www.lawnation.co.in/submit-paper/</Link>
      </>
    )
  },
  {
    q: "How can I publish in the Law Nation Prime Times Journal?",
    a: "The Law Nation Prime Times Journal follows a rigorous peer-review process. Submissions must strictly adhere to the academic formatting and citation standards outlined in our guidelines."
  },
  {
    q: "What is the review timeline for submitted manuscripts?",
    a: "Our editorial team strives to review all initial submissions within Sixty (60) days. You will be notified via email regarding the status of your submission."
  },
  {
    q: "I found an error in a case brief or article. How do I report it?",
    a: "We strive for absolute accuracy in our legal resources. If you spot a discrepancy, please contact us immediately with the URL of the page and a brief description of the error."
  },
  {
    q: "The website is not loading correctly. What should I do?",
    a: (
      <>
        Please ensure your web browser is up to date and try clearing your cache. If the issue persists, reach out to us at <a href="mailto:mail@lawnation.co.in" className="text-red-700 hover:text-red-800 hover:underline">mail@lawnation.co.in</a> with details about the device and browser you are using.
      </>
    )
  }
];

export default function HelpCenterPage() {
  return (
    <main className="min-h-screen bg-slate-50 py-16 md:py-24 font-sans text-slate-700">
      <div className="max-w-4xl mx-auto px-6">
        
        {/* Header Section */}
        <div className="text-center mb-16 animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-50 text-red-700 rounded-full mb-6">
            <LifeBuoy size={32} />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 font-serif">
            Help Center
          </h1>
          <p className="text-xl md:text-2xl text-slate-600 mb-8 max-w-2xl mx-auto">
            Welcome to the <span className="text-red-700 font-bold">Law Nation Support Hub</span>
          </p>
          <div className="w-24 h-1 bg-red-700 mx-auto rounded-full"></div>
        </div>

        {/* Introduction */}
        <div className="bg-white p-8 md:p-10 rounded-2xl shadow-sm border border-slate-100 mb-12 text-center animate-fade-in-up hover:shadow-md transition-shadow">
          <p className="text-lg leading-relaxed text-slate-600 mb-0">
            Our goal is to provide a seamless and enriching experience for all legal professionals, scholars, students, and law seekers utilizing our platform. Browse the categories below to find answers to common questions, or reach out to our support team for further assistance.
          </p>
        </div>

        {/* FAQs */}
        <div className="mb-16 animate-fade-in-up animation-delay-100">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-8 flex items-center gap-3">
             <span className="bg-red-50 text-red-700 p-2 rounded-lg"><HelpCircle size={24} /></span>
             Frequently Asked Questions
          </h2>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            {faqs.map((faq, index) => (
              <details key={index} className="group border-b border-slate-100 last:border-b-0">
                <summary className="flex items-center justify-between gap-4 p-6 md:p-8 cursor-pointer list-none hover:bg-slate-50 transition-colors">
                  <h3 className="font-bold text-slate-900 text-lg group-open:text-red-700 transition-colors">{faq.q}</h3>
                  <span className="transition group-open:rotate-180 bg-slate-100 text-slate-500 p-2 rounded-full group-open:bg-red-50 group-open:text-red-700">
                    <ChevronDown size={20} />
                  </span>
                </summary>
                <div className="text-slate-600 px-6 md:px-8 pb-8 pt-0 leading-relaxed text-[15px] md:text-base animate-fade-in">
                  <div className="pl-4 border-l-2 border-red-700">
                    {faq.a}
                  </div>
                </div>
              </details>
            ))}
          </div>
        </div>

        {/* CTA - Still need assistance? */}
        <div className="bg-slate-900 text-white p-10 md:p-12 rounded-3xl text-center relative overflow-hidden animate-fade-in-up animation-delay-200">
          <div className="absolute top-0 right-0 w-64 h-64 bg-red-700 rounded-full mix-blend-multiply filter blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-slate-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 translate-y-1/2 -translate-x-1/2"></div>
          
          <div className="relative z-10">
            <h2 className="text-3xl font-bold mb-6 font-serif">Still Need Assistance?</h2>
            <p className="text-lg text-slate-300 mb-8 max-w-xl mx-auto">
              If you cannot find the answer to your question in our Help Centre, our support team is ready to help you out.
            </p>
            
            <a 
              href="mailto:mail@lawnation.co.in" 
              className="inline-flex items-center gap-2 bg-red-700 hover:bg-red-600 text-white px-8 py-4 rounded-full font-bold transition-all hover:scale-105 active:scale-95 shadow-lg hover:shadow-red-700/30"
            >
              <Mail size={20} />
              mail@lawnation.co.in
            </a>
          </div>
        </div>

      </div>
    </main>
  );
}
