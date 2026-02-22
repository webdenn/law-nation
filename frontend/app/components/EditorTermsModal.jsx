"use client";
import React, { useState } from "react";

const EditorTermsModal = ({ isOpen, onClose, onAccept }) => {
    const [termsScrolled, setTermsScrolled] = useState(false);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-9999 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] sm:max-h-[85vh] animate-fadeIn border border-gray-100">
                {/* Modal Header */}
                <div className="p-5 sm:p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                    <h3 className="text-xl font-bold text-gray-900">
                        Stage 1 Reviewer Terms & Ethical Guidelines
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                    >
                        <svg
                            className="w-6 h-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                {/* Scrollable Content */}
                <div
                    className="p-6 overflow-y-auto text-sm sm:text-base text-gray-600 leading-relaxed scroll-smooth"
                    onScroll={(e) => {
                        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
                        if (scrollHeight - scrollTop <= clientHeight + 10) {
                            setTermsScrolled(true);
                        }
                    }}
                >
                    <div className="space-y-6">
                        <div className="text-center mb-6">
                            <h4 className="text-lg font-bold text-gray-900 uppercase">Stage 1 Reviewer Terms and Conditions & Ethical Guidelines</h4>
                        </div>

                        <div>
                            <h5 className="font-bold text-gray-900 mb-2">1. Acceptance of Role and Agreement</h5>
                            <p>
                                By accepting the appointment as a Stage 1 Reviewer for Law Nation Prime Times Journal (“LN”), the Stage 1 Reviewer (“You”) unequivocally agree to be bound by these Terms and Conditions. The Stage 1 Reviewer serves as the primary custodian of the journal’s integrity, ensuring a fair, objective, and timely publication process.
                            </p>
                        </div>

                        <div>
                            <h5 className="font-bold text-gray-900 mb-2">2. Fiduciary Duty and Confidentiality</h5>
                            <ul className="list-lower-alpha ml-6 space-y-2">
                                <li><strong>Privileged Information:</strong> You must treat all manuscripts, reviewer reports, and editorial discussions as strictly confidential.</li>
                                <li><strong>Non-Disclosure:</strong> You shall not disclose the status of a manuscript or its contents to anyone other than the authors and the assigned reviewers.</li>
                                <li><strong>Author Privacy:</strong> You must protect the identity of authors during the double-blind review process and ensure that reviewer identities are never disclosed to authors.</li>
                            </ul>
                        </div>

                        <div>
                            <h5 className="font-bold text-gray-900 mb-2">3. Editorial Independence and Objectivity</h5>
                            <ul className="list-lower-alpha ml-6 space-y-2">
                                <li><strong>Merit-Based Decisions:</strong> Editorial decisions to accept, reject, or request revisions must be based solely on the article’s quality, originality, and relevance to the journal’s scope, without regard to the author’s race, gender, seniority, or institutional affiliation.</li>
                                <li><strong>Conflict of Interest:</strong> You must recuse yourself from handling any manuscript where you have a conflict of interest (e.g., a personal or professional relationship with the author, or a manuscript that directly competes with your own ongoing research).</li>
                            </ul>
                        </div>

                        <div>
                            <h5 className="font-bold text-gray-900 mb-2">4. Intellectual Property & Ethical Oversight</h5>
                            <ul className="list-lower-alpha ml-6 space-y-2 text-justify">
                                <li><strong>Protection of Work:</strong> You acknowledge that unpublished manuscripts are the intellectual property of the authors. You are strictly prohibited from using any unpublished data or ideas in your own research.</li>
                                <li><strong>Plagiarism & Malpractice:</strong> You are responsible for ensuring every submission undergoes rigorous plagiarism checks. If misconduct (data fabrication, duplicate submission, etc.) is suspected, you must follow the LN Editorial Board’s protocols for investigation.</li>
                                <li><strong>AI Policy:</strong> You must not upload manuscripts into unauthorized generative AI tools for editing or evaluation, ensuring data privacy is maintained at all times.</li>
                            </ul>
                        </div>

                        <div>
                            <h5 className="font-bold text-gray-900 mb-2">5. Standards of Process</h5>
                            <ul className="list-lower-alpha ml-6 space-y-2">
                                <li><strong>Reviewer Management:</strong> You are responsible for selecting qualified Stage 2 Reviewers and ensuring they adhere to the LN Stage 2 Reviewer Guidelines.</li>
                                <li><strong>Timeliness:</strong> You agree to facilitate the editorial process efficiently to meet publication schedules. Delays in decision-making must be communicated to the Editor-in-Chief or the Board.</li>
                                <li><strong>Clarity of Communication:</strong> Feedback provided to authors must be constructive, professional, and supported by the reviewers' findings and your own expert analysis.</li>
                            </ul>
                        </div>

                        <div>
                            <h5 className="font-bold text-gray-900 mb-2">6. Limitation of Liability & Indemnity</h5>
                            <ul className="list-lower-alpha ml-6 space-y-2">
                                <li><strong>Voluntary Nature:</strong> Unless otherwise agreed in writing, the role of Stage 1 Reviewer is a professional appointment and does not constitute an employment contract.</li>
                                <li><strong>Indemnity:</strong> You hereby indemnify LN against any legal costs or damages arising from a proven breach of editorial ethics, violation of copyright, or professional negligence in the handling of manuscripts.</li>
                            </ul>
                        </div>

                        <div>
                            <h5 className="font-bold text-gray-900 mb-2">7. Termination</h5>
                            <p>
                                LN reserves the right to terminate your Stage 1 Reviewer status at its sole discretion for reasons including, but not limited to, breach of confidentiality, failure to manage the peer-review process effectively, or actions that bring the journal into disrepute.
                            </p>
                        </div>

                        <div className="h-10"></div>
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="p-5 sm:p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end gap-3 transition-all">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 text-gray-700 font-medium hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        disabled={!termsScrolled}
                        onClick={() => {
                            onAccept();
                            onClose();
                        }}
                        className={`px-6 py-2.5 rounded-lg font-bold shadow-md transition-all duration-300 flex items-center gap-2 ${termsScrolled
                            ? "bg-linear-to-r from-blue-600 to-blue-700 text-white transform hover:-translate-y-0.5 hover:shadow-lg cursor-pointer"
                            : "bg-gray-300 text-gray-500 cursor-not-allowed"
                            }`}
                    >
                        {termsScrolled ? (
                            <>
                                I Accept
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </>
                        ) : (
                            <span className="flex items-center gap-2">
                                Accept (Scroll to Read)
                                <svg className="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                </svg>
                            </span>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditorTermsModal;
