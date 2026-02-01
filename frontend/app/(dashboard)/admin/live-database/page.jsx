"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LiveDatabase() {
  const router = useRouter();
  
  // PRD Requirement: Tracking Editor Stats
  const [editors] = useState([
    { id: 1, name: "Rahul Jha", email: "rahul@law.com", assigned: 15, completed: 12, status: "Active" },
    { id: 2, name: "Priya Singh", email: "priya@law.com", assigned: 8, completed: 8, status: "Active" },
    { id: 3, name: "Karan Roy", email: "karan@law.com", assigned: 20, completed: 5, status: "Active" },
  ]);

  return (
    <div className="flex min-h-screen bg-gray-50 flex-col md:flex-row">
      {/* SIDEBAR (Wahi purana design) */}
      <aside className="hidden md:flex w-72 bg-red-700 text-white flex-col h-screen sticky top-0 shadow-2xl">
        <div className="p-8 border-b border-red-800">
          <h1 className="text-2xl font-black italic tracking-tighter">LAW NATION</h1>
          <span className="text-[10px] bg-white text-red-700 px-2 py-0.5 rounded-full font-bold uppercase mt-2 inline-block">Staff Control</span>
        </div>
        <nav className="flex-1 px-4 mt-6">
          <button onClick={() => router.push('/admin')} className="w-full text-left p-3 hover:bg-red-600 rounded-lg text-red-100 font-bold">← Back to Dashboard</button>
        </nav>
      </aside>

      <main className="flex-1 p-6 md:p-10">
        <header className="mb-10">
          <h2 className="text-3xl font-black text-gray-800 uppercase tracking-tighter italic">Live Database: Editor Management</h2>
          <p className="text-gray-500 text-sm font-bold">Monitor staff performance and system health.</p>
        </header>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 p-6 border-b font-black text-gray-700 uppercase">Registered Editors & Reviewers</div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-100 text-[10px] uppercase text-gray-400 font-bold">
                <tr>
                  <th className="p-6">Editor Details</th>
                  <th className="p-6">Assigned Articles</th>
                  <th className="p-6">Success Rate</th>
                  <th className="p-6">Status</th>
                  <th className="p-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {editors.map(ed => (
                  <tr key={ed.id} className="hover:bg-red-50/20 transition-all">
                    <td className="p-6">
                      <p className="font-bold text-gray-800">{ed.name}</p>
                      <p className="text-xs text-gray-400">{ed.email}</p>
                    </td>
                    <td className="p-6 text-sm font-black text-gray-700">{ed.assigned} Articles</td>
                    <td className="p-6 text-sm font-bold text-green-600">
                       {Math.round((ed.completed / ed.assigned) * 100)}% Completed
                    </td>
                    <td className="p-6">
                      <span className="bg-green-100 text-green-700 text-[10px] px-2 py-1 rounded-full font-black uppercase">Active</span>
                    </td>
                    <td className="p-6 text-right">
                      <button className="text-red-600 text-xs font-black hover:underline uppercase">Manage Access</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}