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
                        Terms of Submission
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
                            <h4 className="text-lg font-bold text-gray-900 uppercase">Terms of Submission</h4>
                        </div>

                        <p>
                            By submitting any material to this website, the Author agrees to be bound by the following Terms and Conditions. These terms constitute a legally binding agreement between the Author and Law Nation Prime Times Journal ("LN").
                        </p>

                        <p>
                            "Author's Submission" refers to all materials submitted by the Author to LN, including but not limited to research papers, articles, manuscripts, abstracts, figures, images, audio-visual materials, and/or any other accompanying data submitted by the Author.
                        </p>

                        <div>
                            <h5 className="font-bold text-gray-900 mb-2">1. The Exclusivity Period:</h5>
                            <p className="mb-2">To ensure the integrity of the review process, the Author agree to the following strict exclusivity terms:</p>
                            <ul className="list-lower-alpha ml-6 space-y-2">
                                <li>Upon submission, the Author grants LN an exclusive, irrevocable right to review the Author’s Submission for a period of sixty (60) days from the date of submission.</li>
                                <li>The Author warrant that the Author’s Submission is not currently under review by any other publication, and the Author agree not to submit, publish, post, or license the Author’s Submission to any other third party during the said period.</li>
                            </ul>
                        </div>

                        <div>
                            <h5 className="font-bold text-gray-900 mb-2">2. Transfer of Ownership and Copyright:</h5>
                            <p className="mb-2">If, within the said period, LN (a) publishes the Author’s Submission, or (b) communicates acceptance of the Author’s Submission for future publication:</p>
                            <ul className="list-lower-alpha ml-6 space-y-2">
                                <li>The Author hereby assigns, transfers, and conveys all right, title, and interest in the Author’s Submission to LN, which shall include the copyright and intellectual property rights subject to the applicable laws.</li>
                                <li>LN shall own the exclusive right to reproduce, distribute, display, perform, adapt, translate, and create derivative works of the Author’s Submission in any format now known or hereafter developed (including print, digital, and electronic databases).</li>
                                <li>LN shall have all the rights in the Author’s Submission post publication which shall be valid for a full term of copyright and any extensions or renewals thereof. The Author retains no residual rights to the accepted/published work without the express written consent of LN.</li>
                            </ul>
                        </div>

                        <div>
                            <h5 className="font-bold text-gray-900 mb-2">3. Editorial Discretion and Moral Rights:</h5>
                            <p>LN reserves the absolute right to edit, redact, modify, shorten, or format the Author’s Submission as per editorial standards, clarity, or legal requirements.</p>
                        </div>

                        <div>
                            <h5 className="font-bold text-gray-900 mb-2">4. Reversion of Rights (Rejection or Expiry):</h5>
                            <ul className="list-lower-alpha ml-6 space-y-2 text-justify">
                                <li>
                                    Ownership of the Author's Submission shall revert to the Author <strong>only if</strong>:
                                    <ul className="list-lower-roman ml-6 mt-1 space-y-1">
                                        <li>LN explicitly rejects the Author's Submission in writing; OR</li>
                                        <li>After expiry of sixty (60) days from the date of the Author’s Submission, <strong>without</strong> LN publishing the content or notifying the Author of acceptance/publication.</li>
                                    </ul>
                                </li>
                                <li>In any of aforementioned conditions in Clause 4(a) or 4(b), the Author’s Submission is no longer the property of LN, and the sixty (60) days is free to publish it elsewhere.</li>
                                <li><strong>No Liability:</strong> LN shall not be liable for any loss of opportunity or damages resulting from the delay during the review period of sixty (60) days and/or subsequent rejection.</li>
                            </ul>
                        </div>

                        <div>
                            <h5 className="font-bold text-gray-900 mb-2">5. Author Warranties and Strict Liability:</h5>
                            <p className="mb-2">The Author represents and warrants that:</p>
                            <ul className="list-lower-alpha ml-6 space-y-2">
                                <li>The Author’s Submission is entirely original and is the Author’s own work.</li>
                                <li>The Author’s Submission does not exceed the permissible limit of plagiarism i.e., 12 % and does not infringe upon the copyright, trademark, privacy, or any other rights of any third party.</li>
                                <li>The Author’s Submission is not defamatory, libelous, obscene, or seditious, and does not violate the applicable laws.</li>
                                <li>The Author agrees to indemnify, defend, and hold harmless LN, its publishers, editors, and agents from any and all claims, liabilities, legal fees, and damages arising from a breach of these warranties or any third-party claim regarding the Author’s Submission.</li>
                            </ul>
                        </div>

                        <div>
                            <h5 className="font-bold text-gray-900 mb-2">6. Governing Law and Jurisdiction:</h5>
                            <p>These Terms shall be governed by and construed in accordance with the laws of India. Any disputes regarding the ownership or publication of the Author’s Submission shall be subject to the exclusive jurisdiction of the courts located in New Delhi.</p>
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

export default TermsModal;
