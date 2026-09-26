import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const api = {
  login: (userData: { email: string; name: string; avatar: string }) =>
    axios.post(`${API_BASE}/auth/login`, userData),
  lintEmail: (subject: string, body: string) =>
    axios.post(`${API_BASE}/emails/lint`, { subject, body }),
  scheduleEmails: (payload: any) =>
    axios.post(`${API_BASE}/emails/schedule`, payload),
  getScheduledEmails: (userId: string) =>
    axios.get(`${API_BASE}/emails/scheduled?userId=${userId}`),
  getSentEmails: (userId: string) =>
    axios.get(`${API_BASE}/emails/sent?userId=${userId}`),
  searchEmails: (userId: string, q: string, status?: string) =>
    axios.get(`${API_BASE}/emails/search?userId=${userId}&q=${q}&status=${status || ''}`),
};
