"use client";

import React from "react";
import { FileText, UserCheck, Gavel } from "lucide-react";

export default function AuthorTermsPage() {
    return (
        <div className="min-h-screen bg-gray-50 pt-24 pb-16">
            <div className="max-w-4xl mx-auto px-6">
                {/* Header */}
                <div className="text-center mb-16">
                    <h1 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">
                        Terms of Submission
                    </h1>
                    <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                        Please read these Terms of Submission carefully before submitting any work to Law Nation Prime Times
                        Journal.
                    </p>
                </div>

                {/* Table of Contents */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-12">
                    <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <FileText className="text-red-700 font-bold" size={24} />
                        Table of Contents
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <a href="#intro" className="text-slate-600 hover:text-red-700 transition-colors flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-red-700 rounded-full" />
                            Introduction & Definitions
                        </a>
                        <a href="#exclusivity" className="text-slate-600 hover:text-red-700 transition-colors flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-red-700 rounded-full" />
                            Exclusivity Period
                        </a>
                        <a href="#ownership" className="text-slate-600 hover:text-red-700 transition-colors flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-red-700 rounded-full" />
                            Ownership & Copyright
                        </a>
                        <a href="#reversion" className="text-slate-600 hover:text-red-700 transition-colors flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-red-700 rounded-full" />
                            Reversion of Rights
                        </a>
                        <a href="#warranties" className="text-slate-600 hover:text-red-700 transition-colors flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-red-700 rounded-full" />
                            Author Warranties
                        </a>
                        <a href="#law" className="text-slate-600 hover:text-red-700 transition-colors flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-red-700 rounded-full" />
                            Governing Law & Jurisdiction
                        </a>
                    </div>
                </div>

                {/* Main Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden text-justify">
                    <div className="bg-slate-900 px-8 py-6">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <UserCheck size={24} />
                            Author Terms of Submission
                        </h2>
                    </div>

                    <div className="p-8 space-y-10 text-slate-700 leading-relaxed">
                        {/* Intro */}
                        <section id="intro" className="space-y-4">
                            <p>
                                By submitting any material to this website, the Author agrees to be bound by the following Terms
                                and Conditions. These terms constitute a legally binding agreement between the Author and Law
                                Nation Prime Times Journal (&ldquo;LN&rdquo;).
                            </p>
                            <p>
                                &ldquo;<strong>Author&rsquo;s Submission</strong>&rdquo; refers to all materials submitted by the
                                Author to LN, including but not limited to research papers, articles, manuscripts, abstracts,
                                figures, images, audio-visual materials, and/or any other accompanying data submitted by the
                                Author.
                            </p>
                        </section>

                        {/* Exclusivity */}
                        <section id="exclusivity" className="space-y-3">
                            <h3 className="text-xl font-bold text-slate-900">
                                1. The Exclusivity Period
                            </h3>
                            <p>
                                To ensure the integrity of the review process, the Author agrees to the following strict
                                exclusivity terms:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>
                                    Upon submission, the Author grants LN an exclusive, irrevocable right to review the
                                    Author&rsquo;s Submission for a period of sixty (60) days from the date of submission.
                                </li>
                                <li>
                                    The Author warrants that the Author&rsquo;s Submission is not currently under review by any
                                    other publication, and the Author agrees not to submit, publish, post, or license the
                                    Author&rsquo;s Submission to any other third party during the said period.
                                </li>
                            </ul>
                        </section>

                        {/* Ownership */}
                        <section id="ownership" className="space-y-3">
                            <h3 className="text-xl font-bold text-slate-900">
                                2. Transfer of Ownership and Copyright
                            </h3>
                            <p>
                                If, within the said period, LN (a) publishes the Author&rsquo;s Submission, or (b) communicates
                                acceptance of the Author&rsquo;s Submission for future publication:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>
                                    The Author hereby assigns, transfers, and conveys all right, title, and interest in the
                                    Author&rsquo;s Submission to LN, which shall include the copyright and intellectual property
                                    rights subject to the applicable laws.
                                </li>
                                <li>
                                    LN shall own the exclusive right to reproduce, distribute, display, perform, adapt,
                                    translate, and create derivative works of the Author&rsquo;s Submission in any format now
                                    known or hereafter developed (including print, digital, and electronic databases).
                                </li>
                                <li>
                                    LN shall have all the rights in the Author&rsquo;s Submission post publication which shall be
                                    valid for a full term of copyright and any extensions or renewals thereof. The Author
                                    retains no residual rights to the accepted/published work without the express written consent
                                    of LN.
                                </li>
                            </ul>
                        </section>

                        {/* Reversion */}
                        <section id="reversion" className="space-y-3">
                            <h3 className="text-xl font-bold text-slate-900">
                                3. Reversion of Rights (Rejection or Expiry)
                            </h3>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>
                                    Ownership of the Author&rsquo;s Submission shall revert to the Author{" "}
                                    <strong>only if</strong>:
                                    <ul className="list-[lower-roman] pl-6 mt-2 space-y-1">
                                        <li>LN explicitly rejects the Author&rsquo;s Submission in writing; or</li>
                                        <li>
                                            After expiry of sixty (60) days from the date of the Author&rsquo;s Submission,
                                            without LN publishing the content or notifying the Author of
                                            acceptance/publication.
                                        </li>
                                    </ul>
                                </li>
                                <li>
                                    In any of the aforementioned conditions in Clause 3(a) or 3(b), the Author&rsquo;s Submission
                                    is no longer the property of LN, and the Author is free to publish it elsewhere.
                                </li>
                                <li>
                                    <strong>No Liability:</strong> LN shall not be liable for any loss of opportunity or damages
                                    resulting from the delay during the review period of sixty (60) days and/or subsequent
                                    rejection.
                                </li>
                            </ul>
                        </section>

                        {/* Warranties */}
                        <section id="warranties" className="space-y-3">
                            <h3 className="text-xl font-bold text-slate-900">
                                4. Author Warranties and Strict Liability
                            </h3>
                            <p>The Author represents and warrants that:</p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>The Author&rsquo;s Submission is entirely original and is the Author&rsquo;s own work.</li>
                                <li>
                                    The Author&rsquo;s Submission does not exceed the permissible limit of plagiarism i.e., 12%
                                    and does not infringe upon the copyright, trademark, privacy, or any other rights of any
                                    third party.
                                </li>
                                <li>
                                    The Author&rsquo;s Submission is not defamatory, libelous, obscene, or seditious, and does
                                    not violate the applicable laws.
                                </li>
                                <li>
                                    The Author agrees to indemnify, defend, and hold harmless LN, its publishers, editors, and
                                    agents from any and all claims, liabilities, legal fees, and damages arising from a breach of
                                    these warranties or any third-party claim regarding the Author&rsquo;s Submission.
                                </li>
                            </ul>
                        </section>

                        {/* Law */}
                        <section id="law" className="space-y-3">
                            <h3 className="text-xl font-bold text-slate-900">
                                5. Governing Law and Jurisdiction
                            </h3>
                            <p>
                                These Terms shall be governed by and construed in accordance with the laws of India. Any
                                disputes regarding the ownership or publication of the Author&rsquo;s Submission shall be subject
                                to the exclusive jurisdiction of the courts located in New Delhi.
                            </p>
                        </section>
                    </div>
                </div>

                {/* Back to Top Button */}
                <button
                    onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                    className="fixed bottom-8 right-8 p-3 bg-red-700 text-white rounded-full shadow-lg hover:bg-red-800 transition-all z-50"
                    title="Back to Top"
                >
                    <Gavel size={24} />
                </button>
            </div>
        </div>
    );
}

