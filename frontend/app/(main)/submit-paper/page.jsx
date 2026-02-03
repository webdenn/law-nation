"use client";
import { useState, useRef, useEffect } from "react";
// 1. Toastify imports
import { ToastContainer, toast } from "react-toastify";
import { useRouter } from "next/navigation";
import "react-toastify/dist/ReactToastify.css";
import ReCAPTCHA from "react-google-recaptcha"; // ✅ New Import
export default function SubmitPaperPage() {
  const router = useRouter();
  const getWordCount = (text) => {
    return text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length;
  };
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;

  const fileInputRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [showVerification, setShowVerification] = useState(false);
  const [otp, setOtp] = useState("");
  const [pendingArticleId, setPendingArticleId] = useState(null);

  const initialFormState = {
    fullName: "",
    email: "",
    declarationAccepted: false,
    phone: "",
    articleTitle: "",
    authorImage: null,
    detailedDescription: "",
    keywords: [],
    file: null,
    authorDeclaration: "author",
    contentFormat: "",
    submissionOnBehalfName: "",
    secondAuthorName: "",
    secondAuthorEmail: "",
  };

  const [formData, setFormData] = useState(initialFormState);
  const [keywordInput, setKeywordInput] = useState("");
  const [captchaToken, setCaptchaToken] = useState(null); // ✅ Captcha State
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  // ✅ Terms & Conditions State
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsScrolled, setTermsScrolled] = useState(false);

  const handleCaptchaChange = (token) => {
    setCaptchaToken(token); // ✅ Token set karo
  };

  // --- LOGIN CHECK & AUTOFILL ---
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const storedUser = localStorage.getItem("user");
    if (token && storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setFormData((prev) => ({
          ...prev,
          fullName: userData.name || "",
          email: userData.email || "",
        }));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const steps = [
    { number: 1, title: "Author Details" },
    { number: 2, title: "Article Information" },
    { number: 3, title: "Submit Your Article" },
  ];

  // --- UPDATED HANDLE INPUT CHANGE ---
  // --- NAYA HANDLE INPUT CHANGE (Typing Block karne ke liye) ---
  // Simple Input Change (HTML attributes will handle limits)
  const handleInputChange = (e) => {
    const { name, value, files, type, checked } = e.target;

    // Explicit Check: If checking file input, ensure it is PDF
    if (name === "file" && files && files[0]) {
      if (files[0].type !== "application/pdf") {
        toast.error("Only PDF files are supported.", {
          position: "top-right",
          theme: "colored"
        });
        // Clear value so invalid file is not kept
        e.target.value = "";
        return;
      }
    }

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : files ? files[0] : value,
    }));
  };

  const handleAddKeyword = () => {
    if (keywordInput.trim() && formData.keywords.length < 5) {
      setFormData((prev) => ({
        ...prev,
        keywords: [...prev.keywords, keywordInput.trim()],
      }));
      setKeywordInput("");
    }
  };

  const handleRemoveKeyword = (index) => {
    setFormData((prev) => ({
      ...prev,
      keywords: prev.keywords.filter((_, i) => i !== index),
    }));
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddKeyword();
    }
  };

  const handleNext = () => {
    // ✅ Zod Schema: /^[a-zA-Z\s]+$/ (Only letters & space)
    const nameRegex = /^[a-zA-Z\s]+$/;

    // ✅ Zod Schema: /^[a-zA-Z\s\-:,.'&()]+$/ (Letters, space, basic punctuation. NO NUMBERS)
    const titleRegex = /^[a-zA-Z\s\-:,.'&()]+$/;

    if (currentStep === 1) {
      // 1. Primary Author Check
      if (!formData.fullName || !formData.email) {
        toast.error("Please fill in all mandatory author details.");
        return;
      }

      // Check Primary Author Name Regex
      if (!nameRegex.test(formData.fullName)) {
        toast.error(
          "Author name must contain only letters and spaces (No numbers or special characters)."
        );
        return;
      }

      // Check if email contains @
      if (!formData.email.includes("@")) {
        toast.error("Please enter a valid email address (must contain '@').", {
          position: "top-center"
        });
        return;
      }

      // 2. Second Author Partial Check (Refinement Logic)
      if (
        (formData.secondAuthorName && !formData.secondAuthorEmail) ||
        (!formData.secondAuthorName && formData.secondAuthorEmail)
      ) {
        toast.error(
          "Both Name and Email are required for the Second Author (or leave both empty)."
        );
        return;
      }

      // Check Second Author Name Regex (if exists)
      if (
        formData.secondAuthorName &&
        !nameRegex.test(formData.secondAuthorName)
      ) {
        toast.error("Second Author name must contain only letters and spaces.");
        return;
      }

      // Check Second Author Email if exists
      if (
        formData.secondAuthorEmail &&
        !formData.secondAuthorEmail.includes("@")
      ) {
        toast.error("Second Author email must be a valid email address.");
        return;
      }
    }

    if (currentStep === 2) {
      // 1. Title Length Validation (Min 50, Max 100)
      if (!formData.articleTitle || formData.articleTitle.length < 50) {
        toast.error(
          `Title is too short! Current: ${formData.articleTitle.length}. Minimum required: 50 characters.`
        );
        return;
      }
      if (formData.articleTitle.length > 100) {
        toast.error("Title must not exceed 100 characters.");
        return;
      }

      // 2. Title Regex Validation (Strict Zod Match)
      if (!titleRegex.test(formData.articleTitle)) {
        toast.error(
          "Title can only contain letters and basic punctuation (- : , . ' & ( )). Numbers are not allowed."
        );
        return;
      }

      // 3. Abstract Validation (Min 50, Max 500)
      if (
        !formData.detailedDescription ||
        formData.detailedDescription.length < 50
      ) {
        toast.error(
          `Abstract is too short! Current: ${formData.detailedDescription.length} chars. Minimum required: 50.`
        );
        return;
      }
      // Max 500 is handled by HTML maxLength, but good to check logic
      if (formData.detailedDescription.length > 500) {
        toast.error("Abstract must not exceed 500 characters.");
        return;
      }
    }

    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic Validations
    if (!formData.file || !formData.contentFormat) {
      toast.error("Please select a content format and upload a PDF file.");
      return;
    }

    if (!formData.declarationAccepted) {
      toast.error("Please agree to the declaration to submit.");
      return;
    }

    // const isConfirmed = window.confirm("Are you sure you want to submit this article?");
    // if (!isConfirmed) return;

    setIsLoading(true);
    setStatus({ type: "", message: "" });

    try {
      const data = new FormData();

      // Fields Mapping
      const finalAuthorName =
        formData.authorDeclaration === "other" &&
          formData.submissionOnBehalfName
          ? formData.submissionOnBehalfName
          : formData.fullName;

      data.append("authorName", finalAuthorName);
      data.append("authorEmail", formData.email);
      data.append("authorPhone", formData.phone || ""); // Optional handle

      if (formData.secondAuthorName)
        data.append("secondAuthorName", formData.secondAuthorName);
      if (formData.secondAuthorEmail)
        data.append("secondAuthorEmail", formData.secondAuthorEmail);

      data.append("title", formData.articleTitle);
      data.append("category", formData.contentFormat);
      data.append("abstract", formData.detailedDescription);

      // Keywords handle
      if (formData.keywords && formData.keywords.length > 0) {
        data.append("keywords", formData.keywords.join(", "));
      }

      data.append("pdf", formData.file);
      if (formData.authorImage) {
        data.append("thumbnail", formData.authorImage);
      }
      data.append("recaptchaToken", captchaToken);

      const token = localStorage.getItem("authToken");
      const NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL;
      const response = await fetch(`${NEXT_PUBLIC_API_URL}/articles/submit-with-images`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: data,
      });

      const result = await response.json();

      // --- 👇 ERROR HANDLING (Backend Error Ignore & Show Custom Msg) ---
      if (!response.ok) {
        console.error("Backend Validation Error:", result);
        // Use backend error if available, otherwise fallback to generic
        throw new Error(
          result.error ||
          result.message ||
          "Submission failed. Please ensure all details comply with the guidelines."
        );
      }
      // ----------------------------------------------------------------

      // Success Logic
      if (result.requiresVerification) {
        toast.info("Verification code sent to your email.");
        setShowVerification(true);
        setPendingArticleId(result.articleId);
      } else {
        setShowSuccessModal(true);
        setFormData(initialFormState);
        setCurrentStep(1);
        if (fileInputRef.current) fileInputRef.current.value = "";
        const imgInput = document.getElementById("authorImage");
        if (imgInput) imgInput.value = "";
      }
    } catch (error) {
      console.error("Error:", error);
      // Toast me backend ka error message nahi jayega, apna custom jayega
      toast.error(error.message || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      toast.error("Please enter valid 6-digit code");
      return;
    }

    // 👇 1. Loading start karo
    setIsLoading(true);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL;

      const res = await fetch(`${API_URL}/articles/verify-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          code: otp,
          articleId: pendingArticleId,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || "Verification failed");
      }

      // ✅ Change: Toast hata diya aur Modal True kar diya
      setShowSuccessModal(true);

      setShowVerification(false);
      setOtp("");
      setPendingArticleId(null);
      setFormData(initialFormState);
      setCurrentStep(1);
    } catch (err) {
      toast.error(err.message);
    } finally {
      // 👇 2. Loading khatam karo (chahe success ho ya error)
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-6 lg:py-8">
      {/* ToastContainer removed to avoid duplicates (handled in layout) */}

      {/* 👇 SUCCESS POPUP MODAL START 👇 */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-10 max-w-md w-full text-center transform transition-all scale-100 border border-gray-100">
            {/* Success Icon */}
            <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100 mb-6">
              <svg
                className="h-10 w-10 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                ></path>
              </svg>
            </div>

            {/* Title & Message */}
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              Great Job! 🎉
            </h2>
            <p className="text-gray-600 text-lg mb-8 leading-relaxed">
              Your article has been submitted successfully. Our team will review
              it shortly.
            </p>

            {/* OK Button */}
            <button
              onClick={() => {
                setShowSuccessModal(false);
                router.push("/home"); // 👈 Ye home ('/') par redirect kar dega
              }}
              className="w-full py-3.5 px-6 bg-green-600 hover:bg-green-700 text-white text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
            >
              Okay, Got it!
            </button>
          </div>
        </div>
      )}
      {/* 👆 SUCCESS POPUP MODAL END 👆 */}

      {/* 👇 TERMS & CONDITIONS MODAL 👇 */}
      {showTermsModal && (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] sm:max-h-[85vh] animate-fadeIn border border-gray-100">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
              <h3 className="text-xl font-bold text-gray-900">
                Terms and Conditions
              </h3>
              <button
                onClick={() => setShowTermsModal(false)}
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
                // Check if scrolled to bottom (with small tolerance)
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
                {/* Extra spacer to ensure scrolling is needed on smaller screens */}
                <div className="h-10"></div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 sm:p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end gap-3 transition-all">
              <button
                onClick={() => setShowTermsModal(false)}
                className="px-5 py-2.5 text-gray-700 font-medium hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={!termsScrolled}
                onClick={() => {
                  setFormData((prev) => ({ ...prev, declarationAccepted: true }));
                  setShowTermsModal(false);
                }}
                className={`px-6 py-2.5 rounded-lg font-bold shadow-md transition-all duration-300 flex items-center gap-2 ${termsScrolled
                  ? "bg-gradient-to-r from-red-600 to-red-700 text-white transform hover:-translate-y-0.5 hover:shadow-lg cursor-pointer"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
              >
                {termsScrolled ? (
                  <>
                    I Accept
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </>
                ) : (
                  <span className="flex items-center gap-2">
                    Accept (Scroll to Read)
                    <svg className="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
          Article Submission
        </h1>

        <div className="mb-4 sm:mb-6 lg:mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs sm:text-sm font-medium text-gray-700">
              Step {currentStep} of {totalSteps}: {steps[currentStep - 1].title}
            </span>
          </div>
          <div className="flex gap-1 sm:gap-2">
            {steps.map((step, index) => (
              <div
                key={step.number}
                className={`h-1.5 sm:h-2 flex-1 rounded ${step.number <= currentStep ? "bg-red-600" : "bg-gray-200"
                  }`}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          <div className="lg:col-span-1 order-1 lg:order-2">
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-5 lg:p-6 lg:sticky lg:top-8">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6 hidden lg:block">
                Submission Progress
              </h3>
              <div className="lg:hidden">
                <div className="flex items-center justify-center mb-4">
                  {steps.map((step, index) => (
                    <div key={step.number} className="flex items-center">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${step.number < currentStep
                            ? "bg-red-600 text-white"
                            : step.number === currentStep
                              ? "bg-red-600 text-white ring-2 ring-red-100"
                              : "bg-gray-200 text-gray-500"
                            }`}
                        >
                          {step.number < currentStep ? (
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          ) : (
                            step.number
                          )}
                        </div>
                        <p
                          className={`text-xs font-medium mt-1 text-center ${step.number === currentStep
                            ? "text-red-600"
                            : "text-gray-500"
                            }`}
                        >
                          {step.number}
                        </p>
                      </div>
                      {index < steps.length - 1 && (
                        <div className="flex items-center mx-2 sm:mx-3">
                          <div
                            className={`h-0.5 w-12 sm:w-16 ${step.number < currentStep
                              ? "bg-red-600"
                              : "bg-gray-200"
                              }`}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 text-center">
                  Auto-saving in progress...
                </p>
              </div>
              <div className="hidden lg:block">
                <div className="space-y-4">
                  {steps.map((step, index) => (
                    <div key={step.number} className="flex items-start">
                      <div className="flex flex-col items-center mr-4">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-base ${step.number < currentStep
                            ? "bg-red-600 text-white"
                            : step.number === currentStep
                              ? "bg-red-600 text-white ring-4 ring-red-100"
                              : "bg-gray-200 text-gray-500"
                            }`}
                        >
                          {step.number < currentStep ? (
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
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          ) : (
                            step.number
                          )}
                        </div>
                        {index < steps.length - 1 && (
                          <div
                            className={`w-0.5 h-12 mt-2 ${step.number < currentStep
                              ? "bg-red-600"
                              : "bg-gray-200"
                              }`}
                          />
                        )}
                      </div>
                      <div className="flex-1 pt-2">
                        <p
                          className={`text-base font-medium ${step.number === currentStep
                            ? "text-red-600"
                            : step.number < currentStep
                              ? "text-gray-900"
                              : "text-gray-500"
                            }`}
                        >
                          {step.number} {step.title}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="text-sm text-gray-500">
                    Auto-saving in progress...
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 order-2 lg:order-1">
            {showVerification && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-md">
                  <h2 className="text-lg font-bold mb-2">Email Verification</h2>
                  <p className="text-sm text-gray-600 mb-4">
                    We’ve sent a 6-digit verification code to your email.
                  </p>

                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    maxLength={6}
                    placeholder="Enter 6-digit code"
                    className="w-full border px-4 py-2 rounded-md mb-4 text-center tracking-widest"
                  />

                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={isLoading} // 👈 Disable button while loading
                    className={`w-full py-2 rounded-md font-semibold transition-colors ${isLoading
                      ? "bg-red-400 cursor-not-allowed text-white"
                      : "bg-red-600 hover:bg-red-700 text-white"
                      }`}
                  >
                    {/* 👇 Text change hoga loading ke time */}
                    {isLoading ? "Verifying..." : "Verify Code"}
                  </button>
                </div>
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="bg-white rounded-lg shadow-sm p-4 sm:p-6 lg:p-8"
            >
              {currentStep === 1 && (
                <div className="space-y-4 sm:space-y-6">
                  <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">
                    Author Details
                  </h2>
                  <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
                    Please provide your contact information. This will be used
                    for correspondence regarding your submission.
                  </p>

                  {/* --- NEW THUMBNAIL UPLOAD DESIGN (REPLACE OLD CIRCLE CODE) --- */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Author Thumbnail
                    </label>

                    <div className="flex items-start gap-5">
                      {/* Thumbnail Preview Box */}
                      <div className="w-32 h-32 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
                        {formData.authorImage ? (
                          <img
                            src={URL.createObjectURL(formData.authorImage)}
                            alt="Thumbnail Preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-center">
                            <span className="text-2xl text-gray-400">📷</span>
                            <span className="text-xs text-gray-400 block mt-1">
                              No image
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Upload Button & Info */}
                      <div className="flex-1">
                        <p className="text-sm text-gray-600 mb-3">
                          Upload a clear photo. This will be displayed on the
                          article page.
                        </p>

                        <div className="flex gap-3">
                          <label
                            htmlFor="authorImage"
                            className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                          >
                            Select Image
                          </label>

                          {formData.authorImage && (
                            <button
                              type="button"
                              onClick={() =>
                                setFormData((prev) => ({
                                  ...prev,
                                  authorImage: null,
                                }))
                              }
                              className="text-sm text-red-600 hover:text-red-800 font-medium"
                            >
                              Remove
                            </button>
                          )}
                        </div>

                        <input
                          id="authorImage"
                          name="authorImage"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleInputChange}
                        />
                        <p className="mt-2 text-xs text-gray-500">
                          Supported: JPG, PNG. Max 5MB.
                        </p>
                      </div>
                    </div>
                  </div>
                  {/* --- END NEW DESIGN --- */}

                  <div>
                    <label
                      htmlFor="fullName"
                      className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2"
                    >
                      Author Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="fullName"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      placeholder="Enter your full name"
                      className="w-full text-sm sm:text-base px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* --- SECOND AUTHOR SECTION (NEW) --- */}
                  <div className="pt-4 border-t border-gray-200 mt-4">
                    {/* <h3 className="text-sm font-semibold text-gray-900 mb-3">Second Author (Optional)</h3> */}
                  </div>
                  {/* ----------------------------------- */}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <label
                        htmlFor="email"
                        className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2"
                      >
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="Enter your email address"
                        className="w-full text-sm sm:text-base px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="phone"
                        className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2"
                      >
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="Enter your phone number"
                        className="w-full text-sm sm:text-base px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <label
                        htmlFor="secondAuthorName"
                        className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2"
                      >
                        Second Author Name
                      </label>
                      <input
                        type="text"
                        id="secondAuthorName"
                        name="secondAuthorName"
                        value={formData.secondAuthorName}
                        onChange={handleInputChange}
                        placeholder="Name of co-author"
                        className="w-full text-sm sm:text-base px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="secondAuthorEmail"
                        className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2"
                      >
                        Second Author Email
                      </label>
                      <input
                        type="email"
                        id="secondAuthorEmail"
                        name="secondAuthorEmail"
                        value={formData.secondAuthorEmail}
                        onChange={handleInputChange}
                        placeholder="Email of co-author"
                        className="w-full text-sm sm:text-base px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-4 sm:space-y-6">
                  <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">
                    Article Information
                  </h2>

                  {/* --- TITLE: Max 100 Chars, Min 50 --- */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-xs sm:text-sm font-medium text-gray-700">
                        Article Title
                      </label>
                      <span
                        className={`text-xs ${formData.articleTitle.length < 50
                          ? "text-red-500"
                          : "text-green-600"
                          }`}
                      >
                        {formData.articleTitle.length}/100 chars (Min 50)
                      </span>
                    </div>
                    <input
                      type="text"
                      name="articleTitle"
                      value={formData.articleTitle}
                      onChange={handleInputChange}
                      maxLength={100} // Backend Max Limit
                      placeholder="Enter a clear and concise title (Min 50 characters)"
                      className="w-full text-sm sm:text-base px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600"
                      required
                    />
                  </div>

                  {/* --- DESCRIPTION: Max 500 Chars, Min 50 --- */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                      <label
                        htmlFor="detailedDescription"
                        className="block text-xs sm:text-sm font-medium text-gray-700"
                      >
                        Detailed Description
                      </label>
                      <span
                        className={`text-xs sm:text-sm ${formData.detailedDescription.length < 50
                          ? "text-red-500"
                          : "text-gray-500"
                          }`}
                      >
                        {formData.detailedDescription.length}/500 characters
                        (Min 50)
                      </span>
                    </div>
                    <textarea
                      id="detailedDescription"
                      name="detailedDescription"
                      value={formData.detailedDescription}
                      onChange={handleInputChange}
                      placeholder="Provide a summary of your article (Max 500 characters)..."
                      rows={6}
                      maxLength={500} // ✅ LIMIT: User 500 se zyada type nahi kar payega
                      className="w-full text-sm sm:text-base px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent resize-y"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Keywords
                    </label>
                    <div className="flex gap-2 mb-2 sm:mb-3">
                      <input
                        type="text"
                        value={keywordInput}
                        onChange={(e) => setKeywordInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={formData.keywords.length >= 5}
                        className="flex-1 text-sm sm:text-base px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-md"
                      />
                      <button
                        type="button"
                        onClick={handleAddKeyword}
                        disabled={
                          !keywordInput.trim() || formData.keywords.length >= 5
                        }
                        className="px-4 bg-red-600 text-white rounded-md"
                      >
                        Add
                      </button>
                    </div>
                    {formData.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.keywords.map((k, i) => (
                          <span
                            key={i}
                            className="bg-red-600 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1"
                          >
                            {k}
                            <button
                              type="button"
                              onClick={() => handleRemoveKeyword(i)}
                            >
                              x
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-5 sm:space-y-6 lg:space-y-8">
                  <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                    Submit Your Article
                  </h2>

                  <div>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 sm:p-8 lg:p-12 text-center">
                      <p className="text-sm sm:text-base text-gray-900 mb-2 font-medium">
                        Drag & drop your file here
                      </p>
                      <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6">
                        Supports Only: PDF
                      </p>
                      <label htmlFor="file-upload">
                        <span className="inline-block px-4 sm:px-6 py-2 text-sm sm:text-base bg-gray-200 text-gray-700 rounded-md cursor-pointer hover:bg-gray-300 transition-colors font-medium">
                          Choose File
                        </span>
                      </label>
                      <input
                        type="file"
                        id="file-upload"
                        name="file"
                        ref={fileInputRef}
                        accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
                        onChange={handleInputChange}
                        className="hidden"
                      />
                    </div>
                    {formData.file && (
                      <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                            <svg
                              className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 flex-shrink-0"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                            <span className="text-xs sm:text-sm text-gray-900 font-medium truncate">
                              {formData.file.name}
                            </span>
                          </div>
                          <span className="text-xs sm:text-sm text-gray-600 ml-2">
                            100%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
                          <div
                            className="bg-red-600 h-1.5 sm:h-2 rounded-full"
                            style={{ width: "100%" }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
                      Are you the original author?
                    </h3>
                    <div className="space-y-2 sm:space-y-3">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="authorDeclaration"
                          value="author"
                          checked={formData.authorDeclaration === "author"}
                          onChange={handleInputChange}
                          className="w-4 h-4 text-red-600 focus:ring-red-600"
                        />
                        <span className="ml-2 sm:ml-3 text-sm sm:text-base text-gray-700">
                          Yes, I am the original author.
                        </span>
                      </label>

                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="authorDeclaration"
                          value="other"
                          checked={formData.authorDeclaration === "other"}
                          onChange={handleInputChange}
                          className="w-4 h-4 text-red-600 focus:ring-red-600"
                        />
                        <span className="ml-2 sm:ml-3 text-sm sm:text-base text-gray-700">
                          No, this is a submission on behalf of someone else.
                        </span>
                      </label>

                      {/* --- YAHAN NAYA FIELD ADD KIYA HAI --- */}
                      {formData.authorDeclaration === "other" && (
                        <div className="ml-6 sm:ml-7 mt-2 p-3 bg-gray-50 rounded-md border border-gray-200">
                          <label
                            htmlFor="submissionOnBehalfName"
                            className="block text-xs sm:text-sm font-medium text-gray-700 mb-1"
                          >
                            Original Author's Name*
                          </label>
                          <input
                            type="text"
                            id="submissionOnBehalfName"
                            name="submissionOnBehalfName"
                            value={formData.submissionOnBehalfName}
                            onChange={handleInputChange}
                            placeholder="Enter the name of the original author"
                            className="w-full text-sm sm:text-base px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600"
                            required={formData.authorDeclaration === "other"}
                          />
                        </div>
                      )}
                      {/* ------------------------------------- */}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
                      Submission type
                    </h3>
                    <select
                      id="contentFormat"
                      name="contentFormat"
                      value={formData.contentFormat}
                      onChange={handleInputChange}
                      className="w-full text-sm sm:text-base text-gray-900 px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent bg-white"
                      required
                    >
                      <option value="">Select a format</option>
                      <option value="research-paper">Research Paper</option>
                      {/* <option value="book-chapter">Book Chapter</option> */}
                      <option value="review-article">Review Article</option>
                      <option value="case-study">Case Study</option>
                      {/* <option value="opinion-piece">Opinion Piece</option> */}
                      <option value="other">Other</option>
                    </select>
                  </div>

                  {/* --- YAHAN PASTE KARO (Ye naya code hai) --- */}
                  <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.declarationAccepted}
                        onChange={(e) => {
                          if (e.target.checked) {
                            // If user tries to check it, open modal instead
                            setShowTermsModal(true);
                            // Don't check it yet
                          } else {
                            // If unchecking, just uncheck
                            handleInputChange(e);
                          }
                        }}
                        name="declarationAccepted"
                        className="mt-1 w-5 h-5 text-red-600 rounded border-gray-300 focus:ring-red-600 flex-shrink-0"
                      />
                      <span className="text-xs sm:text-sm text-gray-700 text-justify leading-relaxed">
                        I/We declare that the manuscript is an original and
                        previously unpublished work written by me/us. I/We shall
                        be solely responsible for any dispute arising out of
                        my/our manuscript, including issues related to
                        copyright, defamation, objectionable content, or
                        contempt, and agree to bear any loss or liability caused
                        by violation of copyright or any other rights. Upon
                        submission and acceptance for publication, the
                        manuscript shall become the property of{" "}
                        <strong>Law Nation Prime Times Journal</strong>.
                      </span>
                    </label>
                  </div>
                  {/* ------------------------------------------- */}
                </div>
              )}

              {currentStep === totalSteps ? (
                <div className="mt-5 sm:mt-6 lg:mt-8 pt-4 sm:pt-5 lg:pt-6 border-t border-gray-200 space-y-3 sm:space-y-4">
                  <button
                    type="button"
                    onClick={handlePrevious}
                    disabled={isLoading}
                    className="w-full sm:w-auto px-4 sm:px-6 py-2 text-sm sm:text-base bg-white text-gray-700 border border-gray-300 rounded-md font-medium hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <div className="mt-4 flex justify-center sm:justify-start">
                    <ReCAPTCHA
                      sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}
                      onChange={handleCaptchaChange}
                    />
                  </div>
                  ``
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-red-600 text-white rounded-md font-bold text-base sm:text-lg hover:bg-red-700 transition-colors disabled:bg-red-400"
                  >
                    {isLoading ? "Submitting..." : "Submit Article"}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-0 mt-5 sm:mt-6 lg:mt-8 pt-4 sm:pt-5 lg:pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handlePrevious}
                    disabled={currentStep === 1}
                    className={`w-full sm:w-auto px-4 sm:px-6 py-2 text-sm sm:text-base rounded-md font-medium ${currentStep === 1
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                      }`}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="w-full sm:w-auto px-4 sm:px-6 py-2 text-sm sm:text-base bg-red-600 text-white rounded-md font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                  >
                    Next
                    <svg
                      className="w-3 h-3 sm:w-4 sm:h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
