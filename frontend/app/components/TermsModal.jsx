"use client";
import React, { useState } from "react";

const TermsModal = ({ isOpen, onClose, onAccept }) => {
    const [termsScrolled, setTermsScrolled] = useState(false);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-9999 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] sm:max-h-[85vh] animate-fadeIn border border-gray-100">
                {/* Modal Header */}
                <div className="p-5 sm:p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                    <h3 className="text-xl font-bold text-gray-900">
                        Terms and Conditions
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
                    <div className="space-y-4">
                        <p className="font-semibold text-gray-900">
                            Please read the following terms carefully before submitting.
                        </p>
                        <p>
                            1. <strong>Originality:</strong> I/We declare that the manuscript is an
                            original work and has not been published previously in any form. It is
                            not currently under consideration for publication elsewhere.
                        </p>
                        <p>
                            2. <strong>Authorship:</strong> All authors have significantly contributed
                            to the research and manuscript preparation. I confirm that I have the
                            authority to submit this work on behalf of all co-authors.
                        </p>
                        <p>
                            3. <strong>Copyright & Licensing:</strong> Upon acceptance, the copyright
                            of the manuscript will be transferred to Law Nation Prime Times Journal.
                            The journal reserves the right to distribute, publish, and reproduce the
                            article.
                        </p>
                        <p>
                            4. <strong>Liability:</strong> The authors bear full responsibility for
                            the content. Law Nation Prime Times Journal is not liable for any claims
                            related to plagiarism, defamation, or copyright infringement arising from
                            the published work.
                        </p>
                        <p>
                            5. <strong>Ethics:</strong> The research adheres to ethical standards. Any
                            conflicts of interest have been disclosed.
                        </p>
                        <p>
                            6. <strong>Review Process:</strong> I understand that the manuscript will
                            undergo a peer-review process, and acceptance is subject to the reviewers'
                            comments and editorial decision.
                        </p>
                        <p>
                            7. <strong>Withdrawal Policy:</strong> Withdrawal of the manuscript after
                            submission may be subject to the journal's withdrawal policy and potential
                            fees if the review process has already commenced.
                        </p>
                        <p>
                            8. <strong>Data Privacy:</strong> Personal data collected during submission
                            will be used solely for the purpose of processing and publishing the article.
                        </p>
                        <p>
                            9. <strong>Plagiarism Policy:</strong> I understand that my submission will
                            be checked for plagiarism. If similarity counts exceed the permissible limit,
                            the manuscript may be rejected immediately.
                        </p>
                        <p>
                            10. <strong>Declaration:</strong> By clicking "I Accept", I confirm that all
                            information provided is accurate and I agree to abide by the terms stated above.
                        </p>
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

export default TermsModal;
