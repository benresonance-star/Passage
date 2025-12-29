"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useBCM } from "@/context/BCMContext";
import { Users, Mail, ArrowLeft, LogOut, CheckCircle2, Loader2, Trophy, Plus, Copy, Check } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function GroupPage() {
  const { user, signIn, signOut, loading: authLoading } = useAuth();
  const { state } = useBCM();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [group, setGroup] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [joinGroupId, setJoinGroupId] = useState("");

  useEffect(() => {
    if (user) {
      fetchProfileAndGroup();
    }
  }, [user]);

  const fetchProfileAndGroup = async () => {
    // Fetch Profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user?.id)
      .single();
    setProfile(profileData);

    // Fetch Group (User as member)
    const { data: memberData } = await supabase
      .from('group_members')
      .select('group_id, groups(*)')
      .eq('user_id', user?.id)
      .single();
    
    if (memberData) {
      setGroup(memberData.groups);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await signIn(email);
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  const handleCreateGroup = async () => {
    if (!user) return;
    setLoading(true);
    const groupName = prompt("Enter a name for your Study Group:");
    if (!groupName) {
      setLoading(false);
      return;
    }

    const { data: newGroup, error: groupError } = await supabase
      .from('groups')
      .insert({ name: groupName, admin_id: user.id })
      .select()
      .single();

    if (newGroup) {
      await supabase.from('group_members').insert({
        group_id: newGroup.id,
        user_id: user.id,
        role: 'admin'
      });
      fetchProfileAndGroup();
    }
    setLoading(false);
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !joinGroupId) return;
    setLoading(true);
    
    const { error: joinError } = await supabase
      .from('group_members')
      .insert({
        group_id: joinGroupId,
        user_id: user.id,
        role: 'member'
      });

    if (joinError) {
      alert("Invalid Group ID or you are already a member.");
    } else {
      fetchProfileAndGroup();
      setJoinGroupId("");
    }
    setLoading(false);
  };

  const copyGroupId = () => {
    if (!group) return;
    navigator.clipboard.writeText(group.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (authLoading) return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <Loader2 className="animate-spin text-orange-500" size={32} />
    </div>
  );

  return (
    <div className="space-y-8 py-6">
      <header className="flex items-center gap-4">
        <Link href="/" className="p-2 text-zinc-500 bg-zinc-900 rounded-full border border-white/5">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold">Study Group</h1>
      </header>

      {!user ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 space-y-8 shadow-2xl">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 bg-orange-500/10 rounded-2xl flex items-center justify-center border border-orange-500/20 text-orange-500">
              <Users size={32} />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold">Join the Community</h2>
              <p className="text-zinc-500 text-sm max-w-[260px]">
                Sign in to share your progress, join groups, and see the team leaderboard.
              </p>
            </div>
          </div>

          {!sent ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                  <input 
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-black border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                    placeholder="name@email.com"
                  />
                </div>
              </div>
              {error && <p className="text-red-500 text-xs ml-1">{error}</p>}
              <button 
                disabled={loading}
                className="w-full py-4 bg-orange-500 text-white font-bold rounded-2xl shadow-lg shadow-orange-500/20 active:scale-95 transition-transform disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send Magic Link"}
              </button>
            </form>
          ) : (
            <div className="flex flex-col items-center text-center space-y-6 py-4 animate-in zoom-in-95 duration-300">
              <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center text-green-500">
                <CheckCircle2 size={24} />
              </div>
              <div className="space-y-2">
                <h3 className="font-bold">Check your email</h3>
                <p className="text-zinc-500 text-sm">
                  We sent a magic link to <span className="text-white font-medium">{email}</span>. Click it to sign in.
                </p>
              </div>
              <button 
                onClick={() => setSent(false)}
                className="text-zinc-500 text-xs font-bold uppercase tracking-widest"
              >
                Back to Sign In
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* User Profile Card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-6 shadow-xl relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-orange-500/20">
                  {profile?.display_name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="font-bold text-lg">{profile?.display_name || "New Student"}</h2>
                  <p className="text-zinc-500 text-xs">{user.email}</p>
                </div>
              </div>
              <button 
                onClick={() => signOut()}
                className="p-2 text-zinc-500 bg-black/40 rounded-xl border border-white/5"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>

          {/* Group Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wider px-1">My Group</h3>
            
            {group ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-6 shadow-xl">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center text-orange-500 border border-orange-500/20">
                      <Users size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-white">{group.name}</h4>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Member</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-800 space-y-3">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Invite Friends (Group ID)</p>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-black border border-zinc-800 rounded-xl px-4 py-3 text-zinc-400 font-mono text-xs overflow-hidden text-ellipsis whitespace-nowrap">
                      {group.id}
                    </div>
                    <button 
                      onClick={copyGroupId}
                      className={`p-3 rounded-xl border transition-all ${copied ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-zinc-800 border-white/5 text-zinc-400"}`}
                    >
                      {copied ? <Check size={18} /> : <Copy size={18} />}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-zinc-900/50 border border-dashed border-zinc-800 rounded-3xl p-10 text-center space-y-6">
                  <div className="flex justify-center">
                    <Users size={32} className="text-zinc-700" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-zinc-500">No Groups Joined</p>
                    <p className="text-zinc-600 text-sm">Create a group or join one with an ID.</p>
                  </div>
                  <button 
                    onClick={handleCreateGroup}
                    disabled={loading}
                    className="w-full py-4 bg-zinc-800 text-white font-bold rounded-2xl border border-white/5 active:scale-95 transition-transform flex items-center justify-center gap-2"
                  >
                    <Plus size={18} />
                    Create New Group
                  </button>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
                  <form onSubmit={handleJoinGroup} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Join with Group ID</label>
                      <input 
                        required
                        value={joinGroupId}
                        onChange={(e) => setJoinGroupId(e.target.value)}
                        className="w-full bg-black border border-zinc-800 rounded-2xl py-4 px-6 text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                        placeholder="Paste ID here..."
                      />
                    </div>
                    <button 
                      disabled={loading || !joinGroupId}
                      className="w-full py-4 bg-orange-500 text-white font-bold rounded-2xl shadow-lg shadow-orange-500/20 active:scale-95 transition-transform disabled:opacity-50"
                    >
                      {loading ? "Joining..." : "Join Group"}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>

          <div className="pt-8">
             <p className="text-center text-zinc-600 text-[10px] uppercase tracking-widest font-bold">
               Passage v2.0 Social • Beta
             </p>
          </div>
        </div>
      )}
    </div>
  );
}
