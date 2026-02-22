"use client";
import React, { useState } from "react";

const ReviewerTermsModal = ({ isOpen, onClose, onAccept }) => {
    const [termsScrolled, setTermsScrolled] = useState(false);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-9999 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] sm:max-h-[85vh] animate-fadeIn border border-gray-100">
                {/* Modal Header */}
                <div className="p-5 sm:p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                    <h3 className="text-xl font-bold text-gray-900">
                        Stage 2 Reviewer Terms & Ethical Guidelines
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
                            <h4 className="text-lg font-bold text-gray-900 uppercase">Stage 2 Reviewer Terms and Conditions & Ethical Guidelines</h4>
                        </div>

                        <div>
                            <h5 className="font-bold text-gray-900 mb-2">Acceptance of Role and Agreement</h5>
                            <p>
                                By accepting an invitation to review an article, analysis, and/or any other material for Law Nation Prime Times Journal (“LN”), or by accessing the stage 2 reviewer portal, you (“the Stage 2 Reviewer”) unequivocally agree to be bound by these Terms and Conditions. These terms are intended to protect the integrity of the double-blind peer review process, the intellectual property of the authors, and the reputation of LN.
                            </p>
                        </div>

                        <div>
                            <h5 className="font-bold text-gray-900 mb-2">Confidentiality and Non-Disclosure</h5>
                            <p className="mb-2">The peer review process is confidential and privileged. As a Reviewer, you acknowledge that the article, analysis, and/or any other material provided to you are the exclusive intellectual property of the author(s) until published.</p>
                            <ul className="list-disc ml-6 space-y-2">
                                <li>You unequivocally agree to treat the article, analysis, or any other material and your feedback as strictly confidential. You shall not discuss the article, analysis, and/or any other material with colleagues, students, or third parties without the prior written consent of the LN Editorial Board.</li>
                                <li>You are strictly prohibited from using, copying, quoting, or circulating the article, analysis, and/or any other material, for your own research, teaching, or any other personal or professional purpose prior to its publication.</li>
                                <li>You must not save copies of the article, analysis, and/or any other material, on public computers or shared networks. Upon submission of your review, strictly delete or destroy all digital and physical copies of the article, analysis, and/or any other material.</li>
                            </ul>
                        </div>

                        <div>
                            <h5 className="font-bold text-gray-900 mb-2">Conflicts of Interest</h5>
                            <p className="mb-2">To ensure an unbiased review, you must declare any potential competing interests immediately upon receiving a review invitation.</p>
                            <ul className="list-disc ml-6 space-y-2">
                                <li><strong>Definitions:</strong> A conflict of interest exists if you have a financial, professional, or personal relationship with the author(s) (if known), or if the article, analysis, and/or any other material is directly competitive with your own work currently under preparation.</li>
                                <li><strong>Recusal:</strong> If you identify a conflict, or if you feel you cannot provide an objective assessment, you must decline the invitation or inform the LN Editorial Board immediately so that the article, analysis, and/or any other material may be reassigned.</li>
                            </ul>
                        </div>

                        <div>
                            <h5 className="font-bold text-gray-900 mb-2">Intellectual Property Rights</h5>
                            <ul className="list-disc ml-6 space-y-2">
                                <li>You acknowledge that the article, analysis, and/or any other material is protected by copyright and other intellectual property laws. Your access to the article, analysis, and/or any other material is a limited license solely for the purpose of peer review.</li>
                                <li>By submitting a review, you grant LN a perpetual, irrevocable, right to use, reproduce, and store your review comments for internal decision-making and communication with the author.</li>
                                <li>You unequivocally agree not to appropriate, steal, or plagiarize any ideas, data, arguments, or interpretations presented in the unpublished article, analysis, and/or any other material.</li>
                            </ul>
                        </div>

                        <div>
                            <h5 className="font-bold text-gray-900 mb-2">Standards of Review</h5>
                            <ul className="list-disc ml-6 space-y-2">
                                <li>Reviews must be conducted objectively. Personal criticism of the author is inappropriate.</li>
                                <li>Remarks should be formulated clearly with supporting arguments to help the author improve the article, analysis, and/or any other material.</li>
                                <li>You agree to adhere to the deadlines stipulated by the LN Editorial Board. If you anticipate a delay, you must notify the said Editorial Board immediately.</li>
                            </ul>
                        </div>

                        <div>
                            <h5 className="font-bold text-gray-900 mb-2">Ethical Responsibilities</h5>
                            <ul className="list-disc ml-6 space-y-2">
                                <li>If you suspect plagiarism, simultaneous submission to another journal, duplicate publication, or data fabrication, you must report this to the LN Editor in strict confidence. Do not investigate the issue personally.</li>
                                <li>You agree not to upload the article, analysis, and/or any other material into generative AI tools (e.g., ChatGPT, Claude) for the purpose of generating a review or summary, as this violates confidentiality and data privacy terms.</li>
                            </ul>
                        </div>

                        <div>
                            <h5 className="font-bold text-gray-900 mb-2">Limitation of Liability & Indemnity</h5>
                            <ul className="list-disc ml-6 space-y-2 text-justify">
                                <li>You acknowledge that, unless otherwise agreed in writing, the role of Reviewer is voluntary and uncompensated.</li>
                                <li>You hereby indemnify LN against any losses, damages, or legal costs arising out of your breach of confidentiality, violation of intellectual property rights, or professional misconduct during the review process.</li>
                            </ul>
                        </div>

                        <div>
                            <h5 className="font-bold text-gray-900 mb-2">Termination of Reviewer Status</h5>
                            <p>
                                LN reserves the right to remove a Reviewer from its panel at its sole discretion, without notice, for failure to meet deadlines, producing poor-quality reviews, or breaching these Terms and Conditions.
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
                            ? "bg-linear-to-r from-red-600 to-red-700 text-white transform hover:-translate-y-0.5 hover:shadow-lg cursor-pointer"
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

export default ReviewerTermsModal;
