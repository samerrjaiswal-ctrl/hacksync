import * as React from 'react';
import { 
  Video, 
  Mic, 
  MicOff, 
  VideoOff, 
  PhoneCall, 
  MonitorUp, 
  Users, 
  Sparkles, 
  ShieldCheck, 
  Signal, 
  Radio
} from 'lucide-react';
import type { MemberData } from '../types';

interface VideoLinkScreenProps {
  teamName: string;
  members: MemberData[];
  currentUserId: string | null;
  peers: string[];
}

export const VideoLinkScreen: React.FC<VideoLinkScreenProps> = ({
  teamName,
  members,
  currentUserId,
  peers
}) => {
  const [micEnabled, setMicEnabled] = React.useState(false);
  const [videoEnabled, setVideoEnabled] = React.useState(false);
  const [screenShare, setScreenShare] = React.useState(false);
  const [callActive, setCallActive] = React.useState(false);

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-in pb-12">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0A0F1D] via-[#0F172A] to-[#0A0F1D] border border-cyan-500/20 shadow-xl p-6 text-white">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
              <Radio className="animate-pulse" size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-white">{teamName} Video Link</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono-code font-semibold tracking-wider bg-cyan-500/20 border border-cyan-500/40 text-cyan-300">
                  PEER MESH
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Direct low-latency WebRTC video conferencing for hackathon teammates
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-300">
              <Signal size={14} className="text-emerald-400 animate-pulse" />
              <span>Mesh Status: <strong className="text-white">{peers.length} Peers Connected</strong></span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-300 font-medium">
              <ShieldCheck size={14} />
              <span>E2E Encrypted</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Video Viewport & Participant Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Stage Viewport (2 Cols) */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="relative aspect-video rounded-2xl bg-[#090D16] border border-slate-800 shadow-2xl overflow-hidden flex flex-col items-center justify-center group">
            {/* Ambient Background Grid */}
            <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-30"></div>

            {/* Glowing Accent Orb */}
            <div className="absolute w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

            {/* Stage Content */}
            <div className="relative z-10 flex flex-col items-center text-center p-8 max-w-md">
              <div className="relative mb-5">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-cyan-500/20 via-blue-600/10 to-indigo-600/20 border border-cyan-400/30 flex items-center justify-center text-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.25)]">
                  <Video size={40} className="animate-pulse" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-sm">
                  <Sparkles size={14} />
                </div>
              </div>

              <h3 className="text-lg font-bold text-white tracking-tight">
                {callActive ? 'Video Room Active' : 'Ready to Join Video Link'}
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Connect your camera and microphone to collaborate in real-time with your team members with zero server recording.
              </p>

              {/* Quick Setup Status Badge */}
              <div className="mt-5 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-[11px] text-slate-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>Room Code: <strong className="text-slate-200 font-mono-code">{teamName.toUpperCase()}</strong></span>
              </div>
            </div>

            {/* Bottom Floating Control Bar */}
            <div className="absolute bottom-5 inset-x-0 mx-auto w-max max-w-[90%] z-20 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-[#0B0F19]/90 backdrop-blur-md border border-slate-800/90 shadow-2xl">
              <button 
                onClick={() => setMicEnabled(!micEnabled)}
                className={`p-3 rounded-xl transition-all cursor-pointer ${
                  micEnabled 
                    ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)]' 
                    : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
                }`}
                title={micEnabled ? 'Mute Microphone' : 'Unmute Microphone'}
              >
                {micEnabled ? <Mic size={18} /> : <MicOff size={18} />}
              </button>

              <button 
                onClick={() => setVideoEnabled(!videoEnabled)}
                className={`p-3 rounded-xl transition-all cursor-pointer ${
                  videoEnabled 
                    ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)]' 
                    : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
                }`}
                title={videoEnabled ? 'Turn Off Camera' : 'Turn On Camera'}
              >
                {videoEnabled ? <Video size={18} /> : <VideoOff size={18} />}
              </button>

              <button 
                onClick={() => setScreenShare(!screenShare)}
                className={`p-3 rounded-xl transition-all cursor-pointer ${
                  screenShare 
                    ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' 
                    : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
                }`}
                title="Share Screen"
              >
                <MonitorUp size={18} />
              </button>

              <div className="h-6 w-px bg-slate-800 mx-1"></div>

              <button 
                onClick={() => setCallActive(!callActive)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs tracking-wide transition-all cursor-pointer ${
                  callActive
                    ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-[0_0_20px_rgba(244,63,94,0.3)]'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                }`}
              >
                <PhoneCall size={16} />
                <span>{callActive ? 'Leave Call' : 'Start Video Call'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Teammates & Room Details (1 Col) */}
        <div className="flex flex-col gap-4">
          <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-5 shadow-xs flex flex-col h-full">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/50">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-primary" />
                <h4 className="font-semibold text-sm text-on-surface">Team Roster ({members.length}/6)</h4>
              </div>
              <span className="text-[10px] font-mono-metadata px-2 py-0.5 rounded bg-surface-container text-secondary font-medium">
                P2P READY
              </span>
            </div>

            <div className="flex flex-col gap-2.5 mt-3.5 flex-1">
              {members.map((member) => {
                const isSelf = member.id === currentUserId;
                const isOnline = isSelf || peers.includes(member.id);

                return (
                  <div 
                    key={member.id} 
                    className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/40 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="relative">
                        <span className={`w-8 h-8 rounded-full ${member.colorClass} font-mono-metadata text-[11px] flex items-center justify-center font-bold`}>
                          {member.initials}
                        </span>
                        <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-on-surface flex items-center gap-1">
                          {member.name}
                          {isSelf && <span className="text-[9px] px-1 py-0.2 rounded bg-primary/10 text-primary font-normal">You</span>}
                        </span>
                        <span className="text-[10px] text-secondary">
                          {member.role === 'owner' ? 'Team Leader' : 'Teammate'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-secondary">
                      <div className="p-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant/40">
                        <MicOff size={12} className="text-slate-400" />
                      </div>
                      <div className="p-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant/40">
                        <VideoOff size={12} className="text-slate-400" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Module Notice */}
            <div className="mt-4 p-3 rounded-xl bg-cyan-50 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-800/40 text-[11px] text-cyan-800 dark:text-cyan-300 flex items-start gap-2">
              <Sparkles size={16} className="shrink-0 mt-0.5 text-cyan-500" />
              <span>
                <strong>Next Step:</strong> Direct WebRTC video mesh streaming will be wired up here. Switch back to <strong>File Share</strong> anytime from the menu bar!
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
