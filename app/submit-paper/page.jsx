"use client"
import { useState } from "react"

export default function SubmitPaperPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 3

  const [formData, setFormData] = useState({
    // Step 1: Author Details
    fullName: "",
    email: "",
    phone: "",
    
    // Step 2: Article Information
    articleTitle: "",
    detailedDescription: "",
    keywords: [],
    
    // Step 3: Upload
    file: null,
    authorDeclaration: "author",
    contentFormat: ""
  })

  const [keywordInput, setKeywordInput] = useState("")

  const steps = [
    { number: 1, title: "Author Details" },
    { number: 2, title: "Article Information" },
    { number: 3, title: "Submit Your Article" }
  ]

  const handleInputChange = (e) => {
    const { name, value, files } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: files ? files[0] : value
    }))
  }

  const handleAddKeyword = () => {
    if (keywordInput.trim() && formData.keywords.length < 5) {
      setFormData(prev => ({
        ...prev,
        keywords: [...prev.keywords, keywordInput.trim()]
      }))
      setKeywordInput("")
    }
  }

  const handleRemoveKeyword = (index) => {
    setFormData(prev => ({
      ...prev,
      keywords: prev.keywords.filter((_, i) => i !== index)
    }))
  }

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddKeyword()
    }
  }

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    console.log("Form submitted:", formData)
    // Handle form submission here
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-6 lg:py-8">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Article Submission</h1>
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
                className={`h-1.5 sm:h-2 flex-1 rounded ${
                  step.number <= currentStep
                    ? "bg-red-600"
                    : "bg-gray-200"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Progress Tracker - Shows first on mobile */}
          <div className="lg:col-span-1 order-1 lg:order-2">
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-5 lg:p-6 lg:sticky lg:top-8">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6 hidden lg:block">Submission Progress</h3>
              {/* Mobile: Horizontal Layout */}
              <div className="lg:hidden">
                <div className="flex items-center justify-center mb-4">
                  {steps.map((step, index) => (
                    <div key={step.number} className="flex items-center">
                      {/* Step Circle */}
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                            step.number < currentStep
                              ? "bg-red-600 text-white"
                              : step.number === currentStep
                              ? "bg-red-600 text-white ring-2 ring-red-100"
                              : "bg-gray-200 text-gray-500"
                          }`}
                        >
                          {step.number < currentStep ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            step.number
                          )}
                        </div>
                        <p
                          className={`text-xs font-medium mt-1 text-center ${
                            step.number === currentStep
                              ? "text-red-600"
                              : step.number < currentStep
                              ? "text-gray-900"
                              : "text-gray-500"
                          }`}
                        >
                          {step.number}
                        </p>
                      </div>
                      {/* Connecting Line */}
                      {index < steps.length - 1 && (
                        <div className="flex items-center mx-2 sm:mx-3">
                          <div
                            className={`h-0.5 w-12 sm:w-16 ${
                              step.number < currentStep ? "bg-red-600" : "bg-gray-200"
                            }`}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 text-center">Auto-saving in progress...</p>
              </div>
              {/* Desktop: Vertical Layout */}
              <div className="hidden lg:block">
                <div className="space-y-4">
                  {steps.map((step, index) => (
                    <div key={step.number} className="flex items-start">
                      <div className="flex flex-col items-center mr-4">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-base ${
                            step.number < currentStep
                              ? "bg-red-600 text-white"
                              : step.number === currentStep
                              ? "bg-red-600 text-white ring-4 ring-red-100"
                              : "bg-gray-200 text-gray-500"
                          }`}
                        >
                          {step.number < currentStep ? (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            step.number
                          )}
                        </div>
                        {index < steps.length - 1 && (
                          <div
                            className={`w-0.5 h-12 mt-2 ${
                              step.number < currentStep ? "bg-red-600" : "bg-gray-200"
                            }`}
                          />
                        )}
                      </div>
                      <div className="flex-1 pt-2">
                        <p
                          className={`text-base font-medium ${
                            step.number === currentStep
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
                  <p className="text-sm text-gray-500">Auto-saving in progress...</p>
                </div>
              </div>
            </div>
          </div>

          {/* Form Content - Shows second on mobile */}
          <div className="lg:col-span-2 order-2 lg:order-1">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-4 sm:p-6 lg:p-8">
              {/* Step 1: Author Details */}
              {currentStep === 1 && (
                <div className="space-y-4 sm:space-y-6">
                  <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">Author Details</h2>
                  <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
                    Please provide your contact information. This will be used for correspondence regarding your submission.
                  </p>

                  <div>
                    <label htmlFor="fullName" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                      Full Name
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                        Email Address
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
                      <label htmlFor="phone" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
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
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Article Information */}
              {currentStep === 2 && (
                <div className="space-y-4 sm:space-y-6">
                  <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">Article Information</h2>

                  <div>
                    <label htmlFor="articleTitle" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                      Article Title
                    </label>
                    <input
                      type="text"
                      id="articleTitle"
                      name="articleTitle"
                      value={formData.articleTitle}
                      onChange={handleInputChange}
                      placeholder="Enter a clear and concise title"
                      className="w-full text-sm sm:text-base px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                      <label htmlFor="detailedDescription" className="block text-xs sm:text-sm font-medium text-gray-700">
                        Detailed Description
                      </label>
                      <span className="text-xs sm:text-sm text-gray-500">
                        {formData.detailedDescription.length}/1500 characters
                      </span>
                    </div>
                    <textarea
                      id="detailedDescription"
                      name="detailedDescription"
                      value={formData.detailedDescription}
                      onChange={handleInputChange}
                      placeholder="Provide a summary of your article..."
                      rows={6}
                      maxLength={1500}
                      className="w-full text-sm sm:text-base px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent resize-y"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="keywords" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Keywords
                    </label>
                    <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3">
                      Add up to 5 keywords relevant to your article.
                    </p>
                    <div className="flex gap-2 mb-2 sm:mb-3">
                      <input
                        type="text"
                        id="keywords"
                        value={keywordInput}
                        onChange={(e) => setKeywordInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="e.g., UI Design, Web App"
                        disabled={formData.keywords.length >= 5}
                        className="flex-1 text-sm sm:text-base px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                      <button
                        type="button"
                        onClick={handleAddKeyword}
                        disabled={!keywordInput.trim() || formData.keywords.length >= 5}
                        className="px-4 sm:px-6 py-2 sm:py-3 bg-red-600 text-white rounded-md text-sm sm:text-base font-medium hover:bg-red-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        Add
                      </button>
                    </div>
                    {formData.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        {formData.keywords.map((keyword, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-red-600 text-white rounded-full text-xs sm:text-sm font-medium"
                          >
                            {keyword}
                            <button
                              type="button"
                              onClick={() => handleRemoveKeyword(index)}
                              className="hover:text-gray-200 focus:outline-none"
                              aria-label={`Remove ${keyword}`}
                            >
                              <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 3: Submit Your Article */}
              {currentStep === 3 && (
                <div className="space-y-5 sm:space-y-6 lg:space-y-8">
                  <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Submit Your Article</h2>

                  {/* File Upload Area */}
                  <div>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 sm:p-8 lg:p-12 text-center">
                      <p className="text-sm sm:text-base text-gray-900 mb-2 font-medium">Drag & drop your file here</p>
                      <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6">Supports: DOCX, PDF, MD. Max size: 10MB.</p>
                      <label htmlFor="file-upload">
                        <span className="inline-block px-4 sm:px-6 py-2 text-sm sm:text-base bg-gray-200 text-gray-700 rounded-md cursor-pointer hover:bg-gray-300 transition-colors font-medium">
                          Choose File
                        </span>
                      </label>
                      <input
                        type="file"
                        id="file-upload"
                        name="file"
                        accept=".docx,.pdf,.md"
                        onChange={handleInputChange}
                        className="hidden"
                      />
                    </div>
                    {formData.file && (
                      <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="text-xs sm:text-sm text-gray-900 font-medium truncate">{formData.file.name}</span>
                          </div>
                          <span className="text-xs sm:text-sm text-gray-600 ml-2">100%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
                          <div className="bg-red-600 h-1.5 sm:h-2 rounded-full" style={{ width: "100%" }}></div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Author Declaration */}
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Are you the original author?</h3>
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
                        <span className="ml-2 sm:ml-3 text-sm sm:text-base text-gray-700">Yes, I am the original author.</span>
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
                        <span className="ml-2 sm:ml-3 text-sm sm:text-base text-gray-700">No, this is a submission on behalf of someone else.</span>
                      </label>
                    </div>
                  </div>

                  {/* Content Format */}
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Content Format</h3>
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
                      <option value="book-chapter">Book Chapter</option>
                      <option value="review-article">Review Article</option>
                      <option value="case-study">Case Study</option>
                      <option value="opinion-piece">Opinion Piece</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              {currentStep === totalSteps ? (
                <div className="mt-5 sm:mt-6 lg:mt-8 pt-4 sm:pt-5 lg:pt-6 border-t border-gray-200 space-y-3 sm:space-y-4">
                  <button
                    type="button"
                    onClick={handlePrevious}
                    className="w-full sm:w-auto px-4 sm:px-6 py-2 text-sm sm:text-base bg-white text-gray-700 border border-gray-300 rounded-md font-medium hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <button
                    type="submit"
                    className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-red-600 text-white rounded-md font-bold text-base sm:text-lg hover:bg-red-700 transition-colors"
                  >
                    Submit Article
                  </button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-0 mt-5 sm:mt-6 lg:mt-8 pt-4 sm:pt-5 lg:pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handlePrevious}
                    disabled={currentStep === 1}
                    className={`w-full sm:w-auto px-4 sm:px-6 py-2 text-sm sm:text-base rounded-md font-medium ${
                      currentStep === 1
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
                    <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

