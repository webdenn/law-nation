import React from "react";

const DiffViewer = ({ diffData, title }) => {
    if (!diffData || !diffData.summary)
        return (
            <div className="bg-gray-50 border rounded-lg p-4 text-center text-gray-400 italic text-xs h-40 flex items-center justify-center">
                No diff data for {title}
            </div>
        );

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full">
            {/* Header */}
            <div className="bg-gray-50 p-3 border-b flex justify-between items-center">
                <h4 className="font-bold text-gray-700 text-xs uppercase tracking-wide">{title}</h4>
                <div className="flex gap-2 text-[10px] font-bold">
                    <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded">+{diffData.summary.totalAdded}</span>
                    <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded">-{diffData.summary.totalRemoved}</span>
                    <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded">~{diffData.summary.totalModified}</span>
                </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 font-mono text-[10px] bg-white">
                {diffData.removed?.map((line, i) => (
                    <div key={`rem-${i}`} className="flex bg-red-50 text-red-700 p-1 rounded">
                        <span className="w-6 text-gray-400 border-r border-red-200 mr-2 text-right pr-1 select-none opacity-50">
                            {line.oldLineNumber}
                        </span>
                        <span className="line-through decoration-red-300 opacity-75 break-all">
                            - {line.content}
                        </span>
                    </div>
                ))}
                {diffData.added?.map((line, i) => (
                    <div key={`add-${i}`} className="flex bg-green-50 text-green-700 p-1 rounded">
                        <span className="w-6 text-gray-400 border-r border-green-200 mr-2 text-right pr-1 select-none opacity-50">
                            {line.newLineNumber}
                        </span>
                        <span className="break-all">+ {line.content}</span>
                    </div>
                ))}
                {diffData.modified?.map((line, i) => (
                    <div key={`mod-${i}`} className="flex bg-blue-50 text-blue-700 p-1 rounded">
                        <span className="w-6 text-gray-400 border-r border-blue-200 mr-2 text-right pr-1 select-none opacity-50">
                            {line.newLineNumber}
                        </span>
                        <span className="break-all">~ {line.content}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DiffViewer;
