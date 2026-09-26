import React from 'react';
import { ExternalLink } from 'lucide-react';

interface EmailTableProps {
  emails: any[];
  isSentView?: boolean;
}

export const EmailTable: React.FC<EmailTableProps> = ({ emails, isSentView }) => {
  if (!emails || !emails.length) {
    return (
      <div className="text-center py-16 border border-slate-800 rounded-xl bg-slate-900/30">
        <p className="text-slate-400 text-sm">No emails recorded in this category.</p>
      </div>
    );
  }

  return (
    <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 text-xs uppercase tracking-wider">
          <tr>
            <th className="px-6 py-3.5">Recipient</th>
            <th className="px-6 py-3.5">Subject</th>
            <th className="px-6 py-3.5">{isSentView ? 'Sent At' : 'Scheduled Time'}</th>
            <th className="px-6 py-3.5">Status</th>
            {isSentView && <th className="px-6 py-3.5">Preview</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {emails.map((e) => (
            <tr key={e.id} className="hover:bg-slate-800/30 transition">
              <td className="px-6 py-4 font-medium text-slate-200">{e.recipientEmail}</td>
              <td className="px-6 py-4 text-slate-400 truncate max-w-xs">{e.subject}</td>
              <td className="px-6 py-4 text-slate-400">
                {new Date(isSentView ? e.sentAt : e.scheduledFor).toLocaleString()}
              </td>
              <td className="px-6 py-4">
                <span
                  className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                    e.status === 'SENT'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : e.status === 'RATE_LIMITED_RESCHEDULED'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                      : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30'
                  }`}
                >
                  {e.status}
                </span>
              </td>
              {isSentView && (
                <td className="px-6 py-4">
                  {e.etherealUrl ? (
                    <a
                      href={e.etherealUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1 text-xs"
                    >
                      Ethereal <ExternalLink className="h-3 w-3"/>
                    </a>
                  ) : (
                    <span className="text-slate-600 text-xs">N/A</span>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
