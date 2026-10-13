import * as React from 'react';
import { useEffect, useState } from 'react';
import { CreateTeam } from './CreateTeam';
import { JoinTeam } from './JoinTeam';
import { ShieldCheck, History, ArrowRight, Loader2, AlertCircle, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';

interface TeamLandingProps {
  onEnterWorkspace: (teamId: string, teamName?: string) => void;
  session: Session | null;
  initialJoinCode?: string;
  initialJoinError?: string;
  onClearInitialJoin?: () => void;
}

export const TeamLanding: React.FC<TeamLandingProps> = ({ 
  onEnterWorkspace, 
  session,
  initialJoinCode,
  initialJoinError,
  onClearInitialJoin
}) => {
  const [recentTeams, setRecentTeams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    const fetchTeams = async () => {
      if (!session) {
        if (mounted) setRecentTeams([]);
        return;
      }
      
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('teams')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (mounted) {
          setRecentTeams(data || []);
        }
      } catch (err: any) {
        if (mounted) setError('Failed to load your workspaces');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    fetchTeams();

    return () => {
      mounted = false;
    };
  }, [session]);

  const handleDeleteSession = async (teamId: string, teamName: string) => {
    if (!session) return;
    if (!confirm(`Are you sure you want to remove access to ${teamName}?`)) return;
    
    setIsLoading(true);
    try {
      // First try to delete the team (will succeed if owner)
      const { error: deleteTeamError } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId);
        
      if (deleteTeamError) {
        // If not owner, try to just leave the team by deleting membership
        const { error: leaveError } = await supabase
          .from('team_members')
          .delete()
          .eq('team_id', teamId)
          .eq('user_id', session.user.id);
          
        if (leaveError) throw leaveError;
      }
      
      setRecentTeams(prev => prev.filter(t => t.id !== teamId));
    } catch (err: any) {
      console.error("Failed to delete session", err);
      setError('Failed to remove workspace access');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="w-full min-h-screen flex flex-col items-center justify-center p-space-md bg-surface py-12">
      <div className="flex flex-col w-full max-w-5xl mx-auto px-4 items-center">
        
        {/* Top Identity Area */}
        <div className="flex flex-col items-center text-center max-w-2xl mt-8">
          <div className="flex items-center gap-3 mb-4">
            <img src="/logo.png" alt="HackSync Logo" className="h-14 w-auto drop-shadow-sm" />
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px] font-mono-code uppercase font-semibold mt-2">v2.4 Live</span>
          </div>
          
          <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight mb-2">
            One Team. One Space. Every File Organized.
          </h1>
          
          <p className="font-body-lg text-body-lg text-secondary max-w-lg mb-6">
            Built exclusively for hackathon squads (up to 6 members). No WhatsApp zip chaos, no lost assets.
          </p>
          
          <div className="flex items-center gap-2 bg-surface-container-high/60 px-3.5 py-1.5 rounded-lg mb-10 shadow-sm">
            <ShieldCheck className="text-primary" size={18} />
            <span className="font-mono-metadata text-mono-metadata text-on-surface-variant">
              <strong className="font-medium text-on-surface">Max 6 Members per Workspace</strong> — Keeps bandwidth snappy and eliminates sync collisions.
            </span>
          </div>
        </div>

        {/* Dual Action Modes */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          <CreateTeam 
            onCreate={(name, id) => {
              onEnterWorkspace(id, name);
            }} 
            session={session}
          />
          <JoinTeam 
            onJoin={(id) => {
              onEnterWorkspace(id);
            }} 
            session={session}
            initialJoinCode={initialJoinCode}
            initialJoinError={initialJoinError}
            onClearInitialJoin={onClearInitialJoin}
          />
        </div>

        {/* Recent Visited Workspaces Panel */}
        {isLoading ? (
          <div className="w-full mt-6 max-w-3xl bg-surface-container-lowest rounded-xl p-6 shadow-sm flex items-center justify-center text-secondary">
            <Loader2 size={20} className="animate-spin" />
            <span className="ml-2 font-label-md">Loading your workspaces...</span>
          </div>
        ) : error ? (
          <div className="w-full mt-6 max-w-3xl bg-error-container text-on-error-container rounded-xl p-4 flex items-center gap-2 text-body-sm">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        ) : recentTeams.length > 0 ? (
          <div className="w-full mt-6 max-w-3xl flex flex-col gap-3">
            <h3 className="font-label-lg text-secondary pl-1">Your Workspaces</h3>
            {recentTeams.map(team => (
              <div key={team.id} className="w-full bg-surface-container-lowest rounded-xl p-4 md:p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 border border-outline-variant hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="w-8 h-8 rounded bg-surface-container flex items-center justify-center text-primary shrink-0">
                    <History size={18} />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-label-md text-label-md font-medium text-on-surface">{team.name}</span>
                      <span className="inline-flex items-center px-1.5 py-0.5 bg-surface-container text-secondary rounded font-mono-metadata text-mono-metadata">{team.join_code}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                  <button 
                    onClick={() => onEnterWorkspace(team.id, team.name)}
                    className="px-3.5 py-1.5 bg-surface hover:bg-surface-container text-primary font-label-md text-label-md rounded flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer border border-outline-variant"
                  >
                    <span>Resume Session</span>
                    <ArrowRight size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteSession(team.id, team.name)}
                    className="px-3.5 py-1.5 bg-error/10 hover:bg-error/20 text-error font-label-md text-label-md rounded flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer border border-error/20"
                    title="Delete Session"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {/* Technical Status */}
        <footer className="w-full mt-8 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-secondary font-mono-metadata text-mono-metadata max-w-3xl">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span>Sync Engine: All Systems Operational</span>
            <span className="text-secondary/40">•</span>
            <span>End-to-end Local Stash</span>
          </div>
        </footer>

      </div>
    </main>
  );
};
