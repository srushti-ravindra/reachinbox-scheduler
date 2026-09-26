import React from 'react';
import { Send, LogOut, CheckCircle, ExternalLink } from 'lucide-react';

interface NavbarProps {
  user: any;
  onLogout: () => void;
  onOpenCompose: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout, onOpenCompose }) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-md shadow-indigo-500/20">
          <Send className="h-5 w-5"/>
        </div>
        <span className="font-bold text-xl text-white tracking-tight">ReachInbox Scheduler</span>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={() => {
            window.location.href = `http://localhost:5000/api/slack/authorize?userId=${user.id}`;
          }}
          className={`px-3 py-1.5 rounded-lg border text-sm flex items-center gap-2 font-medium transition ${
            user.slackWebhookUrl
              ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
              : 'border-slate-700 text-slate-300 hover:bg-slate-800'
          }`}
        >
          {user.slackWebhookUrl ? (
            <>
              <CheckCircle className="h-4 w-4"/> Slack Connected
            </>
          ) : (
            'Connect Slack'
          )}
        </button>

        <a
          href="http://localhost:5000/admin/queues"
          target="_blank"
          rel="noreferrer"
          className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-mono transition"
        >
          Queue Dashboard <ExternalLink className="h-3 w-3"/>
        </a>

        <button
          onClick={onOpenCompose}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2 rounded-lg text-sm transition shadow-md shadow-indigo-600/20"
        >
          Compose New Email
        </button>

        <div className="flex items-center gap-3 pl-4 border-l border-slate-800">
          <img src={user.avatar} alt={user.name} className="h-9 w-9 rounded-full ring-2 ring-indigo-500/30" />
          <div className="text-left hidden md:block">
            <p className="text-sm font-medium text-slate-200">{user.name}</p>
            <p className="text-xs text-slate-500">{user.email}</p>
          </div>
          <button onClick={onLogout} className="p-2 text-slate-400 hover:text-rose-400 transition" title="Logout">
            <LogOut className="h-4 w-4"/>
          </button>
        </div>
      </div>
    </header>
  );
};
