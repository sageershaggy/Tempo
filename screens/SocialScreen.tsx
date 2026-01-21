import React, { useState } from 'react';
import { Screen } from '../types';

export const SocialScreen: React.FC<{ setScreen: (s: Screen) => void }> = ({ setScreen }) => {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSent, setInviteSent] = useState(false);

  const handleSendInvite = (e: React.FormEvent) => {
      e.preventDefault();
      if (!inviteEmail.trim()) return;
      
      // Simulate API call
      setTimeout(() => {
          setInviteSent(true);
          setTimeout(() => {
              setInviteSent(false);
              setShowInviteModal(false);
              setInviteEmail('');
          }, 2000);
      }, 500);
  };

  return (
    <div className="h-full flex flex-col bg-background-dark pb-24 overflow-y-auto no-scrollbar relative">
       <div className="sticky top-0 bg-background-dark/95 backdrop-blur-sm z-20 p-4 border-b border-white/5 flex items-center justify-between">
            <button className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/5"><span className="material-symbols-outlined">arrow_back</span></button>
            <h2 className="font-bold text-lg">Tempo Friends</h2>
            <button className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/5"><span className="material-symbols-outlined">notifications</span></button>
       </div>

       <div className="relative px-4 pt-8 pb-12">
            {/* Glow Background */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/20 blur-[60px] rounded-full pointer-events-none"></div>

            <div className="flex justify-center items-end gap-4 w-full relative z-10">
                {/* Rank 2 */}
                <div className="flex flex-col items-center w-1/3 mb-4">
                    <div className="relative">
                        <img src="https://picsum.photos/id/1012/200/200" className="w-20 h-20 rounded-full border-2 border-surface-dark shadow-lg" alt="Mike" />
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-surface-dark px-2 rounded-full border border-white/10 text-xs font-bold">#2</div>
                    </div>
                    <p className="mt-3 font-semibold text-sm">Mike</p>
                    <div className="flex items-center gap-1 text-secondary text-xs font-bold">
                        <span className="material-symbols-outlined text-sm">local_fire_department</span> 8
                    </div>
                    <p className="text-xs text-muted">32h</p>
                </div>

                {/* Rank 1 */}
                <div className="flex flex-col items-center w-1/3 mb-8">
                     <span className="material-symbols-outlined text-yellow-400 text-4xl mb-2 animate-bounce">emoji_events</span>
                     <div className="relative">
                        <img src="https://picsum.photos/id/1027/200/200" className="w-24 h-24 rounded-full border-4 border-primary shadow-[0_0_20px_rgba(127,19,236,0.6)]" alt="Sarah" />
                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-primary px-3 py-0.5 rounded-full border-2 border-background-dark text-sm font-bold">#1</div>
                    </div>
                    <p className="mt-4 font-bold text-lg">Sarah</p>
                    <div className="flex items-center gap-1 bg-secondary/10 px-3 py-1 rounded-full text-secondary font-bold text-sm mt-1">
                        <span className="material-symbols-outlined text-sm">local_fire_department</span> 12 Days
                    </div>
                    <p className="text-sm text-white/60 mt-1">48h Focused</p>
                </div>

                {/* Rank 3 */}
                <div className="flex flex-col items-center w-1/3 mb-4">
                    <div className="relative">
                        <img src="https://picsum.photos/id/1011/200/200" className="w-20 h-20 rounded-full border-2 border-surface-dark shadow-lg" alt="Jess" />
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-surface-dark px-2 rounded-full border border-white/10 text-xs font-bold">#3</div>
                    </div>
                    <p className="mt-3 font-semibold text-sm">Jess</p>
                    <div className="flex items-center gap-1 text-secondary text-xs font-bold">
                        <span className="material-symbols-outlined text-sm">local_fire_department</span> 5
                    </div>
                    <p className="text-xs text-muted">28h</p>
                </div>
            </div>
       </div>

       <div className="px-4">
            <h3 className="text-muted text-xs font-bold uppercase tracking-wider mb-4 pl-2">Your Squad</h3>
            <div className="space-y-3">
                {[
                    { rank: 4, name: "Alex Chen", hours: "42h", img: 1005, streak: 4 },
                    { rank: 5, name: "Jordan Lee", hours: "38h", img: 1014, streak: 3 },
                    { rank: 6, name: "You", hours: "31h", img: 0, streak: 2, me: true },
                    { rank: 7, name: "Casey West", hours: "12h", img: 1024, streak: 0 }
                ].map((user) => (
                    <div key={user.rank} className={`flex items-center justify-between p-3 rounded-xl border ${user.me ? 'bg-white/10 border-white/20' : 'bg-surface-dark/40 border-white/5'}`}>
                        <div className="flex items-center gap-4">
                            <span className="text-muted font-bold w-4 text-center">{user.rank}</span>
                            {user.me ? (
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-blue-500"></div>
                            ) : (
                                <img src={`https://picsum.photos/id/${user.img}/100/100`} className="w-12 h-12 rounded-full border border-white/10" alt={user.name} />
                            )}
                            <div>
                                <p className="font-semibold">{user.name}</p>
                                <p className="text-xs text-muted">Total: {user.hours}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 bg-background-dark/50 px-3 py-1.5 rounded-lg border border-white/5">
                            <span className={`material-symbols-outlined text-sm ${user.streak > 0 ? 'text-secondary' : 'text-muted'}`}>local_fire_department</span>
                            <span className={`font-bold text-sm ${user.streak > 0 ? 'text-secondary' : 'text-muted'}`}>{user.streak}</span>
                        </div>
                    </div>
                ))}
            </div>
       </div>
        
        <div className="fixed bottom-24 w-full max-w-md px-6 z-30 pointer-events-none">
            <button 
                onClick={() => setShowInviteModal(true)}
                className="pointer-events-auto w-full h-12 bg-primary hover:bg-primary-light text-white font-bold rounded-xl shadow-xl shadow-primary/30 flex items-center justify-center gap-2 transition-colors"
            >
                <span className="material-symbols-outlined">person_add</span>
                Invite a Friend
            </button>
        </div>

        {/* Invite Modal */}
        {showInviteModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
                <div className="w-full max-w-sm bg-surface-dark rounded-2xl border border-white/10 p-6 shadow-2xl relative">
                    <button 
                        onClick={() => setShowInviteModal(false)}
                        className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10"
                    >
                        <span className="material-symbols-outlined text-muted">close</span>
                    </button>
                    
                    <div className="text-center mb-6">
                        <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-3 text-primary">
                            <span className="material-symbols-outlined">mail</span>
                        </div>
                        <h3 className="text-lg font-bold">Invite to Squad</h3>
                        <p className="text-sm text-muted">Compete on the leaderboard together.</p>
                    </div>

                    {!inviteSent ? (
                        <form onSubmit={handleSendInvite} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold uppercase text-muted mb-1 block">Friend's Email</label>
                                <input 
                                    type="email" 
                                    required
                                    placeholder="friend@example.com"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none"
                                    autoFocus
                                />
                            </div>
                            <button type="submit" className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors">
                                Send Invite
                            </button>
                        </form>
                    ) : (
                        <div className="text-center py-4 animate-fade-in">
                            <span className="material-symbols-outlined text-4xl text-green-500 mb-2">check_circle</span>
                            <p className="font-bold text-white">Invite Sent!</p>
                        </div>
                    )}
                </div>
            </div>
        )}
    </div>
  );
};