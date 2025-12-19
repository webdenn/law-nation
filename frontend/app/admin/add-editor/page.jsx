"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AddEditorPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ name: '', email: '', role: 'EDITOR' });

  return (
    <div className="flex min-h-screen bg-gray-50 flex-col md:flex-row">
      {/* STICKY SIDEBAR (Same as Dashboard) */}
      <aside className="hidden md:flex w-72 bg-red-700 text-white flex-col h-screen sticky top-0 shadow-2xl">
        <div className="p-8 border-b border-red-800"><h1 className="text-2xl font-black italic tracking-tighter text-white">LAW NATION</h1></div>
        <nav className="flex-1 px-4 mt-6"><button onClick={() => router.push('/admin')} className="w-full text-left p-3 font-bold bg-red-800 rounded-lg shadow-inner">← Dashboard</button></nav>
      </aside>

      <main className="flex-1 p-6 md:p-20">
        <div className="max-w-full mx-auto bg-gray-200 rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
          <div className="bg-red-600 p-8 text-center text-white">
            <h2 className="text-2xl font-black uppercase tracking-widest">Add New Editor</h2>
            <p className="text-red-100 text-xs mt-1">Provide access to the Law Nation reviewing system</p>
          </div>
          
          <form className="p-10 space-y-6" onSubmit={(e) => { e.preventDefault(); alert("Editor Added!"); router.push('/admin'); }}>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Full Name</label>
              <input type="text" required className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-red-600 outline-none text-sm font-bold" placeholder="Name" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Work Email</label>
              <input type="email" required className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-red-600 outline-none text-sm font-bold" placeholder="email" />
            </div>
            <div className="pt-6 flex gap-4">
              <button type="button" onClick={() => router.push('/admin')} className="flex-1 p-4 bg-gray-100 text-gray-500 font-black rounded-xl hover:bg-gray-200 transition-all text-xs">CANCEL</button>
              <button type="submit" className="flex-1 p-4 bg-red-600 text-white font-black rounded-xl hover:bg-black transition-all shadow-lg text-xs tracking-widest">CREATE ACCOUNT</button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}