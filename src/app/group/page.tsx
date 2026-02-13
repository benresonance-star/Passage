"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useBCM } from "@/context/BCMContext";
import { Users, Mail, ArrowLeft, LogOut, CheckCircle2, Loader2, Trophy, Plus, Copy, Check, X } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useConfirm, usePrompt, useToast } from "@/components/AppModal";

export default function GroupPage() {
  const { user, signIn, verifyOtp, signOut, loading: authLoading } = useAuth();
  const { state, syncAllMemorised, pullVault } = useBCM();
  const currentTheme = state.settings.theme || { bg: "#000000", text: "#f4f4f5" };
  const isDawn = currentTheme.id === "dawn";
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [memberProgress, setMemberProgress] = useState<Record<string, number>>({});
  const [copied, setCopied] = useState(false);
  const [joinGroupId, setJoinGroupId] = useState("");
  const [previewGroup, setPreviewGroup] = useState<{ id: string, name: string, admin_name: string } | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const { confirm, ConfirmDialog } = useConfirm();
  const { prompt, PromptDialog } = usePrompt();
  const { toast, ToastContainer } = useToast();

  useEffect(() => {
    if (user && state.selectedChapterId) {
      fetchProfileAndGroup();
    }
  }, [user, state.selectedChapterId]);

  const fetchProfileAndGroup = async () => {
    if (!supabase) return;
    const client = supabase;

    // Fetch Profile
    const { data: profileData } = await client
      .from('profiles')
      .select('*')
      .eq('id', user?.id)
      .single();
    setProfile(profileData);
    if (profileData?.display_name) setNewName(profileData.display_name);

    // Fetch Groups (User as member)
    const { data: memberData } = await client
      .from('group_members')
      .select('group_id, groups(*)')
      .eq('user_id', user?.id);
    
    if (memberData && memberData.length > 0) {
      const allGroups = memberData.map(m => m.groups);
      setGroups(allGroups);
      
      // Set active group if not set or if current active group is no longer in the list
      const currentActiveId = activeGroupId || allGroups[0].id;
      const isStillInActiveGroup = allGroups.some(g => g.id === currentActiveId);
      const finalActiveId = isStillInActiveGroup ? currentActiveId : allGroups[0].id;
      
      setActiveGroupId(finalActiveId);
      await fetchGroupMembers(finalActiveId);
    } else {
      setGroups([]);
      setActiveGroupId(null);
      setMembers([]);
    }
  };

  const fetchGroupMembers = async (groupId: string) => {
    if (!supabase || !groupId) return;
    const client = supabase;

    // Fetch all members of this group
    const { data: groupMembers } = await client
      .from('group_members')
      .select(`
        user_id,
        role,
        profiles:user_id (display_name, email, last_active)
      `)
      .eq('group_id', groupId);
    
    if (groupMembers) {
      setMembers(groupMembers);

      // Fetch progress for all members if a chapter is selected
      if (state.selectedChapterId) {
        const chapter = state.chapters[state.selectedChapterId];
        if (chapter) {
          const { data: progress } = await client
            .from('shared_progress')
            .select('user_id, is_memorised')
            .eq('group_id', groupId)
            .eq('chapter_title', chapter.title)
            .eq('is_memorised', true);
          
          if (progress) {
            const counts: Record<string, number> = {};
            progress.forEach((p: any) => {
              counts[p.user_id] = (counts[p.user_id] || 0) + 1;
            });
            setMemberProgress(counts);
          }
        }
      }
    }
  };

  useEffect(() => {
    if (activeGroupId) {
      fetchGroupMembers(activeGroupId);
    }
  }, [activeGroupId, state.selectedChapterId]);

  const handleUpdateName = async () => {
    if (!user || !newName.trim() || !supabase) return;
    const client = supabase;
    setLoading(true);
    const { error } = await client
      .from('profiles')
      .update({ display_name: newName.trim() })
      .eq('id', user.id);
    
    if (!error) {
      setProfile({ ...profile, display_name: newName.trim() });
      setIsEditingName(false);
      fetchProfileAndGroup();
    }
    setLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await signIn(email);
    if (error) {
      setError(error.message);
    } else {
      setStep("otp");
    }
    setLoading(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await verifyOtp(email, otp);
    if (error) {
      setError(error.message);
    }
    setLoading(false);
  };

  const handleCreateGroup = async () => {
    if (!user || !supabase) return;
    const client = supabase;
    const groupName = await prompt({
      title: "Create Study Group",
      placeholder: "Enter a name for your group...",
      submitLabel: "Create",
    });
    if (!groupName) return;

    setLoading(true);
    try {
      // 1. Create the group
      const { data: newGroup, error: groupError } = await client
        .from('groups')
        .insert({ name: groupName, admin_id: user.id })
        .select()
        .single();

      if (groupError) throw groupError;

      if (newGroup) {
        // 2. Add creator as admin member
        const { error: memberError } = await client
          .from('group_members')
          .insert({
            group_id: newGroup.id,
            user_id: user.id,
            role: 'admin'
          });

        if (memberError) throw memberError;

        // 3. Refresh UI
        await fetchProfileAndGroup();
        await syncAllMemorised();
        toast("Group created successfully!");
      }
    } catch (err: any) {
      console.error("Group creation error:", err);
      toast(err.message || "Failed to create group", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !joinGroupId.trim() || !supabase) return;
    const client = supabase;
    
    setLoading(true);
    try {
      // 1. Check if user is already in this specific group
      const { data: existingMember } = await client
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id)
        .eq('group_id', joinGroupId.trim())
        .maybeSingle();
      
      if (existingMember) {
        throw new Error("You are already a member of this group.");
      }

      const { error: joinError } = await client
        .from('group_members')
        .insert({
          group_id: joinGroupId.trim(),
          user_id: user.id,
          role: 'member'
        });

      if (joinError) throw joinError;

      await fetchProfileAndGroup();
      await syncAllMemorised();
      setJoinGroupId("");
      setPreviewGroup(null);
      toast("Joined group successfully!");
    } catch (err: any) {
      console.error("Join group error:", err);
      toast(err.message || "Invalid Group ID", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!user || !activeGroupId || !supabase) return;
    const client = supabase;
    const group = groups.find(g => g.id === activeGroupId);
    if (!group) return;

    const is_admin = group.admin_id === user.id;
    const isLastMember = members.length <= 1;

    const confirmed = await confirm({
      title: "Leave Group",
      message: isLastMember 
        ? "You are the last member. Leaving will permanently delete this group. Proceed?" 
        : "Are you sure you want to leave this study group?",
      confirmLabel: "Leave",
      destructive: true,
    });

    if (!confirmed) return;

    setLoading(true);
    try {
      if (isLastMember) {
        // Delete group entirely if this is the last person
        const { error } = await client
          .from('groups')
          .delete()
          .eq('id', group.id);
        if (error) throw error;
      } else {
        // If admin is leaving but others remain, promote someone else to admin
        if (is_admin) {
          const nextAdmin = members.find(m => m.user_id !== user.id);
          if (nextAdmin) {
            // 1. Update group admin_id
            const { error: groupUpdateError } = await client
              .from('groups')
              .update({ admin_id: nextAdmin.user_id })
              .eq('id', group.id);
            if (groupUpdateError) throw groupUpdateError;

            // 2. Update new admin's role in group_members
            const { error: memberUpdateError } = await client
              .from('group_members')
              .update({ role: 'admin' })
              .eq('group_id', group.id)
              .eq('user_id', nextAdmin.user_id);
            if (memberUpdateError) throw memberUpdateError;
          }
        }

        // Remove current user from group_members
        const { error } = await client
          .from('group_members')
          .delete()
          .eq('group_id', group.id)
          .eq('user_id', user.id);
        if (error) throw error;
      }

      setActiveGroupId(null);
      toast(isLastMember ? "Group deleted." : "You have left the group.");
      fetchProfileAndGroup();
    } catch (err: any) {
      console.error("Leave group error:", err);
      toast(err.message || "Failed to leave group", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchPreview = async () => {
      if (!joinGroupId || joinGroupId.length < 32 || !supabase) {
        setPreviewGroup(null);
        return;
      }

      setIsPreviewLoading(true);
      try {
        const { data, error } = await supabase
          .from('groups')
          .select(`
            id,
            name,
            profiles:admin_id (display_name)
          `)
          .eq('id', joinGroupId.trim())
          .maybeSingle();

        if (data) {
          setPreviewGroup({
            id: data.id,
            name: data.name,
            admin_name: (data.profiles as any)?.display_name || "Unknown Admin"
          });
        } else {
          setPreviewGroup(null);
        }
      } catch (e) {
        setPreviewGroup(null);
      } finally {
        setIsPreviewLoading(false);
      }
    };

    const timer = setTimeout(fetchPreview, 500);
    return () => clearTimeout(timer);
  }, [joinGroupId]);

  const copyGroupId = () => {
    if (!activeGroupId) return;
    const joinUrl = `${window.location.origin}${window.location.pathname}?join=${activeGroupId}`;
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    toast("Invite link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinId = params.get('join');
    if (joinId) {
      const alreadyIn = groups.some(g => g.id === joinId);
      if (!alreadyIn) {
        setJoinGroupId(joinId);
      }
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [groups]);

  const handleRemoveMember = async (targetUserId: string, targetName: string) => {
    if (!user || !activeGroupId || !supabase) return;
    const client = supabase;
    if (targetUserId === user.id) return; // Can't remove self from here
    
    const confirmed = await confirm({
      title: "Remove Member",
      message: `Are you sure you want to remove ${targetName || 'this student'} from the group?`,
      confirmLabel: "Remove",
      destructive: true,
    });
    if (!confirmed) return;

    setLoading(true);
    try {
      const { error } = await client
        .from('group_members')
        .delete()
        .eq('group_id', activeGroupId)
        .eq('user_id', targetUserId);

      if (error) throw error;

      await fetchGroupMembers(activeGroupId);
      toast("Member removed successfully.");
    } catch (err: any) {
      console.error("Remove member error:", err);
      toast(err.message || "Failed to remove member", "error");
    } finally {
      setLoading(false);
    }
  };

  const activeGroup = groups.find(g => g.id === activeGroupId);

  if (authLoading) return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <Loader2 className="animate-spin text-orange-500" size={32} />
    </div>
  );

  return (
    <div className="space-y-8 pt-safe pb-[calc(64px+env(safe-area-inset-bottom)+2rem)] px-4">
      <ConfirmDialog />
      <PromptDialog />
      <ToastContainer />
      <header className="flex items-center gap-4 py-4">
        <Link href="/chapter" className="p-2 text-zinc-500 bg-[var(--surface)] rounded-full border border-[var(--surface-border)]">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold">Study Group</h1>
      </header>

      {!user ? (
        <div className="bg-[var(--surface)] glass border border-[var(--surface-border)] rounded-3xl p-8 space-y-8 shadow-2xl">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 bg-orange-500/10 rounded-2xl flex items-center justify-center border border-orange-500/20 text-orange-500">
              <Users size={32} />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold">Join the Community</h2>
              <p className={`${isDawn ? "text-white/80" : "text-zinc-500"} text-sm max-w-[260px]`}>
                Sign in to share your progress, join groups, and see the team leaderboard.
              </p>
            </div>
          </div>

          {step === "email" ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <label className={`text-xs font-bold uppercase tracking-widest ${isDawn ? "text-white/60" : "text-zinc-500"} ml-1`}>Email Address</label>
                <div className="relative">
                  <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDawn ? "text-white/60" : "text-zinc-500"}`} size={18} />
                  <input 
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[var(--input-bg)] border border-[var(--surface-border)] rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                    placeholder="name@email.com"
                  />
                </div>
              </div>
              {error && <p className="text-red-500 text-xs ml-1">{error}</p>}
              <button 
                disabled={loading}
                className="w-full py-4 bg-orange-500 text-white font-bold rounded-2xl shadow-lg shadow-orange-500/20 active:scale-95 transition-transform disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send Magic Link / Code"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-6 animate-in zoom-in-95 duration-300">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center text-green-500">
                  <CheckCircle2 size={24} />
                </div>
                <div className="space-y-2">
                  <h3 className="font-bold">Enter Verification Code</h3>
                  <p className={`${isDawn ? "text-white/80" : "text-zinc-500"} text-sm`}>
                    We sent a code to <span className="text-white font-medium">{email}</span>.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className={`text-xs font-bold uppercase tracking-widest ${isDawn ? "text-white/60" : "text-zinc-500"} ml-1 text-center block`}>Verification Code</label>
                  <input 
                    type="text"
                    required
                    maxLength={8}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full bg-[var(--input-bg)] border border-[var(--surface-border)] rounded-2xl py-4 text-center text-2xl font-bold tracking-[0.3em] text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                    placeholder="00000000"
                  />
                </div>
                {error && <p className="text-red-500 text-xs text-center">{error}</p>}
                <button 
                  disabled={loading}
                  className="w-full py-4 bg-orange-500 text-white font-bold rounded-2xl shadow-lg shadow-orange-500/20 active:scale-95 transition-transform disabled:opacity-50"
                >
                  {loading ? "Verifying..." : "Verify & Sign In"}
                </button>
                <button 
                  type="button"
                  onClick={() => setStep("email")}
                  className={`w-full ${isDawn ? "text-white/60" : "text-zinc-500"} text-xs font-bold uppercase tracking-widest`}
                >
                  Back to Email
                </button>
              </div>
            </form>
          )}
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* User Profile Card */}
          <div className="bg-[var(--surface)] glass border border-[var(--surface-border)] rounded-3xl p-6 space-y-6 shadow-xl relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-orange-500/20">
                  {(profile?.display_name || user.email)?.charAt(0).toUpperCase()}
                </div>
                {isEditingName ? (
                  <div className="flex gap-2 items-center">
                    <input 
                      autoFocus
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="bg-[var(--input-bg)] border border-[var(--surface-border)] rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 w-32"
                    />
                    <button onClick={handleUpdateName} className="p-1 text-green-500">
                      <Check size={18} />
                    </button>
                    <button onClick={() => setIsEditingName(false)} className="p-1 text-zinc-500">
                      <X size={18} />
                    </button>
                  </div>
                ) : (
                  <div onClick={() => setIsEditingName(true)} className="cursor-pointer group">
                    <div className="flex items-center gap-2">
                      <h2 className="font-bold text-lg group-hover:text-orange-500 transition-colors">
                        {profile?.display_name || "Set Name..."}
                      </h2>
                      <Plus size={14} className={`${isDawn ? "text-white/40" : "text-zinc-600"} group-hover:text-orange-500`} />
                    </div>
                    <p className={`${isDawn ? "text-white/60" : "text-zinc-500"} text-xs`}>{user.email}</p>
                  </div>
                )}
              </div>
              <button 
                onClick={() => signOut()}
                className={`p-2 ${isDawn ? "text-white/60" : "text-zinc-500"} bg-[var(--surface-alt)] rounded-xl border border-[var(--surface-border)]`}
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>

          {/* Group Section */}
          <div className="space-y-4">
            <h3 className={`text-sm font-medium ${isDawn ? "text-white/60" : "text-zinc-500"} uppercase tracking-wider px-1`}>My Study Groups</h3>
            
            {groups.length > 0 ? (
              <div className="space-y-6">
                {/* Group Selector Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-2 px-1 no-scrollbar">
                  {groups.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => setActiveGroupId(g.id)}
                      className={`px-4 py-2 rounded-xl border whitespace-nowrap transition-all text-sm font-bold ${
                        activeGroupId === g.id
                          ? "bg-orange-500 border-orange-600 text-white shadow-lg shadow-orange-500/20"
                          : `bg-[var(--surface)] border-[var(--surface-border)] ${isDawn ? "text-white/60" : "text-zinc-500"}`
                      }`}
                    >
                      {g.name}
                    </button>
                  ))}
                </div>

                {activeGroup && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="bg-[var(--surface)] glass border border-[var(--surface-border)] rounded-3xl p-6 space-y-6 shadow-xl">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center text-orange-500 border border-orange-500/20">
                            <Users size={20} />
                          </div>
                          <div>
                            <h4 className="font-bold text-white">{activeGroup.name}</h4>
                            <p className={`text-[10px] ${isDawn ? "text-white/60" : "text-zinc-500"} uppercase tracking-widest font-bold`}>
                              {activeGroup.admin_id === user.id ? "Admin" : "Member"}
                            </p>
                          </div>
                        </div>
                        <button 
                          onClick={handleLeaveGroup}
                          className={`p-2 ${isDawn ? "text-white/40 hover:text-red-500" : "text-zinc-600 hover:text-red-500"} transition-colors bg-[var(--surface-alt)] rounded-lg border border-[var(--surface-border)]`}
                          title="Leave Group"
                        >
                          <LogOut size={16} />
                        </button>
                      </div>

                      <div className="pt-4 border-t border-[var(--surface-border)] space-y-3">
                        <div className="flex items-center justify-between px-1">
                          <p className={`text-[10px] font-bold ${isDawn ? "text-white/60" : "text-zinc-500"} uppercase tracking-widest`}>Invite Friends</p>
                          <div className="group relative">
                            <div className={`cursor-help text-[10px] font-bold ${isDawn ? "text-orange-500/80" : "text-orange-500"} uppercase tracking-widest flex items-center gap-1`}>
                              How to Join?
                            </div>
                            <div className="absolute bottom-full right-0 mb-2 w-48 p-3 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                              <p className="text-[10px] text-zinc-400 leading-relaxed">
                                Send the <span className="text-white">Invite Link</span> to friends. They can click it to join instantly, or paste the <span className="text-white">Group ID</span> into their Study Group tab.
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <div className={`flex-1 bg-[var(--input-bg)] border border-[var(--surface-border)] rounded-xl px-4 py-3 ${isDawn ? "text-white/60" : "text-zinc-400"} font-mono text-xs overflow-hidden text-ellipsis whitespace-nowrap flex items-center`}>
                            {activeGroup.id}
                          </div>
                          <button 
                            onClick={copyGroupId}
                            className={`p-3 rounded-xl border transition-all ${copied ? "bg-green-500/10 border-green-500/20 text-green-500" : `bg-[var(--surface-alt)] border-[var(--surface-border)] ${isDawn ? "text-white/60" : "text-zinc-400"}`}`}
                            title="Copy Invite Link"
                          >
                            {copied ? <Check size={18} /> : <Copy size={18} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Member List */}
                    <div className="bg-[var(--surface)] glass border border-[var(--surface-border)] rounded-3xl overflow-hidden shadow-xl">
                      <div className="p-4 border-b border-[var(--surface-border)] bg-[var(--surface-alt)]">
                        <p className={`text-[10px] font-bold ${isDawn ? "text-white/60" : "text-zinc-500"} uppercase tracking-widest`}>Group Members ({members.length})</p>
                      </div>
                      <div className="divide-y divide-[var(--surface-border)]">
                        {members.map((m: any) => (
                          <div key={m.user_id} className="p-4 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg bg-[var(--surface-alt)] border border-[var(--surface-border)] flex items-center justify-center text-xs font-bold ${isDawn ? "text-white/60" : "text-zinc-500"}`}>
                                {m.profiles.display_name?.charAt(0).toUpperCase() || "S"}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-white">
                                  {m.profiles.display_name || "Student"}
                                  {m.user_id === user.id && <span className="text-orange-500 ml-2 text-[10px] uppercase font-bold">(You)</span>}
                                </p>
                                <div className="flex items-center gap-2">
                                  <p className={`text-[10px] ${isDawn ? "text-white/60" : "text-zinc-500"}`}>{m.profiles.email}</p>
                                  {state.selectedChapterId && (
                                    <>
                                      <span className={`${isDawn ? "text-white/20" : "text-zinc-700"} text-[10px]`}>•</span>
                                      <p className="text-[10px] text-orange-500/80 font-bold uppercase tracking-tight">
                                        {(user && m.user_id === user.id) 
                                          ? Object.values(state.cards[state.selectedChapterId] || {}).filter(c => c.isMemorised).length 
                                          : (memberProgress[m.user_id] || 0)
                                        } / {state.chapters[state.selectedChapterId]?.chunks.length ?? 0} Chunks
                                      </p>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {m.role === 'admin' ? (
                                <span className={`text-[9px] font-bold uppercase tracking-tighter px-2 py-0.5 bg-[var(--surface-alt)] ${isDawn ? "text-white/60" : "text-zinc-400"} rounded-full border border-[var(--surface-border)]`}>
                                  Admin
                                </span>
                              ) : (
                                activeGroup.admin_id === user.id && (
                                  <button 
                                    onClick={() => handleRemoveMember(m.user_id, m.profiles.display_name)}
                                    className={`p-2 ${isDawn ? "text-white/40 hover:text-red-500" : "text-zinc-600 hover:text-red-500"} transition-colors bg-[var(--surface-alt)] rounded-lg border border-[var(--surface-border)]`}
                                  >
                                    <X size={14} />
                                  </button>
                                )
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Always show Create/Join options at the bottom of the list */}
                <div className="pt-4 border-t border-[var(--surface-border)] space-y-4">
                  <p className={`text-[10px] font-bold ${isDawn ? "text-white/60" : "text-zinc-500"} uppercase tracking-widest px-1`}>Add Another Group</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={handleCreateGroup}
                      disabled={loading}
                      className="py-4 bg-[var(--surface)] text-white font-bold rounded-2xl border border-[var(--surface-border)] active:scale-95 transition-transform flex items-center justify-center gap-2 text-xs"
                    >
                      <Plus size={16} />
                      Create
                    </button>
                    <button 
                      onClick={() => {
                        const el = document.getElementById('join-form');
                        el?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="py-4 bg-[var(--surface)] text-white font-bold rounded-2xl border border-[var(--surface-border)] active:scale-95 transition-transform flex items-center justify-center gap-2 text-xs"
                    >
                      <Users size={16} />
                      Join
                    </button>
                  </div>
                </div>

                <div id="join-form" className="bg-[var(--surface)] glass border border-[var(--surface-border)] rounded-3xl p-6 space-y-4">
                  <form onSubmit={handleJoinGroup} className="space-y-4">
                    <div className="space-y-2">
                      <label className={`text-[10px] font-bold ${isDawn ? "text-white/60" : "text-zinc-500"} uppercase tracking-widest ml-1`}>Join with Group ID</label>
                      <div className="relative">
                        <input 
                          required
                          value={joinGroupId}
                          onChange={(e) => setJoinGroupId(e.target.value)}
                          className="w-full bg-[var(--input-bg)] border border-[var(--surface-border)] rounded-2xl py-4 px-6 text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                          placeholder="Paste ID here..."
                        />
                        {isPreviewLoading && (
                          <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            <Loader2 className="animate-spin text-orange-500" size={18} />
                          </div>
                        )}
                      </div>
                    </div>

                    {previewGroup && (
                      <div className="bg-orange-500/5 border border-orange-500/10 rounded-2xl p-4 animate-in zoom-in-95 duration-200">
                        <p className="text-[10px] text-orange-500 uppercase font-bold tracking-widest mb-1">Group Found</p>
                        <p className="text-sm font-bold text-white">{previewGroup.name}</p>
                        <p className="text-[10px] text-zinc-500">Admin: {previewGroup.admin_name}</p>
                      </div>
                    )}

                    <button 
                      disabled={loading || !joinGroupId || isPreviewLoading}
                      className="w-full py-4 bg-orange-500 text-white font-bold rounded-2xl shadow-lg shadow-orange-500/20 active:scale-95 transition-transform disabled:opacity-50"
                    >
                      {loading ? "Joining..." : "Join Group"}
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-[var(--surface)] border border-dashed border-[var(--surface-border)] rounded-3xl p-10 text-center space-y-6">
                  <div className="flex justify-center">
                    <Users size={32} className={isDawn ? "text-white/20" : "text-zinc-700"} />
                  </div>
                  <div className="space-y-1">
                    <p className={`font-bold ${isDawn ? "text-white/60" : "text-zinc-500"}`}>No Groups Joined</p>
                    <p className={`${isDawn ? "text-white/40" : "text-zinc-600"} text-sm`}>Create a group or join one with an ID.</p>
                  </div>
                  <button 
                    onClick={handleCreateGroup}
                    disabled={loading}
                    className="w-full py-4 bg-[var(--surface-alt)] text-white font-bold rounded-2xl border border-[var(--surface-border)] active:scale-95 transition-transform flex items-center justify-center gap-2"
                  >
                    <Plus size={18} />
                    Create New Group
                  </button>
                </div>

                <div className="bg-[var(--surface)] glass border border-[var(--surface-border)] rounded-3xl p-6 space-y-4">
                  <form onSubmit={handleJoinGroup} className="space-y-4">
                    <div className="space-y-2">
                      <label className={`text-[10px] font-bold ${isDawn ? "text-white/60" : "text-zinc-500"} uppercase tracking-widest ml-1`}>Join with Group ID</label>
                      <div className="relative">
                        <input 
                          required
                          value={joinGroupId}
                          onChange={(e) => setJoinGroupId(e.target.value)}
                          className="w-full bg-[var(--input-bg)] border border-[var(--surface-border)] rounded-2xl py-4 px-6 text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                          placeholder="Paste ID here..."
                        />
                        {isPreviewLoading && (
                          <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            <Loader2 className="animate-spin text-orange-500" size={18} />
                          </div>
                        )}
                      </div>
                    </div>

                    {previewGroup && (
                      <div className="bg-orange-500/5 border border-orange-500/10 rounded-2xl p-4 animate-in zoom-in-95 duration-200">
                        <p className="text-[10px] text-orange-500 uppercase font-bold tracking-widest mb-1">Group Found</p>
                        <p className="text-sm font-bold text-white">{previewGroup.name}</p>
                        <p className="text-[10px] text-zinc-500">Admin: {previewGroup.admin_name}</p>
                      </div>
                    )}

                    <button 
                      disabled={loading || !joinGroupId || isPreviewLoading}
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
             <p className={`text-center ${isDawn ? "text-white/40" : "text-zinc-600"} text-[10px] uppercase tracking-widest font-bold`}>
               Passage v2.0 Social • Beta
             </p>
          </div>
        </div>
      )}
    </div>
  );
}
