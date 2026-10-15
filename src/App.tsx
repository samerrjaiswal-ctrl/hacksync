import { useState, useEffect, useRef } from 'react';
import { TeamLanding } from './components/TeamLanding';
import { TeamWorkspace } from './components/TeamWorkspace';
import { AuthPanel } from './components/AuthPanel';
import { supabase } from './lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { LogOut, Loader2, Users, AlertCircle } from 'lucide-react';
import Iridescence from './components/Iridescence';
import './App.css';

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [currentView, setCurrentView] = useState<'landing' | 'workspace'>('landing');
  const [teamId, setTeamId] = useState<string>('');
  const [teamName, setTeamName] = useState<string>('');

  const [pendingInviteCode, setPendingInviteCode] = useState<string>('');
  const [guestName, setGuestName] = useState<string>('');
  const [memberNo, setMemberNo] = useState<string>('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string>('');
  
  const [showJoinMode, setShowJoinMode] = useState(false);
  
  const processingCodeRef = useRef<string | null>(null);
  const failedCodesRef = useRef<Set<string>>(new Set());

  const profileInitializedRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const setupSession = async (currentSession: Session | null) => {
      if (!currentSession) {
        if (mounted) {
          setSession(null);
          setIsInitializing(false);
          profileInitializedRef.current = null;
        }
        return;
      }

      // Upsert profile for the authenticated user only once per session
      if (profileInitializedRef.current !== currentSession.user.id) {
        const fullName = currentSession.user.user_metadata?.full_name || currentSession.user.email?.split('@')[0] || 'User';
        await supabase.from('profiles').upsert({
          id: currentSession.user.id,
          display_name: fullName
        });
        profileInitializedRef.current = currentSession.user.id;
      }

      if (mounted) {
        setSession(currentSession);
        setIsInitializing(false);

        // Session Persistence: Auto-restore workspace if exists
        const savedWorkspace = localStorage.getItem('hacksync_workspace');
        if (savedWorkspace) {
          try {
            const { id, name } = JSON.parse(savedWorkspace);
            if (id) {
              setTeamId(id);
              setTeamName(name || `Team ${id}`);
              setCurrentView('workspace');
            }
          } catch (e) {
            localStorage.removeItem('hacksync_workspace');
          }
        }
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      setupSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setupSession(newSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    if (session && pendingInviteCode) {
      if (failedCodesRef.current.has(pendingInviteCode)) return;
      if (processingCodeRef.current === pendingInviteCode) return;

      const codeToJoin = pendingInviteCode;
      processingCodeRef.current = codeToJoin;

      const joinPendingTeam = async () => {
        setIsJoining(true);
        try {
          const { data: joinedTeamId, error: rpcError } = await supabase.rpc('join_team_by_code', { code: codeToJoin });
          if (!isActive) return;
          if (rpcError) throw rpcError;
          setPendingInviteCode('');
          setJoinError('');
          failedCodesRef.current.delete(codeToJoin);
          handleEnterWorkspace(joinedTeamId);
        } catch (err: any) {
          if (!isActive) return;
          console.error("Failed to join with pending code", err);
          setJoinError(err.message || 'Failed to join team with provided code.');
          failedCodesRef.current.add(codeToJoin);
        } finally {
          if (processingCodeRef.current === codeToJoin) {
            processingCodeRef.current = null;
          }
          if (isActive) {
            setIsJoining(false);
          }
        }
      };
      joinPendingTeam();
    }

    return () => {
      isActive = false;
    };
  }, [session, pendingInviteCode]);

  const handleEnterWorkspace = (id: string, name?: string) => {
    setTeamId(id);
    setTeamName(name || `Team ${id}`);
    setCurrentView('workspace');
    localStorage.setItem('hacksync_workspace', JSON.stringify({ id, name: name || `Team ${id}` }));
  };

  const handleLeaveWorkspace = async (kickMessage?: string) => {
    setTeamId('');
    setTeamName('');
    setCurrentView('landing');
    localStorage.removeItem('hacksync_workspace');
    
    // If the user is a guest, sign them out so they return to the initial flip-card
    if (session?.user?.app_metadata?.is_guest) {
      await supabase.auth.signOut();
    }
    
    if (typeof kickMessage === 'string') {
      setJoinError(kickMessage);
      setShowJoinMode(true); // Flip to the Join face immediately so they see the error and the join form
    } else {
      setShowJoinMode(false); // Return to Sign-in face if voluntary leave
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    handleLeaveWorkspace();
  };

  const handleGuestJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = pendingInviteCode.trim();
    const name = guestName.trim();
    if (!code || !name) return;
    
    setIsJoining(true);
    setJoinError('');
    
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/guest-join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ 
          name: `${name} (Member ${memberNo})`,
          code,
          memberNo // Passed separately if edge function needs it
        })
      });
      
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (data?.error) {
          const errLower = typeof data.error === 'string' ? data.error.toLowerCase() : '';
          if (errLower.includes('slot is already taken') || errLower.includes('already taken') || errLower.includes('already present')) {
            throw new Error(`Team member ${memberNo} is already present.`);
          }
          throw new Error(data.error);
        } else if (response.status === 404) {
          throw new Error('Invalid invite code. Please check the code and try again.');
        } else if (response.status === 403) {
          throw new Error(`Team member ${memberNo} is already present.`);
        } else {
          throw new Error(`Server error (${response.status}). Please try again later.`);
        }
      }
      
      if (!data?.session) {
        throw new Error('Invalid response from server. No session provided.');
      }
      
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token
      });
      
      if (sessionError) throw sessionError;
      
      setPendingInviteCode('');
      handleEnterWorkspace(data.teamId, undefined);
    } catch (err: any) {
      console.error("Guest join failed:", err);
      if (err.message?.includes('Failed to fetch') || err.name === 'TypeError') {
        setJoinError('Network error. Please check your connection.');
      } else {
        setJoinError(err.message || 'Failed to join team. Please check the code.');
      }
      failedCodesRef.current.add(code);
    } finally {
      setIsJoining(false);
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center font-body-md text-on-surface view-transition-container gap-3">
        <Loader2 size={36} className="animate-spin text-primary" />
        <span className="font-label-md text-secondary tracking-wide">Initializing HackSync...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface font-body-md text-on-surface antialiased flex flex-col">
      {currentView === 'landing' && session && !session.user.app_metadata?.is_guest && (
        <div className="w-full flex justify-end p-4 absolute top-0 right-0 pointer-events-none z-50">
          <button 
            onClick={handleLogout}
            className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 bg-surface-container hover:bg-surface-container-high rounded text-secondary font-label-md transition-colors shadow-sm cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      )}
      
      {!session || (currentView === 'landing' && session.user.app_metadata?.is_guest) ? (
        <div key="auth-view" className="relative flex-1 w-full min-h-screen flex flex-col items-center justify-center p-4 lg:p-8 overflow-hidden bg-surface view-transition-container">
          {/* Iridescence WebGL Background */}
          <div className="absolute inset-0 z-0 pointer-events-auto overflow-hidden">
            <Iridescence
              color="#8099cc"
              hueShift={0}
              saturation={1}
              brightness={1.5}
              contrast={1}
              speed={1}
              scale={1}
              detail={8}
              warp={1}
              rotation={0}
              mouseReact={true}
              amplitude={0.1}
              stir={0.5}
              sheen={0.3}
              clickSwirl={true}
              grain={0}
              fade={0}
              className="w-full h-full"
            />
            {/* Soft frosted gradient overlay so auth card remains ultra-crisp & readable */}
            <div className="absolute inset-0 bg-white/35 dark:bg-[#070b14]/45 pointer-events-none" />
          </div>

          <div className="relative z-10 w-full max-w-md mx-auto flex flex-col items-center justify-center">
            <div className="flip-card-perspective">
              <div className={`flip-card-inner ${showJoinMode ? 'is-flipped' : ''}`}>
                
                {/* FRONT FACE: AUTHENTICATION */}
                <div 
                  className={`flip-card-front flex flex-col ${showJoinMode ? 'pointer-events-none' : 'pointer-events-auto'}`}
                  inert={showJoinMode ? true : undefined}
                  aria-hidden={showJoinMode}
                >
                  <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm flex flex-col items-center">
                    <div className="mb-6 text-center w-full">
                      <div className="flex items-center justify-center mb-4">
                        <img src="/logo.png" alt="HackSync Logo" className="h-14 w-auto drop-shadow-sm" />
                      </div>
                      <p className="text-secondary font-body-md">Sign in to join your team workspace.</p>
                    </div>
                    
                    {joinError && (
                      <div className="w-full mb-4 p-3 bg-error-container text-on-error-container rounded-lg text-body-sm flex items-start gap-2 animate-fade-in shadow-sm">
                        <AlertCircle size={16} className="mt-0.5 shrink-0" />
                        <span>{joinError}</span>
                      </div>
                    )}

                    {pendingInviteCode.trim() && !joinError ? (
                      <div className="w-full mb-4 p-3 bg-primary-container text-on-primary-container rounded-lg text-body-sm flex items-center justify-between animate-fade-in shadow-sm">
                        <span>Code <strong>{pendingInviteCode}</strong> ready. Sign in to join.</span>
                      </div>
                    ) : null}
                    
                    <AuthPanel />
                    
                    <div className="mt-6 pt-4 border-t border-outline-variant w-full text-center">
                      <button
                        id="join-with-code-btn"
                        type="button"
                        onClick={() => setShowJoinMode(true)}
                        className="text-primary font-label-md hover:underline transition-colors cursor-pointer"
                      >
                        Join with Team Code
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* BACK FACE: JOIN WITH CODE */}
                <div 
                  className={`flip-card-back flex flex-col ${!showJoinMode ? 'pointer-events-none' : 'pointer-events-auto'}`}
                  inert={!showJoinMode ? true : undefined}
                  aria-hidden={!showJoinMode}
                >
                  <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm flex flex-col h-full">
                   <div className="flex items-center justify-between gap-3 mb-6">
                     <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
                         <Users size={20} />
                       </div>
                       <h2 className="font-headline-sm text-headline-sm text-on-surface">
                         Join Your Team
                       </h2>
                     </div>
                   </div>
                   
                   <p className="text-secondary font-body-md mb-6">
                     Enter your name and the invite code shared by your team leader.
                   </p>

                   {joinError && (
                     <div className="mb-4 p-3 bg-error-container text-on-error-container rounded-lg text-body-sm flex items-start gap-2 animate-fade-in">
                       <AlertCircle size={16} className="mt-0.5 shrink-0" />
                       <span>{joinError}</span>
                     </div>
                   )}

                   <form onSubmit={handleGuestJoin} className="flex flex-col gap-4">
                     <div className="flex flex-col gap-1.5">
                       <label className="font-label-sm text-label-sm text-secondary" htmlFor="guestName">
                         Your Name
                       </label>
                       <input
                         id="guestName"
                         type="text"
                         value={guestName}
                         onChange={(e) => { 
                           setGuestName(e.target.value); 
                           setJoinError(''); 
                         }}
                         className="w-full px-3 py-2 bg-surface border border-outline rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-on-surface font-body-md shadow-sm"
                         placeholder="Enter your full name"
                         required
                       />
                     </div>
                     
                     <div className="flex flex-col gap-1.5">
                       <label className="font-label-sm text-label-sm text-secondary" htmlFor="memberNo">
                         Team Member No
                       </label>
                       <select
                         id="memberNo"
                         value={memberNo}
                         onChange={(e) => {
                           setMemberNo(e.target.value);
                           setJoinError('');
                         }}
                         className="w-full px-3 py-2 bg-surface border border-outline rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-on-surface font-body-md shadow-sm appearance-none"
                         required
                       >
                         <option value="" disabled>Select your member slot</option>
                         <option value="2">Member 2</option>
                         <option value="3">Member 3</option>
                         <option value="4">Member 4</option>
                         <option value="5">Member 5</option>
                         <option value="6">Member 6</option>
                       </select>
                     </div>
                     
                     <div className="flex flex-col gap-1.5">
                       <label className="font-label-sm text-label-sm text-secondary" htmlFor="inviteCode">
                         Team Invite Code
                       </label>
                       <input
                         id="inviteCode"
                         type="text"
                         value={pendingInviteCode}
                         onChange={(e) => { 
                           const code = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                           setPendingInviteCode(code); 
                           setJoinError(''); 
                           failedCodesRef.current.delete(code);
                         }}
                         className="w-full px-3 py-2 bg-surface border border-outline rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-on-surface uppercase tracking-widest font-mono-code shadow-sm"
                         placeholder="Enter team code"
                         required
                       />
                     </div>
                     
                     <button
                       type="submit"
                       disabled={!pendingInviteCode.trim() || !guestName.trim() || isJoining}
                       className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-on-primary font-label-lg rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer shadow-sm"
                     >
                       {isJoining ? <Loader2 size={18} className="animate-spin" /> : 'Join Team'}
                     </button>
                   </form>
                   
                   <div className="mt-auto pt-6 border-t border-outline-variant text-center">
                     <button 
                       id="back-to-signin-btn"
                       type="button"
                       onClick={() => setShowJoinMode(false)}
                       className="text-secondary font-label-md hover:text-on-surface transition-colors flex items-center justify-center gap-1 mx-auto cursor-pointer"
                     >
                       ← Back
                     </button>
                   </div>
                </div>
              </div>
              
            </div>
          </div>
        </div>
      </div>
      ) : currentView === 'landing' ? (
        <div key="landing-view" className="view-transition-container w-full min-h-screen flex flex-col flex-1">
          <TeamLanding 
            onEnterWorkspace={handleEnterWorkspace} 
            session={session} 
            initialJoinCode={pendingInviteCode}
            initialJoinError={joinError}
            onClearInitialJoin={() => {
              setPendingInviteCode('');
              setJoinError('');
            }}
          />
        </div>
      ) : (
        <div key={`workspace-view-${teamId}`} className="view-transition-container w-full min-h-screen flex flex-col flex-1">
          <TeamWorkspace 
            teamId={teamId} 
            teamName={teamName} 
            onLeave={handleLeaveWorkspace} 
          />
        </div>
      )}
    </div>
  );
}

export default App;
