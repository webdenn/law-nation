"use client";

import React from "react";
import Link from "next/link";
import { Award } from "lucide-react";

interface Member {
    id: number;
    name: string;
    role: string;
    image?: string;
    bio: string;
    specialization?: string;
}

const TeamCard = ({ member }: { member: Member }) => (
    <div className="group bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-xl hover:border-red-100 transition-all duration-300 flex flex-col items-center text-center h-full">
        <div className="relative w-32 h-32 mb-6">
            <div className="absolute inset-0 bg-red-600 rounded-full opacity-0 group-hover:opacity-10 transition-opacity duration-300 scale-110"></div>
            <div className="w-full h-full rounded-full overflow-hidden border-4 border-slate-50 shadow-inner bg-slate-200 flex items-center justify-center">
                <span className="text-3xl font-black text-slate-300">{member.name.charAt(0)}</span>
            </div>
        </div>

        <h3 className="text-xl font-bold text-slate-900 mb-1 group-hover:text-red-700 transition-colors">
            {member.name}
        </h3>
        <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-4">
            {member.role}
        </p>

        <p className="text-sm text-slate-500 leading-relaxed line-clamp-4">
            {member.bio}
        </p>
    </div>
);

export default function OurTeamPage() {
    const [teamMembers, setTeamMembers] = React.useState<Member[]>([]);
    const [loading, setLoading] = React.useState(true);
    const nextPublicApiUrl = process.env.NEXT_PUBLIC_API_URL;

    React.useEffect(() => {
        fetchTeam();
    }, []);

    const fetchTeam = async () => {
        try {
            const res = await fetch(`${nextPublicApiUrl}/settings/our-people`);
            const data = await res.json();
            if (data.success && data.settings) {
                setTeamMembers(Array.isArray(data.settings.teamMembers) ? data.settings.teamMembers : []);
            }
        } catch (error) {
            console.error("Failed to load team:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-slate-50 pt-32 pb-20">
            {/* Hero Section */}
            <section className="max-w-7xl mx-auto px-6 mb-20 text-center">
                <div className="inline-block mb-4 px-4 py-1 bg-red-50 text-red-700 text-xs font-bold uppercase rounded-full tracking-widest border border-red-100">
                    The Minds Behind Law Nation
                </div>
                <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight">
                    Meet Our <span className="text-red-700 relative">
                        Team
                        <svg className="absolute w-full h-3 -bottom-1 left-0 text-red-200 -z-10" viewBox="0 0 100 10" preserveAspectRatio="none">
                            <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" />
                        </svg>
                    </span>
                </h1>
                <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
                    A dedicated group of legal scholars, researchers, and professionals committed to advancing legal education and open-access publishing.
                </p>
            </section>

            {/* Team Members */}
            <section className="max-w-7xl mx-auto px-6 mb-24">
                {loading ? (
                    <div className="text-center py-20 text-gray-500">Loading team members...</div>
                ) : teamMembers.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {teamMembers.map((member) => (
                            <TeamCard key={member.id} member={member} />
                        ))}
                    </div>
                )}
            </section>

            {/* Call to Action: Join Us */}
        </div>
    );
}
