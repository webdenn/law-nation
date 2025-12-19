"use client";
import React, { useState } from 'react';

// Editor specific Stat Card
const EditorStatCard = ({ title, count, color }) => (
  <div className={`bg-white p-6 rounded-xl border-l-4 ${color} shadow-md`}>
    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{title}</p>
    <h3 className="text-2xl md:text-3xl font-extrabold mt-2 text-gray-800">{count}</h3>
  </div>
);

export default function EditorDashboard() {
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks', 'profile', 'edit-profile'
  const [profile, setProfile] = useState({
    name: "Editor Name",
    email: "editor@lawnation.com",
    role: "Content Reviewer",
    phone: "+91 98765 43210",
    department: "Constitutional Law"
  });

  // Handle profile update
  const handleProfileUpdate = (e) => {
    e.preventDefault();
    // Here you would typically send data to backend
    alert("Profile updated successfully!");
    setActiveTab('profile');
  };

  return (
    <div className="flex min-h-screen bg-gray-50 flex-col md:flex-row">
      
      {/* SIDEBAR */}
      <aside className="hidden md:flex w-72 bg-red-700 text-white flex-col shadow-2xl">
        <div className="p-8 border-b border-red-800">
          <h1 className="text-2xl font-black italic tracking-tighter">LAW NATION</h1>
          <span className="text-[10px] bg-white text-red-700 px-2 py-0.5 rounded-full font-bold uppercase">
            Editor Panel
          </span>
        </div>
        
        <nav className="flex-1 px-4 mt-6 space-y-2">
          <button 
            onClick={() => setActiveTab('tasks')}
            className={`w-full text-left p-3 rounded-lg font-semibold transition-all ${activeTab === 'tasks' ? 'bg-red-800 shadow-inner' : 'hover:bg-red-600'}`}
          >
            Assigned Tasks
          </button>
          <button 
            onClick={() => setActiveTab('profile')}
            className={`w-full text-left p-3 rounded-lg font-semibold transition-all ${activeTab === 'profile' ? 'bg-red-800 shadow-inner' : 'hover:bg-red-600'}`}
          >
            Profile Settings
          </button>
          <button className="w-full text-left p-3 hover:bg-red-600 rounded-lg transition-all">
            Review History
          </button>
        </nav>

        <div className="p-4 border-t border-red-800">
          <button className="w-full p-2 text-sm bg-red-900 hover:bg-black rounded transition-colors font-medium">
            Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto">
        <header className="bg-white h-20 border-b flex items-center justify-between px-6 md:px-10 shadow-sm sticky top-0 z-10">
          <h2 className="text-lg md:text-xl font-bold text-gray-700">
            {activeTab === 'tasks' ? 'Editor Workspace' : 
             activeTab === 'profile' ? 'Profile Settings' : 
             'Edit Profile'}
          </h2>
          <button 
            onClick={() => setActiveTab('profile')}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer"
          >
            <div className="text-right">
              <p className="text-sm font-bold text-gray-800">{profile.name}</p>
              <p className="text-[10px] text-red-600 font-bold uppercase">{profile.role}</p>
            </div>
            <div className="w-10 h-10 bg-red-100 border-2 border-red-600 rounded-full flex items-center justify-center text-red-700 font-black">
              ED
            </div>
          </button>
        </header>

        {/* CONTENT AREA */}
        <div className="p-6 md:p-10">
          {activeTab === 'tasks' ? (
            <>
              {/* STATS CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                <EditorStatCard title="Pending Review" count="05" color="border-red-600" />
                <EditorStatCard title="Corrections Sent" count="02" color="border-yellow-500" />
                <EditorStatCard title="Approved by Me" count="14" color="border-green-600" />
              </div>

              {/* ARTICLES TABLE */}
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="bg-red-50 p-5 border-b border-red-100">
                  <h3 className="font-bold text-red-800 text-lg">Articles Assigned to You</h3>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="text-xs uppercase bg-gray-50 text-gray-400">
                        <th className="p-5 font-semibold">Article</th>
                        <th className="p-5 font-semibold">Deadline</th>
                        <th className="p-5 font-semibold">Status</th>
                        <th className="p-5 font-semibold text-right">Review Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      <tr className="hover:bg-gray-50 transition-colors">
                        <td className="p-5">
                          <p className="font-medium text-gray-700">Constitutional Rights Study</p>
                          <p className="text-xs text-gray-400">Author: Amit Verma</p>
                        </td>
                        <td className="p-5 text-sm text-gray-600 font-medium">18 Dec 2024</td>
                        <td className="p-5">
                          <span className="px-3 py-1 bg-red-100 text-red-700 text-[10px] font-bold rounded-full uppercase">In Review</span>
                        </td>
                        <td className="p-5 text-right">
                          <button 
                            onClick={() => setSelectedArticle({ 
                              title: "Constitutional Rights Study", 
                              author: "Amit Verma",
                              status: "In Review",
                              deadline: "18 Dec 2024"
                            })}
                            className="px-5 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 shadow-md transition-all"
                          >
                            Open Review Panel
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : activeTab === 'profile' ? (
            /* PROFILE SETTINGS PAGE */
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden mb-6">
                <div className="bg-red-50 p-5 border-b border-red-100">
                  <h3 className="font-bold text-red-800 text-lg">My Profile</h3>
                </div>
                
                <div className="p-8">
                  <div className="flex flex-col md:flex-row gap-8">
                    {/* PROFILE IMAGE SECTION */}
                    <div className="md:w-1/3 flex flex-col items-center">
                      <div className="w-40 h-40 bg-red-100 border-4 border-red-600 rounded-full flex items-center justify-center text-red-700 font-black text-4xl mb-4">
                        ED
                      </div>
                      <button 
                        onClick={() => setActiveTab('edit-profile')}
                        className="w-full py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors shadow-md"
                      >
                        Edit Profile
                      </button>
                    </div>

                    {/* PROFILE DETAILS */}
                    <div className="md:w-2/3">
                      <div className="space-y-6">
                        <div className="border-b pb-4">
                          <p className="text-xs font-bold text-gray-500 uppercase">Full Name</p>
                          <p className="text-xl font-bold text-gray-800 mt-1">{profile.name}</p>
                        </div>

                        <div className="border-b pb-4">
                          <p className="text-xs font-bold text-gray-500 uppercase">Email Address</p>
                          <p className="text-lg text-gray-700 mt-1">{profile.email}</p>
                        </div>

                        <div className="border-b pb-4">
                          <p className="text-xs font-bold text-gray-500 uppercase">Role</p>
                          <p className="text-lg text-gray-700 mt-1">{profile.role}</p>
                        </div>

                        <div className="border-b pb-4">
                          <p className="text-xs font-bold text-gray-500 uppercase">Phone Number</p>
                          <p className="text-lg text-gray-700 mt-1">{profile.phone}</p>
                        </div>

                        <div className="border-b pb-4">
                          <p className="text-xs font-bold text-gray-500 uppercase">Department</p>
                          <p className="text-lg text-gray-700 mt-1">{profile.department}</p>
                        </div>

                        <div>
                          <p className="text-xs font-bold text-gray-500 uppercase">Member Since</p>
                          <p className="text-lg text-gray-700 mt-1">January 2023</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* STATS IN PROFILE VIEW */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow border border-gray-100">
                  <p className="text-xs font-bold text-gray-500 uppercase">Total Reviews</p>
                  <h3 className="text-3xl font-black text-gray-800 mt-2">21</h3>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow border border-gray-100">
                  <p className="text-xs font-bold text-gray-500 uppercase">Average Rating</p>
                  <h3 className="text-3xl font-black text-gray-800 mt-2">4.7★</h3>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow border border-gray-100">
                  <p className="text-xs font-bold text-gray-500 uppercase">On-time Reviews</p>
                  <h3 className="text-3xl font-black text-gray-800 mt-2">92%</h3>
                </div>
              </div>
            </div>
          ) : (
            /* EDIT PROFILE PAGE */
            <div className="max-w-3xl mx-auto">
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="bg-red-50 p-5 border-b border-red-100">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-red-800 text-lg">Edit Profile</h3>
                    <button 
                      onClick={() => setActiveTab('profile')}
                      className="text-sm text-gray-600 hover:text-red-600 font-medium"
                    >
                      ← Back to Profile
                    </button>
                  </div>
                </div>
                
                <form onSubmit={handleProfileUpdate} className="p-8">
                  <div className="space-y-6">
                    {/* PROFILE IMAGE UPLOAD */}
                    <div className="flex flex-col items-center mb-8">
                      <div className="w-32 h-32 bg-red-100 border-4 border-red-600 rounded-full flex items-center justify-center text-red-700 font-black text-2xl mb-4">
                        ED
                      </div>
                      <button 
                        type="button"
                        className="text-sm text-red-600 font-semibold hover:text-red-800"
                      >
                        Change Profile Picture
                      </button>
                    </div>

                    {/* FORM FIELDS */}
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Full Name</label>
                        <input 
                          type="text" 
                          value={profile.name}
                          onChange={(e) => setProfile({...profile, name: e.target.value})}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
                        <input 
                          type="email" 
                          value={profile.email}
                          onChange={(e) => setProfile({...profile, email: e.target.value})}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Phone Number</label>
                        <input 
                          type="tel" 
                          value={profile.phone}
                          onChange={(e) => setProfile({...profile, phone: e.target.value})}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Department</label>
                        <select 
                          value={profile.department}
                          onChange={(e) => setProfile({...profile, department: e.target.value})}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all"
                        >
                          <option value="Constitutional Law">Constitutional Law</option>
                          <option value="Criminal Law">Criminal Law</option>
                          <option value="Civil Law">Civil Law</option>
                          <option value="Corporate Law">Corporate Law</option>
                          <option value="International Law">International Law</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Bio/Description</label>
                      <textarea 
                        className="w-full p-3 border border-gray-300 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all h-32"
                        placeholder="Tell us about yourself..."
                      ></textarea>
                    </div>

                    {/* ACTION BUTTONS */}
                    <div className="flex gap-4 pt-6 border-t">
                      <button 
                        type="submit"
                        className="px-8 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors shadow-md"
                      >
                        Save Changes
                      </button>
                      <button 
                        type="button"
                        onClick={() => setActiveTab('profile')}
                        className="px-8 py-3 bg-gray-200 text-gray-800 font-bold rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* MINIMAL REVIEW MODAL - SAME AS BEFORE */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-6xl h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row border border-gray-300">
            
            {/* LEFT: DOCUMENT PREVIEW */}
            <div className="flex-1 bg-gray-50 flex flex-col border-r border-gray-300">
              <div className="p-4 bg-white border-b flex justify-between items-center">
                <span className="text-xs font-black text-red-600 uppercase tracking-widest">DOCUMENT VIEWER</span>
                <button onClick={() => setSelectedArticle(null)} className="text-gray-500 hover:text-red-600 font-bold">CLOSE ✕</button>
              </div>
              <div className="flex-1 p-6 overflow-y-auto">
                <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">{selectedArticle.title}</h1>
                  <p className="text-gray-600 mb-6">Author: {selectedArticle.author}</p>
                  <div className="text-gray-700 space-y-4">
                    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
                    <p>Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: REVIEW PANEL */}
            <div className="w-full md:w-[400px] flex flex-col bg-white">
              <div className="p-6 bg-red-600 text-white">
                <h2 className="text-lg font-bold uppercase">{selectedArticle.title}</h2>
                <p className="text-xs opacity-90 mt-1">Author: {selectedArticle.author}</p>
              </div>

              <div className="p-6 flex-1 space-y-6 overflow-y-auto">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">REVIEWER FEEDBACK</label>
                  <textarea 
                    className="w-full h-48 p-4 bg-gray-50 border border-gray-300 rounded-lg text-sm outline-none focus:border-red-500 transition-all resize-none"
                    placeholder="Describe any required corrections..."
                  ></textarea>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm font-bold text-gray-700 mb-3">SELF-CORRECTION (PRO OPTION)</p>
                  <input type="file" className="text-xs w-full" />
                </div>
              </div>

              <div className="p-6 border-t bg-gray-50 space-y-3">
                <button className="w-full py-3 bg-red-600 text-white font-bold rounded-lg text-sm uppercase hover:bg-black transition-all">
                  Approve & Publish
                </button>
                
                <div className="flex gap-2">
                  <button className="flex-1 py-3 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg text-sm hover:bg-gray-50 transition-all">
                    Correction
                  </button>
                  <button className="flex-1 py-3 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg text-sm hover:bg-gray-50 transition-all">
                    Reject
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}