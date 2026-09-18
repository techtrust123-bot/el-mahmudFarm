import React, { useState, useEffect, useContext } from 'react';
import MainLayout from '../layouts/MainLayout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';
import Input from '../components/ui/Input';
import { AuthContext } from '../context/AuthContext';
import { FiMessageCircle, FiPlus, FiSend } from 'react-icons/fi';
import { getWhatsappUrl } from '../config/siteConfig';

const SupportPage = () => {
  const { axiosInstance, userData } = useContext(AuthContext);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState(null);
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [trainError, setTrainError] = useState(null);
  const [trainSuccess, setTrainSuccess] = useState(null);
  const [trainLoading, setTrainLoading] = useState(false);
  const [trainingEntries, setTrainingEntries] = useState([]);
  const [newFaqQuestion, setNewFaqQuestion] = useState('');
  const [newFaqAnswer, setNewFaqAnswer] = useState('');
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportLoading, setSupportLoading] = useState(true);
  const [supportSending, setSupportSending] = useState(false);
  const [supportError, setSupportError] = useState(null);

  const canTrainSupport = Boolean(
    userData?.role?.toLowerCase() === 'manager' ||
    userData?.role?.toLowerCase() === 'admin' ||
    userData?.userType?.toLowerCase() === 'manager' ||
    userData?.userType?.toLowerCase() === 'admin'
  );

  const loadConversations = async () => {
    try {
      const response = await axiosInstance.get('/api/support/conversations');
      setConversations(response.data.data || []);
      if (activeConversation) {
        const current = await axiosInstance.get(`/api/support/conversations/${activeConversation.conversationId}`);
        setActiveConversation(current.data.data);
      }
    } catch (err) {
      setSupportError(err.response?.data?.message || 'Unable to load support conversations.');
    } finally {
      setSupportLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
    const interval = window.setInterval(loadConversations, 30000);
    return () => window.clearInterval(interval);
  }, [axiosInstance]);

  const openConversation = async (conversation) => {
    try {
      const response = await axiosInstance.get(`/api/support/conversations/${conversation.conversationId}`);
      setActiveConversation(response.data.data);
    } catch (err) {
      setSupportError(err.response?.data?.message || 'Unable to open conversation.');
    }
  };

  const sendSupportMessage = async (event) => {
    event.preventDefault();
    if (!supportMessage.trim()) return;
    setSupportSending(true);
    try {
      const endpoint = activeConversation
        ? `/api/support/conversations/${activeConversation.conversationId}/messages`
        : '/api/support/conversations';
      const payload = activeConversation
        ? { message: supportMessage }
        : { subject: supportSubject, message: supportMessage };
      const response = await axiosInstance.post(endpoint, payload);
      if (activeConversation) {
        setActiveConversation(response.data.data);
      } else {
        setActiveConversation(response.data.data);
      }
      setSupportMessage('');
      setSupportSubject('');
      await loadConversations();
    } catch (err) {
      setSupportError(err.response?.data?.message || 'Unable to send support message.');
    } finally {
      setSupportSending(false);
    }
  };

  const startNewConversation = () => {
    setActiveConversation(null);
    setSupportSubject('');
    setSupportMessage('');
    setSupportError(null);
  };

  useEffect(() => {
    const fetchFaqs = async () => {
      try {
        const response = await axiosInstance.get('/api/ai/support/faqs');
        if (response.data.success) {
          setFaqs(response.data.data || []);
        }
      } catch (err) {
        console.error('Failed to load FAQs', err);
      }
    };
    fetchFaqs();
  }, [axiosInstance]);

  const handleAskQuestion = async () => {
    if (!question.trim()) {
      setError('Please type a question before submitting.');
      return;
    }

    setLoading(true);
    setError(null);
    setAnswer(null);

    try {
      const response = await axiosInstance.post('/api/ai/support/query', { question });
      if (response.data.success) {
        setAnswer(response.data.data);
      } else {
        setError(response.data.message || 'Unable to fetch answer.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to fetch answer.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTrainingEntry = () => {
    if (!newFaqQuestion.trim() || !newFaqAnswer.trim()) {
      setTrainError('Both question and answer are required for training entries.');
      return;
    }

    setTrainingEntries((current) => [
      ...current,
      { question: newFaqQuestion.trim(), answer: newFaqAnswer.trim() },
    ]);
    setNewFaqQuestion('');
    setNewFaqAnswer('');
    setTrainError(null);
  };

  const handleTrainSupport = async () => {
    if (trainingEntries.length === 0) {
      setTrainError('Add at least one training entry before submitting.');
      return;
    }

    setTrainLoading(true);
    setTrainError(null);
    setTrainSuccess(null);

    try {
      const response = await axiosInstance.post('/api/ai/support/train', { entries: trainingEntries });
      if (response.data.success) {
        setTrainSuccess('Support training data submitted successfully.');
        setTrainingEntries([]);
        const refreshedFaqs = await axiosInstance.get('/api/ai/support/faqs');
        if (refreshedFaqs.data.success) {
          setFaqs(refreshedFaqs.data.data || []);
        }
      } else {
        setTrainError(response.data.message || 'Unable to train support model.');
      }
    } catch (err) {
      setTrainError(err.response?.data?.message || 'Unable to train support model.');
    } finally {
      setTrainLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Support center</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Talk to CloudFarm administrators about complaints, questions, and technical issues.
            </p>
          </div>
          {getWhatsappUrl() && <a href={getWhatsappUrl()} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700"><FiMessageCircle /> WhatsApp support</a>}
        </div>

        {supportError && <Alert type="error" message={supportError} closeable onClose={() => setSupportError(null)} />}

        <Card>
          <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
            <div className="border-b border-gray-200 pb-4 lg:border-b-0 lg:border-r lg:pr-5 dark:border-gray-700">
              <div className="mb-4 flex items-center justify-between"><h2 className="font-bold text-gray-900 dark:text-white">Conversations</h2><button type="button" onClick={startNewConversation} className="rounded-lg p-2 text-emerald-700 hover:bg-emerald-50" title="New conversation" aria-label="New conversation"><FiPlus /></button></div>
              {supportLoading ? <p className="text-sm text-gray-500">Loading conversations...</p> : conversations.length === 0 ? <p className="text-sm leading-6 text-gray-500">No conversations yet. Start a conversation when you need help.</p> : <div className="space-y-2">{conversations.map((conversation) => <button type="button" key={conversation.conversationId} onClick={() => openConversation(conversation)} className={`w-full rounded-lg p-3 text-left ${activeConversation?.conversationId === conversation.conversationId ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}><div className="flex items-center justify-between gap-2"><span className="truncate text-sm font-semibold text-gray-900 dark:text-white">{conversation.subject}</span><span className="text-[10px] uppercase text-gray-500">{conversation.status}</span></div><p className="mt-1 truncate text-xs text-gray-500">{conversation.lastMessage}</p><p className="mt-1 text-[10px] text-gray-400">{new Date(conversation.lastMessageAt).toLocaleString()}</p></button>)}</div>}
            </div>
            <div className="flex min-h-[390px] flex-col">
              {activeConversation ? <><div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-4 dark:border-gray-700"><div><h2 className="font-bold text-gray-900 dark:text-white">{activeConversation.subject}</h2><span className="text-xs uppercase text-gray-500">{activeConversation.status}</span></div><button type="button" onClick={startNewConversation} className="text-sm font-semibold text-emerald-700">New conversation</button></div><div className="flex-1 space-y-3 overflow-y-auto pr-1">{activeConversation.messages.map((item) => <div key={item._id} className={`flex ${item.senderRole === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] rounded-2xl px-4 py-3 ${item.senderRole === 'user' ? 'rounded-br-sm bg-emerald-600 text-white' : 'rounded-bl-sm bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100'}`}><p className="whitespace-pre-wrap text-sm">{item.message}</p><p className={`mt-2 text-[10px] ${item.senderRole === 'user' ? 'text-emerald-100' : 'text-gray-400'}`}>{new Date(item.createdAt).toLocaleString()}</p></div></div>)}</div></> : <div className="flex flex-1 flex-col justify-center"><div className="mb-5"><h2 className="text-xl font-bold text-gray-900 dark:text-white">Start a support conversation</h2><p className="mt-1 text-sm text-gray-500">Describe the issue and an administrator can follow up here.</p></div><Input label="Subject" value={supportSubject} onChange={(event) => setSupportSubject(event.target.value)} placeholder="What do you need help with?" required /></div>}
              <form onSubmit={sendSupportMessage} className="mt-4 flex gap-2 border-t border-gray-200 pt-4 dark:border-gray-700"><textarea value={supportMessage} onChange={(event) => setSupportMessage(event.target.value)} rows={2} className="min-w-0 flex-1 rounded-lg border-2 border-gray-300 bg-white p-3 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white" placeholder={activeConversation?.status === 'closed' ? 'Conversation closed' : 'Write a message...'} disabled={supportSending || activeConversation?.status === 'closed'} required /><Button type="submit" disabled={supportSending || activeConversation?.status === 'closed' || (!activeConversation && !supportSubject.trim())} className="self-end"><FiSend /> {supportSending ? 'Sending' : 'Send'}</Button></form>
            </div>
          </div>
        </Card>

        {error && <Alert type="error" message={error} closeable onClose={() => setError(null)} />}

        {/* <Card>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Ask a question
              </label>
              <textarea
                rows={5}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="w-full rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-4 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-900"
                placeholder="For example: How do I export livestock data?"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-end">
              <Button variant="secondary" onClick={() => { setQuestion(''); setAnswer(null); setError(null); }}>
                Clear
              </Button>
              <Button variant="primary" onClick={handleAskQuestion} disabled={loading}>
                {loading ? 'Searching...' : 'Ask Support AI'}
              </Button>
            </div>
          </div>
        </Card> */}

        {answer && (
          <Card className="border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20">
            <h2 className="text-xl font-semibold text-emerald-900 dark:text-emerald-100 mb-3">Answer</h2>
            <p className="text-gray-800 dark:text-gray-200 leading-relaxed">
              {answer.answer}
            </p>
            {answer.sourceQuestion && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                Matched question: <span className="font-medium">{answer.sourceQuestion}</span>
              </p>
            )}
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Confidence: {(answer.confidence * 100).toFixed(0)}%
            </p>
          </Card>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Frequently Asked Questions</h2>
            <div className="space-y-3">
              {faqs.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">No FAQs available yet.</p>
              ) : (
                faqs.slice(0, 6).map((faq, index) => (
                  <div key={index} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{faq.question}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">{faq.answer}</p>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* <Card>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">How to use support AI</h2>
            <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-300 space-y-2">
              <li>Ask a precise question about farm management or platform workflows.</li>
              <li>Use the suggested wording if the answer is too generic.</li>
              <li>The model learns from your support training entries over time.</li>
            </ul>
          </Card> */}
        </div>

        {/* {canTrainSupport && (
          <Card>
            <div className="flex items-center justify-between mb-4 gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Support Training Panel</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Add question-answer pairs to help the AI answer support requests more accurately.
                </p>
              </div>
              <div className="rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-200 text-xs font-semibold px-3 py-1">
                Manager/Admin Only
              </div>
            </div>

            {trainError && <Alert type="error" message={trainError} closeable onClose={() => setTrainError(null)} />}
            {trainSuccess && <Alert type="success" message={trainSuccess} closeable onClose={() => setTrainSuccess(null)} />}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              <Input
                label="Training question"
                placeholder="Example: How do I add a new animal?"
                value={newFaqQuestion}
                onChange={(e) => setNewFaqQuestion(e.target.value)}
                fullWidth
              />
              <Input
                label="Training answer"
                placeholder="Example: Go to Livestock and click Add Animal."
                value={newFaqAnswer}
                onChange={(e) => setNewFaqAnswer(e.target.value)}
                fullWidth
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-end mb-4">
              <Button variant="secondary" onClick={handleAddTrainingEntry}>
                Add Entry
              </Button>
              <Button variant="primary" onClick={handleTrainSupport} disabled={trainLoading}>
                {trainLoading ? 'Training...' : 'Submit Training Data'}
              </Button>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Pending Training Entries</h3>
              {trainingEntries.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No entries added yet.</p>
              ) : (
                <div className="space-y-3">
                  {trainingEntries.map((entry, index) => (
                    <div key={index} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{entry.question}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">{entry.answer}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        )} */}
      </div>
    </MainLayout>
  );
};

export default SupportPage;
