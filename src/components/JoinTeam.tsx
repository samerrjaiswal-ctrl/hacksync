import * as React from 'react';
import { useState, useEffect } from 'react';
import { LogIn, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';

interface JoinTeamProps {
  onJoin: (teamId: string) => void;
  session: Session | null;
  initialJoinCode?: string;
  initialJoinError?: string;
  onClearInitialJoin?: () => void;
}

export const JoinTeam: React.FC<JoinTeamProps> = ({ 
  onJoin, 
  session,
  initialJoinCode,
  initialJoinError,
  onClearInitialJoin
}) => {
  const [joinCode, setJoinCode] = useState(initialJoinCode || '');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(initialJoinError || '');

  useEffect(() => {
    if (initialJoinCode) {
      setJoinCode(initialJoinCode);
    }
    if (initialJoinError) {
      setError(initialJoinError);
    }
  }, [initialJoinCode, initialJoinError]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    setJoinCode(val);
    setError('');
    if (onClearInitialJoin) {
      onClearInitialJoin();
    }
  };

  const handleJoin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (joinCode.length !== 8) {
      setError('Please enter a complete 8-character team code');
      return;
    }
    setError('');
    setIsConnecting(true);
    
    try {
      if (!session?.user?.id) {
        throw new Error('You must be logged in to join a team.');
      }

      const { data: teamId, error: rpcError } = await supabase.rpc('join_team_by_code', { code: joinCode });
      
      if (rpcError) throw rpcError;
      
      onJoin(teamId);
    } catch (err: any) {
      setError(err.message || 'Failed to join team. Check code and team limit.');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <section className="bg-surface-container-lowest rounded-xl p-6 md:p-7 shadow-sm flex flex-col justify-between relative overflow-hidden transition-all duration-200 hover:shadow-md">
      <div className="absolute top-0 left-0 right-0 h-1 bg-secondary-fixed-dim"></div>
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-7 h-7 rounded bg-surface-container text-secondary">
              <LogIn size={18} />
            </span>
            <h2 className="font-headline-md text-headline-md text-on-surface">Join Your Team</h2>
          </div>
        </div>
        <p className="font-body-sm text-body-sm text-secondary mb-5">
          Enter the team code shared by your leader to join the workspace.
        </p>
        
        {error && (
          <div className="mb-4 p-3 bg-error-container text-on-error-container rounded-lg text-body-sm flex items-start gap-2">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form className="space-y-4" onSubmit={handleJoin}>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-label-md text-label-md text-on-surface" htmlFor="joinCodeInput">Team Code</label>
              <span className="font-mono-metadata text-mono-metadata text-secondary">8 Characters</span>
            </div>
            <div className="relative">
              <input 
                type="text" 
                id="joinCodeInput" 
                maxLength={8}
                value={joinCode}
                onChange={handleInputChange}
                disabled={isConnecting}
                className="w-full h-10 px-3 py-2 bg-surface border border-outline-variant rounded text-on-surface font-mono-code text-headline-sm tracking-widest placeholder-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary shadow-sm text-center uppercase disabled:opacity-60" 
                placeholder="e.g. 1A2B3C4D" 
                required 
              />
            </div>
          </div>
        </form>
      </div>
      <div className="pt-6 mt-4">
        <button 
          type="button" 
          onClick={() => handleJoin()}
          disabled={isConnecting || joinCode.length !== 8}
          className="w-full h-11 bg-surface-container-highest text-on-surface hover:bg-surface-container-high font-label-md text-label-md rounded flex items-center justify-center gap-2 shadow-sm transition-all duration-150 active:scale-[0.99] cursor-pointer disabled:opacity-70"
        >
          {isConnecting ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <span>Join Team</span>
          )}
        </button>
      </div>
    </section>
  );
};
