"use client";

import React from "react";
import { Scale, ShieldCheck, UserCheck, FileText, Gavel, AlertTriangle } from "lucide-react";

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-gray-50 pt-24 pb-16">
            <div className="max-w-4xl mx-auto px-6">
                {/* Header */}
                <div className="text-center mb-16">
                    <h1 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">
                        Terms of Service and Condition
                    </h1>
                    <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                        Please read these terms carefully before using our platform or submitting your work.
                    </p>
                </div>

                {/* Main Terms Content */}
                <div className="space-y-12">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden text-justify">
                        <div className="bg-slate-900 px-8 py-6">
                            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                <Scale size={24} />
                                Terms of Service
                            </h2>
                        </div>
                        <div className="p-8 space-y-8 text-slate-700 leading-relaxed">
                            <p>
                                Welcome to Law Nation Prime Times Journal (&quot;LN,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). By accessing, browsing, or using the website located at{" "}
                                <a href="https://lawnation.co.in" className="text-red-700 hover:underline">
                                    lawnation.co.in
                                </a>{" "}
                                (the &quot;Site&quot;), you acknowledge that you have read, understood, and agree to be unequivocally bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, you must immediately cease use of the Site.
                            </p>

                            <div>
                                <h3 className="text-xl font-bold text-slate-900 mb-4">Intellectual Property Rights</h3>
                                <p>
                                    Unless otherwise explicitly stated, LN and/or its licensors own the intellectual property rights for all material on the Site, including but not limited to the user interface, design, code, text, graphics, and scholarly content (collectively, &quot;Materials&quot;). All intellectual property rights are reserved with LN.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-xl font-bold text-slate-900 mb-4">License to Use the Site</h3>
                                <p className="mb-4">
                                    LN grants you a limited, non-exclusive, non-transferable, and revocable right to access the Site for personal, non-commercial, educational, and scholarly research purposes only, subject to the following restrictions:
                                </p>
                                <ul className="space-y-3 list-disc pl-6">
                                    <li>
                                        <strong>Prohibited Commercial Use:</strong> You shall not sell, rent, sub-license, or monetize any Materials from this Site.
                                    </li>
                                    <li>
                                        <strong>No Republication:</strong> You shall not republish material from this Site on any other website, database, or platform without express written consent from LN.
                                    </li>
                                    <li>
                                        <strong>No Derivative Works:</strong> You shall not edit, modify, or create derivative works from any Materials on this Site.
                                    </li>
                                    <li>
                                        <strong>Systematic Retrieval:</strong> You are strictly prohibited from using automated systems (e.g., robots, spiders, scrapers, crawlers) to access the Site for the purpose of &quot;data mining,&quot; &quot;text mining,&quot; or scraping content for AI training datasets or machine learning models.
                                    </li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="text-xl font-bold text-slate-900 mb-4">User Conduct and Acceptable Use</h3>
                                <p className="mb-4">
                                    By accessing this Site, you unequivocally agree and covenant not to engage/use whether directly or indirectly in any conduct that disrupts, damages, or limits the functionality of the Site. This prohibition extends to any use that compromises the Site&apos;s security or creates an undue burden on our resources, thereby impairing the availability or accessibility of the Site for us or other users. Also, you must not:
                                </p>
                                <ul className="space-y-3 list-disc pl-6">
                                    <li>Use the Site in connection with any unlawful, illegal, fraudulent, or harmful purpose or activity.</li>
                                    <li>Distribute any spyware, computer virus, Trojan horse, worm, keystroke logger, rootkit, or other malicious computer software.</li>
                                    <li>Engage in any conduct that restricts or inhibits any other user from using or enjoying the Site.</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="text-xl font-bold text-slate-900 mb-4">User-Generated Content and Submissions</h3>
                                <p className="mb-4">
                                    In these Terms, &quot;User Content&quot; shall mean material (including articles, comments, and multimedia) that you/author submit to this Site.
                                </p>
                                <ul className="space-y-3 list-disc pl-6">
                                    <li>
                                        By submitting User Content, you grant LN a worldwide, irrevocable, non-exclusive, royalty-free, and perpetual license to use, reproduce, adapt, publish, translate, archive, and distribute said content in any existing or future media.
                                    </li>
                                    <li>
                                        You warrant that your User Content is original, does not infringe upon any third party&apos;s legal rights (including copyright and moral rights), and is not the subject of any threatened or actual legal proceedings.
                                    </li>
                                    <li>LN reserves the right to edit, reject, or remove any User Content at its sole discretion without prior notice.</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="text-xl font-bold text-slate-900 mb-4">Disclaimer of Warranties</h3>
                                <p className="mb-4">
                                    The Site and all Materials are provided on an &quot;as is&quot; and &quot;as available&quot; basis. To the fullest extent permitted by law, LN makes no representations or warranties, express or implied, regarding:
                                </p>
                                <ul className="space-y-3 list-disc pl-6">
                                    <li>The completeness, accuracy, reliability, or currency of the information found on the Site.</li>
                                    <li>The continuous, uninterrupted, or error-free availability of the Site.</li>
                                    <li>
                                        <strong>Legal Advice:</strong> Nothing contained on this Site constitutes, or is intended to constitute, legal advice. Content is for informational and academic purposes only.
                                    </li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="text-xl font-bold text-slate-900 mb-4 text-justify">Limitation of Liability</h3>
                                <p>
                                    To the extent permitted by applicable law, LN and its affiliates (including but not limited to editors, reviewers, employees, and agents) shall not be liable for any direct, indirect, special, or consequential loss; or for any business losses, loss of revenue, income, profits, or anticipated savings, loss of contracts or business relationships, loss of reputation or goodwill, or loss or corruption of information or data in connection with the use of this Site.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-xl font-bold text-slate-900 mb-4">Indemnification</h3>
                                <p>
                                    You agree to indemnify, defend, and hold harmless LN and its affiliates (including but not limited to editors, reviewers, employees, and agents) against any losses, damages, costs, liabilities, and expenses (including legal fees) arising out of any breach by you of these Terms or your violation of any law or the rights of a third party.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-xl font-bold text-slate-900 mb-4">Governing Law and Jurisdiction</h3>
                                <p>
                                    These Terms shall be governed by and construed in accordance with the laws of India. Any disputes regarding the ownership or publication of Your Submission shall be subject to the exclusive jurisdiction of the courts located in New Delhi.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Floating Back to Top Button */}
                <button
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="fixed bottom-8 right-8 p-3 bg-red-700 text-white rounded-full shadow-lg hover:bg-red-800 transition-all z-50"
                    title="Back to Top"
                >
                    <Gavel size={24} />
                </button>
            </div>
        </div>
    );
}
