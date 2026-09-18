import React, { useContext, useState } from 'react';
import { FiBell, FiMail, FiSend } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { AuthContext } from '../../context/AuthContext';
import MainLayout from '../../layouts/MainLayout';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';

const AdminNotificationsPage = () => {
  const { axiosInstance } = useContext(AuthContext);
  const [broadcast, setBroadcast] = useState({ title: '', message: '', type: 'general', target: 'all' });
  const [privateMessage, setPrivateMessage] = useState({ email: '', subject: '', message: '' });
  const [loading, setLoading] = useState(false);

  const sendBroadcast = async (event) => {
    event.preventDefault();
    if (!window.confirm('Send this notification to all eligible users in your farm?')) return;
    setLoading(true);
    try {
      const response = await axiosInstance.post('/api/notifications/admin/broadcast', broadcast);
      toast.success(response.data.message || 'Notification broadcast sent.');
      setBroadcast({ title: '', message: '', type: 'general', target: 'all' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to send broadcast.');
    } finally { setLoading(false); }
  };

  const sendPrivateMessage = async (event) => {
    event.preventDefault();
    if (!window.confirm(`Send this private message to ${privateMessage.email}?`)) return;
    setLoading(true);
    try {
      const response = await axiosInstance.post('/api/notifications/admin/private-message', privateMessage);
      toast.success(response.data.message || 'Private message sent.');
      setPrivateMessage({ email: '', subject: '', message: '' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to send private message.');
    } finally { setLoading(false); }
  };

  return <MainLayout><div className="space-y-6"><div><p className="text-sm font-semibold uppercase tracking-wider text-emerald-600">Admin tools</p><h1 className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">Notification management</h1><p className="mt-2 text-gray-600 dark:text-gray-400">Send farm-wide updates or a private email to a verified user.</p></div><div className="grid gap-6 xl:grid-cols-2"><Card><div className="mb-5 flex items-center gap-3"><span className="rounded-xl bg-emerald-100 p-3 text-emerald-700"><FiBell size={22} /></span><div><h2 className="text-xl font-bold text-gray-900 dark:text-white">Broadcast notification</h2><p className="text-sm text-gray-500">Delivered to eligible users in your farm.</p></div></div><form onSubmit={sendBroadcast} className="space-y-4"><Input label="Title" value={broadcast.title} onChange={(e) => setBroadcast({ ...broadcast, title: e.target.value })} required /><textarea className="w-full rounded-lg border-2 border-gray-300 bg-white p-3 dark:border-gray-600 dark:bg-gray-700 dark:text-white" rows="5" placeholder="Message" value={broadcast.message} onChange={(e) => setBroadcast({ ...broadcast, message: e.target.value })} required /><div className="grid gap-4 sm:grid-cols-2"><Select label="Notification type" options={[{ value: 'general', label: 'General' }, { value: 'announcement', label: 'Announcement' }, { value: 'maintenance', label: 'Maintenance' }]} value={broadcast.type} onChange={(e) => setBroadcast({ ...broadcast, type: e.target.value })} /><Select label="Target" options={[{ value: 'all', label: 'All eligible users' }]} value={broadcast.target} onChange={(e) => setBroadcast({ ...broadcast, target: e.target.value })} /></div><Button type="submit" disabled={loading} className="flex items-center gap-2"><FiSend /> {loading ? 'Sending...' : 'Send broadcast'}</Button></form></Card><Card><div className="mb-5 flex items-center gap-3"><span className="rounded-xl bg-blue-100 p-3 text-blue-700"><FiMail size={22} /></span><div><h2 className="text-xl font-bold text-gray-900 dark:text-white">Private email message</h2><p className="text-sm text-gray-500">Send directly to a user by email address.</p></div></div><form onSubmit={sendPrivateMessage} className="space-y-4"><Input label="User email" type="email" value={privateMessage.email} onChange={(e) => setPrivateMessage({ ...privateMessage, email: e.target.value })} required /><Input label="Subject" value={privateMessage.subject} onChange={(e) => setPrivateMessage({ ...privateMessage, subject: e.target.value })} required /><textarea className="w-full rounded-lg border-2 border-gray-300 bg-white p-3 dark:border-gray-600 dark:bg-gray-700 dark:text-white" rows="7" placeholder="Message" value={privateMessage.message} onChange={(e) => setPrivateMessage({ ...privateMessage, message: e.target.value })} required /><Button type="submit" variant="outline" disabled={loading} className="flex items-center gap-2"><FiMail /> {loading ? 'Sending...' : 'Send private email'}</Button></form></Card></div></div></MainLayout>;
};

export default AdminNotificationsPage;
