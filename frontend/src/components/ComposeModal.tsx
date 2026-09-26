import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { X, Upload, Clock, ShieldAlert, Timer, Sparkles, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';

interface ComposeModalProps {
  user: any;
  onClose: () => void;
  onScheduled: () => void;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({ user, onClose, onScheduled }) => {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [startTime, setStartTime] = useState('');
  const [delaySeconds, setDelaySeconds] = useState(2);
  const [hourlyLimit, setHourlyLimit] = useState(10);
  const [recipients, setRecipients] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [force, setForce] = useState(false);

  const [lintReport, setLintReport] = useState<{
    score: number;
    status: 'GREEN' | 'YELLOW' | 'RED';
    issues: string[];
    recommendations: string[];
  }>({
    score: 100,
    status: 'GREEN',
    issues: [],
    recommendations: [],
  });

  // Live Deliverability Linter
  useEffect(() => {
    if (!subject && !body) {
      setLintReport({ score: 100, status: 'GREEN', issues: [], recommendations: [] });
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const { data } = await api.lintEmail(subject, body);
        setLintReport(data);
      } catch (err) {
        console.error('Lint check error:', err);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [subject, body]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const emails: string[] = [];
        results.data.forEach((row: any) => {
          const emailVal = Object.values(row).find((val: any) =>
            typeof val === 'string' && val.includes('@')
          );
          if (emailVal) emails.push(String(emailVal).trim());
        });
        setRecipients(emails);
      },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Fallback recipient if none loaded via CSV
    const finalRecipients = recipients.length ? recipients : ['lead1@example.com', 'lead2@example.com'];

    if (!startTime) {
      alert('Please select a scheduled start time.');
      return;
    }

    setLoading(true);
    try {
      await api.scheduleEmails({
        userId: user.id,
        senderEmail: user.email,
        recipients: finalRecipients,
        subject,
        body,
        startTime,
        delaySeconds,
        hourlyLimit,
        force,
      });
      onScheduled();
      onClose();
    } catch (err: any) {
      if (err.response?.status === 422) {
        alert(`Deliverability Quality Gate Warning: Content score is ${err.response.data.lintReport?.score}/100. Check "Force Schedule" to bypass.`);
      } else {
        alert(`Failed to schedule emails: ${err.response?.data?.error || err.message || 'Server error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const getBadgeStyle = () => {
    if (lintReport.status === 'GREEN') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    if (lintReport.status === 'YELLOW') return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
  };

  const getStatusText = () => {
    if (lintReport.status === 'GREEN') return 'Ready • High Deliverability';
    if (lintReport.status === 'YELLOW') return 'Caution • Moderate Spam Risk';
    return 'High Spam Risk • Low Score';
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl my-8">
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-white">Compose Outreach Campaign</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X className="h-5 w-5"/>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Deliverability Score Banner */}
          <div className={`p-4 rounded-xl border ${getBadgeStyle()} flex items-start justify-between transition-all`}>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4"/>
                <span className="font-semibold text-sm">Deliverability Quality Score: {lintReport.score}/100</span>
              </div>
              <p className="text-xs opacity-90">{getStatusText()}</p>
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider ${getBadgeStyle()}`}>
              {lintReport.status}
            </span>
          </div>

          {/* Issues & Recommendations if low score */}
          {lintReport.issues.length > 0 && (
            <div className="bg-slate-950/80 border border-amber-500/30 rounded-lg p-3 text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-medium text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5"/> Deliverability Quality Gate Issues:
              </div>
              <ul className="list-disc list-inside text-slate-300 space-y-1 pl-1">
                {lintReport.issues.map((issue, idx) => (
                  <li key={idx}>{issue}</li>
                ))}
              </ul>
              {lintReport.recommendations.length > 0 && (
                <div className="text-slate-400 pt-1 border-t border-slate-800">
                  <span className="font-medium text-slate-300">Recommendation: </span>
                  {lintReport.recommendations.join(' ')}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Upload Lead CSV</label>
            <div className="border-2 border-dashed border-slate-700 rounded-lg p-3.5 text-center hover:border-indigo-500 cursor-pointer relative transition bg-slate-950/30">
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <Upload className="h-5 w-5 text-slate-400 mx-auto mb-1"/>
              <p className="text-xs text-slate-300">
                {recipients.length ? `${recipients.length} recipients detected` : 'Click to select CSV / TXT lead file (or uses default leads)'}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Subject Line</label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Quick question regarding cold outreach scaling"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Email Body</label>
            <textarea
              required
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your email body..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
                <Clock className="h-3 w-3"/> Start Time
              </label>
              <input
                type="datetime-local"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
                <Timer className="h-3 w-3"/> Delay (sec)
              </label>
              <input
                type="number"
                min="0"
                required
                value={delaySeconds}
                onChange={(e) => setDelaySeconds(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
                <ShieldAlert className="h-3 w-3"/> Limit / Hour
              </label>
              <input
                type="number"
                min="1"
                required
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Force Schedule Checkbox if Quality Gate trigger */}
          {lintReport.score < 70 && (
            <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
              <input
                type="checkbox"
                id="forceSchedule"
                checked={force}
                onChange={(e) => setForce(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
              />
              <label htmlFor="forceSchedule" className="text-xs text-amber-400 font-medium cursor-pointer">
                Bypass Quality Gate & force schedule campaign despite low health score
              </label>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-lg text-sm mt-4 transition shadow-lg shadow-indigo-600/20"
          >
            {loading ? 'Queueing Jobs...' : 'Schedule Campaign'}
          </button>
        </form>
      </div>
    </div>
  );
};
