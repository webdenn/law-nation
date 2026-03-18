"use client";

import React from "react";
import { FileText, ShieldCheck, Gavel } from "lucide-react";

export default function CopyrightPolicyPage() {
    return (
        <div className="min-h-screen bg-gray-50 pt-24 pb-16">
            <div className="max-w-4xl mx-auto px-6">
                {/* Header */}
                <div className="text-center mb-16">
                    <h1 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">
                        Copyright &amp; Intellectual Property Policy
                    </h1>
                    <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                        Law Nation Prime Times Journal (&ldquo;LN&rdquo;) respects and protects the intellectual property
                        rights of authors, publishers, and creators. This Policy explains how copyright and related rights
                        are handled for content published on LN.
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
                            Overview &amp; Scope
                        </a>
                        <a href="#rights" className="text-slate-600 hover:text-red-700 transition-colors flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-red-700 rounded-full" />
                            Rights &amp; Permitted Use
                        </a>
                        <a href="#prohibited" className="text-slate-600 hover:text-red-700 transition-colors flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-red-700 rounded-full" />
                            Prohibited Actions
                        </a>
                        <a href="#takedown" className="text-slate-600 hover:text-red-700 transition-colors flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-red-700 rounded-full" />
                            Copyright Infringement &amp; Takedown
                        </a>
                        <a href="#repeat" className="text-slate-600 hover:text-red-700 transition-colors flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-red-700 rounded-full" />
                            Counter-Notice &amp; Repeat Infringers
                        </a>
                        <a href="#law" className="text-slate-600 hover:text-red-700 transition-colors flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-red-700 rounded-full" />
                            Governing Law &amp; Jurisdiction
                        </a>
                    </div>
                </div>

                {/* Main Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden text-justify">
                    <div className="bg-slate-900 px-8 py-6">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <ShieldCheck size={24} />
                            Copyright &amp; IP Policy
                        </h2>
                    </div>

                    <div className="p-8 space-y-10 text-slate-700 leading-relaxed">
                        {/* Intro */}
                        <section id="intro" className="space-y-4">
                            <p>
                                Law Nation Prime Times Journal (&ldquo;LN&rdquo;) respects and protects the intellectual
                                property rights of authors, publishers, and creators. This Copyright &amp; Intellectual
                                Property Policy outlines the legal relationship between LN, its contributors, and the public
                                (&ldquo;Users&rdquo;), operating in strict compliance with the Copyright Act, 1957 and the
                                Information Technology Act, 2000 (including the IT Rules, 2021).
                            </p>
                            <p>
                                This Policy governs all content hosted or published on LN, including but not limited to
                                articles, research papers, commentaries, images, figures, graphs, audio-visual material, and
                                any other associated data or metadata.
                            </p>
                        </section>

                        {/* Rights & Permitted Use */}
                        <section id="rights" className="space-y-4">
                            <h3 className="text-xl font-bold text-slate-900">
                                1. Rights, Ownership &amp; Permitted Use
                            </h3>

                            <div className="space-y-3">
                                <h4 className="font-semibold text-slate-900">1.1 Copyright Vesting &amp; Ownership</h4>
                                <p>
                                    Unless otherwise agreed in writing, copyright in original articles published on LN
                                    remains with the respective authors, subject to the license granted to LN for publication
                                    and archiving. At the same time, all rights, title, and interest in and to the selection,
                                    arrangement, curation, and presentation of content on LN (including the website design and
                                    editorial formatting) shall exclusively vest with LN.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <h4 className="font-semibold text-slate-900">1.2 Grant of License to LN</h4>
                                <p>
                                    By submitting a work for publication, the author grants LN an irrevocable, worldwide,
                                    royalty-free, and non-exclusive license to publish, reproduce, distribute, display, and
                                    archive the work in digital, electronic, and print formats, including in databases or
                                    indices maintained by LN or its partners.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <h4 className="font-semibold text-slate-900">1.3 Educational &amp; Research Use</h4>
                                <p>
                                    LN encourages the academic dissemination of knowledge. Users may download, print, or share
                                    excerpts of articles strictly for personal, non-commercial, educational, or academic
                                    research purposes, in accordance with the &ldquo;Fair Dealing&rdquo; provisions of
                                    Section 52 of the Copyright Act, 1957.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <h4 className="font-semibold text-slate-900">1.4 Citation Requirement</h4>
                                <p>
                                    Any use of content permitted under &ldquo;Fair Dealing&rdquo; principles must be
                                    accompanied by adequate citation, credit, and, where possible, an accessible link to the
                                    original source at LN.
                                </p>
                                <p className="italic text-sm text-slate-600">
                                    Suggested Citation: &copy;[Year] Law Nation Prime Times Journal. All rights reserved.
                                    Available at: [URL].
                                </p>
                            </div>
                        </section>

                        {/* Prohibited Actions */}
                        <section id="prohibited" className="space-y-4">
                            <h3 className="text-xl font-bold text-slate-900">
                                2. Prohibited Actions
                            </h3>
                            <p>
                                To protect the integrity of the scholarly record and the rights of authors, the following
                                activities are strictly prohibited without the prior written permission of LN:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>
                                    Removing, obscuring, or altering any copyright notices, watermarks, or identifying data
                                    embedded in the content.
                                </li>
                                <li>
                                    Using LN content, in whole or in part, to train or fine-tune Artificial Intelligence (AI)
                                    systems, Large Language Models (LLMs), or any other automated text or data processing
                                    models.
                                </li>
                                <li>Mass downloading, &ldquo;scraping&rdquo;, or systematic &ldquo;harvesting&rdquo; of articles or metadata.</li>
                                <li>
                                    Republishing, selling, sublicensing, or commercially exploiting any LN content beyond what
                                    is permitted under applicable law or a specific written license from LN.
                                </li>
                                <li>Any other similar action or activity that undermines the rights of LN or its authors.</li>
                            </ul>
                        </section>

                        {/* Takedown Procedure */}
                        <section id="takedown" className="space-y-4">
                            <h3 className="text-xl font-bold text-slate-900">
                                3. Notice of Copyright Infringement (Takedown Procedure)
                            </h3>
                            <p>
                                In accordance with the Information Technology (Intermediary Guidelines and Digital Media Ethics
                                Code) Rules, 2021, if a User believes that materials hosted on the Site infringe their
                                copyright, they may submit a written notice containing the following details:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>
                                    <strong>Identification:</strong> A clear description of the copyrighted work claimed to be
                                    infringed.
                                </li>
                                <li>
                                    <strong>Location:</strong> A description of where the alleged infringing material is located
                                    on the Site (including the precise URL).
                                </li>
                                <li>
                                    <strong>Contact Information:</strong> The complainant&apos;s full name, postal address,
                                    telephone number, and email address.
                                </li>
                                <li>
                                    <strong>Statement of Good Faith:</strong> A statement that the complainant believes in good
                                    faith that the disputed use is not authorized by the copyright owner, its agent, or the law.
                                </li>
                                <li>
                                    <strong>Statement of Accuracy:</strong> A statement, made under penalty of perjury, that the
                                    information in the notice is accurate and that the complainant is the copyright owner or
                                    authorized to act on the owner&apos;s behalf.
                                </li>
                                <li>
                                    <strong>Signature:</strong> An electronic or physical signature of the person authorized to
                                    act on behalf of the copyright owner.
                                </li>
                            </ul>
                            <p>
                                <strong>Send Notices to:</strong> <br />
                                Email:{" "}
                                <a href="mailto:mail@lawnation.co.in" className="text-red-700 hover:underline">
                                    mail@lawnation.co.in
                                </a>{" "}
                                <br />
                                Subject Line: <span className="italic">Copyright Infringement Notice</span>
                            </p>
                        </section>

                        {/* Counter Notice & Repeat Infringers */}
                        <section id="repeat" className="space-y-4">
                            <h3 className="text-xl font-bold text-slate-900">
                                4. Counter-Notice &amp; Repeat Infringers
                            </h3>
                            <div className="space-y-3">
                                <h4 className="font-semibold text-slate-900">4.1 Counter-Notice</h4>
                                <p>
                                    If a User believes that their content was removed or disabled as a result of mistake or
                                    misidentification, they may submit a counter-notice to the email address mentioned above,
                                    providing evidence of their right to post or use the material.
                                </p>
                            </div>
                            <div className="space-y-3">
                                <h4 className="font-semibold text-slate-900">4.2 Repeat Infringers</h4>
                                <p>
                                    LN follows a strict &ldquo;Repeat Infringer&rdquo; policy. LN reserves the right to suspend
                                    or terminate access for Users who repeatedly violate the intellectual property rights of
                                    others, or who repeatedly upload or share infringing material.
                                </p>
                            </div>
                        </section>

                        {/* Permissions & Law */}
                        <section id="law" className="space-y-4">
                            <h3 className="text-xl font-bold text-slate-900">
                                5. Permissions, Governing Law &amp; Jurisdiction
                            </h3>
                            <p>
                                <strong>Permissions:</strong> For requests regarding commercial use, bulk reproduction,
                                translation rights, or any other use beyond personal, non-commercial purposes, Users should
                                contact the LN Editorial Board at{" "}
                                <a href="mailto:mail@lawnation.co.in" className="text-red-700 hover:underline">
                                    mail@lawnation.co.in
                                </a>
                                .
                            </p>
                            <p>
                                <strong>Governing Law &amp; Jurisdiction:</strong> This Policy and any disputes arising out of
                                or related to it shall be governed by and construed in accordance with the laws of India. Any
                                legal actions or proceedings shall be subject to the exclusive jurisdiction of the courts
                                located in New Delhi.
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

