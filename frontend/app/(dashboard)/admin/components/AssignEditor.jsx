import React from "react";

export default function AssignEditor({ article, editors, assignArticle }) {
    return (
        <div className="flex flex-col items-center">
            {/* If Assigned, show badge */}
            {article.assignedTo && (
                <span className="text-[9px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full mb-1 border border-green-200 uppercase tracking-wide">
                    ✅ Already Assigned
                </span>
            )}

            <select
                className={`p-2 border rounded text-xs font-bold outline-none cursor-pointer w-32 transition-all ${article.assignedTo
                    ? "bg-green-50 border-green-300 text-green-800" // Assigned style
                    : "bg-white border-gray-200"
                    }`}
                value={article.assignedTo || ""}
                onChange={(e) => assignArticle(article.id, e.target.value)}
            >
                <option value="">Assign Stage 1 Reviewer</option>
                {editors.map((e) => (
                    <option key={e._id || e.id} value={e._id || e.id}>
                        {e.name || e.email}
                    </option>
                ))}
            </select>
        </div>
    );
}
