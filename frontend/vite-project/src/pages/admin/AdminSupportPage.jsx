import React, { useContext, useEffect, useState } from 'react';
import { FiCheckCircle, FiMessageCircle, FiSend } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import MainLayout from '../../layouts/MainLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import { AuthContext } from '../../context/AuthContext';

const AdminSupportPage = () => {
  const { axiosInstance } = useContext(AuthContext);
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [status, setStatus] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const loadConversations = async () => {
    try {
      const response = await axiosInstance.get('/api/support/admin/conversations?limit=50');
      setConversations(response.data.data || []);
      if (activeConversation) {
        const current = await axiosInstance.get(`/api/support/conversations/${activeConversation.conversationId}`);
        setActiveConversation(current.data.data);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to load support conversations.');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    loadConversations();
    const interval = window.setInterval(loadConversations, 30000);
    return () => window.clearInterval(interval);
  }, [axiosInstance]);

  const openConversation = async (item) => {
    try {
      const response = await axiosInstance.get(`/api/support/conversations/${item.conversationId}`);
      setActiveConversation(response.data.data);
      setStatus(response.data.data.status);
    } catch (error) { toast.error('Unable to open conversation.'); }
  };

  const updateStatus = async (nextStatus) => {
    try {
      const response = await axiosInstance.patch(`/api/support/admin/conversations/${activeConversation.conversationId}/status`, { status: nextStatus });
      setActiveConversation(response.data.data);
      setStatus(nextStatus);
      await loadConversations();
      toast.success(`Conversation marked ${nextStatus}.`);
    } catch (error) { toast.error(error.response?.data?.message || 'Unable to update status.'); }
  };

  const sendReply = async (event) => {
    event.preventDefault();
    if (!message.trim() || !activeConversation) return;
    setSending(true);
    try {
      const response = await axiosInstance.post(`/api/support/admin/conversations/${activeConversation.conversationId}/messages`, { message });
      setActiveConversation(response.data.data);
      setMessage('');
      await loadConversations();
    } catch (error) { toast.error(error.response?.data?.message || 'Unable to send reply.'); }
    finally { setSending(false); }
  };

  return <MainLayout><div className="space-y-6"><div><p className="text-sm font-semibold uppercase tracking-wider text-emerald-600">Admin tools</p><h1 className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">Support management</h1><p className="mt-2 text-gray-600 dark:text-gray-400">Review and respond to farm support conversations.</p></div><Card><div className="grid min-h-[620px] gap-5 lg:grid-cols-[340px_1fr]"><div className="border-b border-gray-200 pb-4 lg:border-b-0 lg:border-r lg:pr-5 dark:border-gray-700"><h2 className="mb-4 font-bold text-gray-900 dark:text-white">Inbox</h2>{loading ? <p className="text-sm text-gray-500">Loading conversations...</p> : conversations.length === 0 ? <p className="text-sm text-gray-500">No support conversations yet.</p> : <div className="space-y-2">{conversations.map((item) => <button type="button" key={item.conversationId} onClick={() => openConversation(item)} className={`w-full rounded-lg border p-3 text-left ${activeConversation?.conversationId === item.conversationId ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30' : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800'}`}><div className="flex justify-between gap-2"><span className="truncate text-sm font-semibold text-gray-900 dark:text-white">{item.subject}</span><span className="text-[10px] uppercase text-gray-500">{item.status}</span></div><p className="mt-2 text-xs text-gray-600 dark:text-gray-300">{item.user?.name || 'Unknown user'} {item.user?.email ? `• ${item.user.email}` : ''}</p><p className="mt-1 truncate text-xs text-gray-500">{item.lastMessage}</p><p className="mt-2 text-[10px] text-gray-400">{new Date(item.lastMessageAt).toLocaleString()}</p></button>)}</div>}</div><div className="flex min-h-[560px] flex-col">{!activeConversation ? <div className="flex flex-1 flex-col items-center justify-center text-center text-gray-500"><FiMessageCircle size={42} className="mb-4 text-emerald-500" /><p>Select a conversation to view its complete history.</p></div> : <><div className="flex flex-col gap-3 border-b border-gray-200 pb-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-700"><div><h2 className="font-bold text-gray-900 dark:text-white">{activeConversation.subject}</h2><p className="text-sm text-gray-500">{activeConversation.userId} • {activeConversation.status}</p></div><div className="flex items-center gap-2"><Select options={[{ value: 'open', label: 'Open' }, { value: 'resolved', label: 'Resolved' }, { value: 'closed', label: 'Closed' }]} value={status} onChange={(event) => updateStatus(event.target.value)} /><FiCheckCircle className="text-emerald-600" /></div></div><div className="flex-1 space-y-3 overflow-y-auto py-5">{activeConversation.messages.map((item) => <div key={item._id} className={`flex ${item.senderRole === 'admin' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] rounded-2xl px-4 py-3 ${item.senderRole === 'admin' ? 'rounded-br-sm bg-emerald-600 text-white' : 'rounded-bl-sm bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100'}`}><p className="whitespace-pre-wrap text-sm">{item.message}</p><p className={`mt-2 text-[10px] ${item.senderRole === 'admin' ? 'text-emerald-100' : 'text-gray-400'}`}>{new Date(item.createdAt).toLocaleString()}</p></div></div>)}</div><form onSubmit={sendReply} className="flex gap-2 border-t border-gray-200 pt-4 dark:border-gray-700"><textarea rows={2} value={message} onChange={(event) => setMessage(event.target.value)} disabled={sending || activeConversation.status === 'closed'} placeholder={activeConversation.status === 'closed' ? 'Conversation closed' : 'Write a reply...'} className="min-w-0 flex-1 rounded-lg border-2 border-gray-300 bg-white p-3 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white" required /><Button type="submit" disabled={sending || activeConversation.status === 'closed'}><FiSend /> {sending ? 'Sending' : 'Reply'}</Button></form></>}</div></div></Card></div></MainLayout>;
};

export default AdminSupportPage;
