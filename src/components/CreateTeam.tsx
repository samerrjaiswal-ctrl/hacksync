import * as React from 'react';
import { useState } from 'react';
import { Users, ArrowRight, Copy, Check, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';

interface CreateTeamProps {
  onCreate: (teamName: string, teamId: string) => void;
  session: Session | null;
}

export const CreateTeam: React.FC<CreateTeamProps> = ({ onCreate, session }) => {
  const [teamName, setTeamName] = useState('');
  const [teamId, setTeamId] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;

    if (!teamId) {
      setIsLoading(true);
      setError('');
      try {
        if (!session?.user?.id) {
          throw new Error('You must be logged in to create a team.');
        }

        const { data: newTeamId, error: rpcError } = await supabase.rpc('create_team', { team_name: teamName });
        if (rpcError) throw rpcError;

        // Fetch the generated join_code
        const { data: teamData, error: fetchError } = await supabase
          .from('teams')
          .select('join_code')
          .eq('id', newTeamId)
          .single();
          
        if (fetchError) throw fetchError;

        setTeamId(newTeamId);
        setJoinCode(teamData.join_code);
      } catch (err: any) {
        setError(err.message || 'Failed to create team');
      } finally {
        setIsLoading(false);
      }
    } else {
      onCreate(teamName, teamId);
    }
  };

  const copyGeneratedId = () => {
    navigator.clipboard.writeText(joinCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <section className="bg-surface-container-lowest rounded-xl p-6 md:p-7 shadow-sm flex flex-col justify-between relative overflow-hidden transition-all duration-200 hover:shadow-md">
      <div className="absolute top-0 left-0 right-0 h-1 bg-primary"></div>
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-7 h-7 rounded bg-primary/10 text-primary">
              <Users size={18} />
            </span>
            <h2 className="font-headline-md text-headline-md text-on-surface">Create Your Team</h2>
          </div>
        </div>
        <p className="font-body-sm text-body-sm text-secondary mb-5">
          Start a new team workspace and get a code to share with your members.
        </p>
        
        {error && (
          <div className="mb-4 p-3 bg-error-container text-on-error-container rounded-lg text-body-sm flex items-start gap-2">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form className="space-y-4" onSubmit={handleCreate}>
          <div>
            <label className="block font-label-md text-label-md text-on-surface mb-1" htmlFor="teamName">Team Name</label>
            <div className="relative">
              <input 
                type="text" 
                id="teamName" 
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                disabled={!!teamId || isLoading}
                className="w-full h-10 px-3 py-2 bg-surface border border-outline-variant rounded text-on-surface font-body-md text-body-md placeholder-secondary/60 focus:outline-none focus:ring-2 focus:ring-primary shadow-sm disabled:opacity-60" 
                placeholder="e.g. HackSync Warriors" 
                required 
              />
            </div>
          </div>
        </form>
      </div>
      <div className="pt-6 mt-4">
        {teamId ? (
          <div className="flex flex-col gap-3">
             <div className="p-3 bg-surface-container-low border border-outline-variant rounded flex items-center justify-between animate-fade-in">
                <div className="flex flex-col">
                  <span className="font-mono-metadata text-mono-metadata text-secondary">Team Code</span>
                  <span className="font-mono-code text-headline-sm text-primary tracking-wider font-semibold">{joinCode}</span>
                </div>
                <button 
                  onClick={copyGeneratedId}
                  className="px-2.5 py-1 text-on-surface hover:bg-surface-container rounded font-label-sm text-label-sm flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {copied ? <Check size={15} className="text-primary" /> : <Copy size={15} />}
                  <span className={copied ? "text-primary" : ""}>{copied ? 'Copied' : 'Copy'}</span>
                </button>
             </div>
             <button 
                type="button" 
                onClick={handleCreate}
                className="w-full h-11 bg-primary text-on-primary hover:bg-primary/90 font-label-md text-label-md rounded flex items-center justify-center gap-2 shadow-sm transition-all duration-150 active:scale-[0.99] cursor-pointer"
             >
                <span>Enter Workspace</span>
                <ArrowRight size={18} />
             </button>
          </div>
        ) : (
          <button 
            type="button" 
            onClick={handleCreate}
            disabled={isLoading || !teamName.trim()}
            className="w-full h-11 bg-primary text-on-primary hover:bg-primary/90 font-label-md text-label-md rounded flex items-center justify-center gap-2 shadow-sm transition-all duration-150 active:scale-[0.99] cursor-pointer disabled:opacity-70"
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <span>Create Team</span>}
          </button>
        )}
      </div>
    </section>
  );
};
