import React from "react";

export default function AssignReviewer({ article, reviewers, assignReviewer }) {
    return (
        <div className="flex flex-col items-center">
            {article.assignedReviewer && (
                <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full mb-1 border border-blue-200 uppercase tracking-wide">
                    Assigned to {reviewers.find(r => r.id === article.assignedReviewer || r._id === article.assignedReviewer)?.name || "User"}
                </span>
            )}
            <select
                className={`p-2 border rounded text-xs font-bold outline-none cursor-pointer w-32 transition-all ${article.assignedReviewer
                    ? "bg-blue-50 border-blue-300 text-blue-800"
                    : "bg-white border-gray-200"
                    }`}
                value={article.assignedReviewer || ""}
                onChange={(e) => assignReviewer(article.id, e.target.value)}
            >
                <option value="">Assign Stage 2 Reviewer</option>
                {reviewers.map((r) => (
                    <option key={r._id || r.id} value={r._id || r.id}>
                        {r.name || r.email}
                    </option>
                ))}
            </select>
        </div>
    );
}
