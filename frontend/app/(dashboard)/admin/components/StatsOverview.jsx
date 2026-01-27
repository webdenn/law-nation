"use client";
import React from "react";

// Stat Card Component
const StatCard = ({ title, count, color = "border-gray-200" }) => (
    <div className={`bg-white p-6 rounded-xl border-l-4 ${color} shadow-md`}>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            {title}
        </p>
        <h3 className="text-3xl font-extrabold mt-2 text-gray-800">{count}</h3>
    </div>
);

export default function StatsOverview({ stats, statusDist, timeMetrics }) {
    return (
        <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <StatCard
                    title="Total Submissions"
                    count={stats.totalSubmissions || 0}
                    color="border-red-600"
                />
                <StatCard
                    title="Pending Review"
                    count={stats.pendingReview || 0}
                    color="border-yellow-500"
                />
                <StatCard
                    title="In Review"
                    count={stats.underReview || 0}
                    color="border-blue-500"
                />
                <StatCard
                    title="Published"
                    count={stats.published || 0}
                    color="border-green-600"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8 mb-8">
                {/* Main Chart: Status Distribution */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-lg">
                    <div className="mb-6">
                        <h3 className="text-sm font-black text-gray-800 uppercase tracking-tighter">
                            Article Status Trends
                        </h3>
                        <p className="text-xs text-gray-500">
                            Live distribution of all submissions
                        </p>
                    </div>
                    {/* Pie Chart Visuals */}
                    <div className="flex flex-col md:flex-row items-center justify-around gap-10 py-4">
                        {/* PIE CHART SVG */}
                        <div className="relative w-48 h-48 group">
                            <svg
                                viewBox="0 0 36 36"
                                className="w-full h-full transform -rotate-90 drop-shadow-xl"
                            >
                                {/* Background Circle */}
                                <circle
                                    cx="18"
                                    cy="18"
                                    r="15.9"
                                    fill="transparent"
                                    stroke="#f3f4f6"
                                    strokeWidth="3.5"
                                ></circle>
                                {/* Pending Segment (Red) */}
                                <circle
                                    cx="18"
                                    cy="18"
                                    r="15.9"
                                    fill="transparent"
                                    stroke="#dc2626"
                                    strokeWidth="3.8"
                                    strokeDasharray={`${statusDist[0]?.percentage || 0} ${100 - (statusDist[0]?.percentage || 0)
                                        }`}
                                    strokeDashoffset="0"
                                    className="transition-all duration-1000 ease-out"
                                ></circle>
                                {/* Published Segment (Green) */}
                                <circle
                                    cx="18"
                                    cy="18"
                                    r="15.9"
                                    fill="transparent"
                                    stroke="#16a34a"
                                    strokeWidth="3.8"
                                    strokeDasharray={`${statusDist[1]?.percentage || 0} ${100 - (statusDist[1]?.percentage || 0)
                                        }`}
                                    strokeDashoffset={`-${statusDist[0]?.percentage || 0}`}
                                    className="transition-all duration-1000 ease-out"
                                ></circle>
                            </svg>
                            {/* Center Text (Total Count) */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-2xl font-black text-gray-800">
                                    {(statusDist[0]?.count || 0) +
                                        (statusDist[1]?.count || 0)}
                                </span>
                                <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">
                                    Total
                                </span>
                            </div>
                        </div>
                        {/* LEGEND BOXES (Side Labels) */}
                        <div className="flex flex-col gap-4 w-full md:w-auto">
                            {statusDist.map((item, index) => (
                                <div
                                    key={index}
                                    className="flex items-center gap-4 bg-gray-50 p-3 rounded-xl border border-gray-100 shadow-sm hover:translate-x-2 transition-transform"
                                >
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: item.color }}
                                    ></div>
                                    <div className="flex-1">
                                        <p className="text-[10px] font-black text-gray-800 uppercase tracking-tighter">
                                            {item.label}
                                        </p>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-lg font-black text-gray-700">
                                                {item.count}
                                            </span>
                                            <span className="text-[10px] font-bold text-gray-400">
                                                ({item.percentage}%)
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                {/* Side Widget: Time Metrics */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-lg flex flex-col justify-between">
                    <div>
                        <h3 className="text-sm font-black text-gray-800 uppercase">
                            System Efficiency
                        </h3>
                        <p className="text-xs text-gray-500 mb-6">
                            Average processing times
                        </p>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center border-b pb-2">
                                <span className="text-xs font-bold text-gray-500">
                                    Submit → Published
                                </span>
                                <span className="text-lg font-black text-green-600">
                                    {timeMetrics?.averageDays?.submissionToPublished?.toFixed(
                                        1
                                    ) || "0"}{" "}
                                    <span className="text-[10px]">days</span>
                                </span>
                            </div>
                            <div className="flex justify-between items-center border-b pb-2">
                                <span className="text-xs font-bold text-gray-500">
                                    To Assign
                                </span>
                                <span className="text-sm font-bold text-gray-800">
                                    {timeMetrics?.averageDays?.submissionToAssigned?.toFixed(
                                        1
                                    ) || "0"}{" "}
                                    days
                                </span>
                            </div>
                            <div className="flex justify-between items-center border-b pb-2">
                                <span className="text-xs font-bold text-gray-500">
                                    To Review
                                </span>
                                <span className="text-sm font-bold text-gray-800">
                                    {timeMetrics?.averageDays?.assignedToReviewed?.toFixed(
                                        1
                                    ) || "0"}{" "}
                                    days
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
