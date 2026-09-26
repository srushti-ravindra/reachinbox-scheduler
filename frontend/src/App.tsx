import React, { useState, useEffect } from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { Search, UserCheck } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { ComposeModal } from './components/ComposeModal';
import { EmailTable } from './components/EmailTable';
import { api } from './services/api';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'dummy-client-id';

export default function App() {
  const [user, setUser] = useState<any>(() => {
    const saved = localStorage.getItem('reachinbox_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');
  const [emails, setEmails] = useState<any[]>([]);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleLoginSuccess = async (credentialResponse: any) => {
    try {
      let email = 'user@reachinbox.com';
      let name = 'Google User';
      let avatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80';

      if (credentialResponse?.credential) {
        try {
          const decoded: any = jwtDecode(credentialResponse.credential);
          email = decoded.email || email;
          name = decoded.name || name;
          avatar = decoded.picture || avatar;
        } catch (e) {
          console.warn('JWT decode notice:', e);
        }
      }

      const { data } = await api.login({ email, name, avatar });
      setUser(data);
      localStorage.setItem('reachinbox_user', JSON.stringify(data));
    } catch (err: any) {
      console.error('Login error:', err);
      alert(`Login failed: ${err.response?.data?.error || err.message || 'Server unreachable'}`);
    }
  };

  const handleDemoLogin = async () => {
    try {
      const demoUserData = {
        email: 'demo@reachinbox.com',
        name: 'ReachInbox Demo User',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      };
      const { data } = await api.login(demoUserData);
      setUser(data);
      localStorage.setItem('reachinbox_user', JSON.stringify(data));
    } catch (err: any) {
      console.error('Demo login error:', err);
      alert(`Demo login failed: ${err.response?.data?.error || err.message || 'Server unreachable'}`);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('reachinbox_user');
    setUser(null);
  };

  const loadData = async () => {
    if (!user) return;
    try {
      if (searchQuery.trim()) {
        const { data } = await api.searchEmails(user.id, searchQuery);
        setEmails(data || []);
      } else if (activeTab === 'scheduled') {
        const { data } = await api.getScheduledEmails(user.id);
        setEmails(data || []);
      } else {
        const { data } = await api.getSentEmails(user.id);
        setEmails(data || []);
      }
    } catch (err) {
      console.error('Failed to fetch email data:', err);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 4000);
    return () => clearInterval(interval);
  }, [user, activeTab, searchQuery]);

  if (!user) {
    return (
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <div className="flex h-screen items-center justify-center bg-slate-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-black p-4 relative overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 blur-3xl rounded-full pointer-events-none" />
          <div className="max-w-md w-full border border-slate-800 bg-slate-900/70 backdrop-blur-xl p-8 rounded-2xl text-center shadow-2xl relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold tracking-wide uppercase mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              ReachInbox Engine • Job Orchestrator
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">ReachInbox Scheduler</h1>
            <p className="text-slate-400 text-sm mb-6">Log in to schedule and observe cold outreach queues</p>
            <div className="flex flex-col items-center gap-4">
              <GoogleLogin
                onSuccess={handleLoginSuccess}
                onError={() => handleDemoLogin()}
              />
              <div className="relative w-full my-2">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
                <div className="relative flex justify-center text-xs text-slate-500 uppercase"><span className="bg-slate-900 px-2 text-slate-400">Or Quick Start</span></div>
              </div>
              <button
                onClick={handleDemoLogin}
                className="w-full bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-medium px-4 py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 border border-slate-700 transition shadow-lg"
              >
                <UserCheck className="h-4 w-4 text-indigo-400"/> Continue as Demo User
              </button>
            </div>
          </div>
        </div>
      </GoogleOAuthProvider>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-12">
      <Navbar
        user={user}
        onLogout={handleLogout}
        onOpenCompose={() => setIsComposeOpen(true)}
      />

      <main className="max-w-6xl mx-auto px-6 pt-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div className="flex gap-2 p-1 bg-slate-900 border border-slate-800 rounded-lg">
            <button
              onClick={() => setActiveTab('scheduled')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition ${
                activeTab === 'scheduled' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Scheduled Emails
            </button>
            <button
              onClick={() => setActiveTab('sent')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition ${
                activeTab === 'sent' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Sent Emails
            </button>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500"/>
            <input
              type="text"
              placeholder="Search via Elasticsearch..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <EmailTable emails={emails} isSentView={activeTab === 'sent'} />
      </main>

      {isComposeOpen && (
        <ComposeModal
          user={user}
          onClose={() => setIsComposeOpen(false)}
          onScheduled={loadData}
        />
      )}
    </div>
  );
}
