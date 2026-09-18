import React, { useState, useEffect, useContext } from 'react';
import { FiUsers, FiTrendingUp, FiCheckCircle, FiDollarSign, FiDatabase } from 'react-icons/fi';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import axios from 'axios';
import MainLayout from '../../components/layout/MainLayout';
import Card from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { AuthContext } from '../../context/AuthContext';

/**
 * Admin Super Dashboard - Platform overview
 */
const AdminDashboardPage = () => {
  const { backendUrl } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [sales, setSales] = useState([]);
  const [revenueData, setRevenueData] = useState([]);
  const [userGrowthData, setUserGrowthData] = useState([]);
  const [activities, setActivities] = useState([]);
  const [emailActivity, setEmailActivity] = useState([]);
  const [backups, setBackups] = useState([]);
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupMessage, setBackupMessage] = useState('');
  const [emailFilter, setEmailFilter] = useState('all');
  const [emailStatusFilter, setEmailStatusFilter] = useState('all');
  const [emailSearch, setEmailSearch] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [actionLoading, setActionLoading] = useState(null);
  const [subscriptionAnalytics, setSubscriptionAnalytics] = useState(null);
  const [analyticsRange, setAnalyticsRange] = useState('last30');
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState('');
  const baseUrl = backendUrl || import.meta.env.VITE_BACKEND_URL || '';
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeFarms: 0,
    totalRevenue: 0,
    marketplaceSales: 0,
  });

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);

  const getMonthLabel = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleString('default', { month: 'short' });
  };

  const safeArray = (response) => {
    if (!response || !response.data) return [];
    if (Array.isArray(response.data)) return response.data;
    if (Array.isArray(response.data.users)) return response.data.users;
    if (Array.isArray(response.data.data)) return response.data.data;
    if (Array.isArray(response.data.emails)) return response.data.emails;
    if (Array.isArray(response.data.message)) return response.data.message;
    return [];
  };

  const buildActivityFeed = (userList, salesList) => {
    const activity = [];

    userList.forEach((user) => {
      if (!user.createdAt) return;
      activity.push({
        id: `user-${user._id || user.id}`,
        title: 'New User Registered',
        description: `${user.name || user.email || 'Unknown user'} joined as ${user.role || 'User'}`,
        timestamp: new Date(user.createdAt).toISOString(),
      });
    });

    salesList.forEach((sale) => {
      const dateValue = sale.date || sale.createdAt || sale.updatedAt;
      if (!dateValue) return;
      activity.push({
        id: `sale-${sale._id || sale.id || sale.invoiceId}`,
        title: 'Marketplace Sale',
        description: `${sale.animalType || sale.product || 'Item'} sold for ${formatCurrency(Number(sale.totalAmount || sale.pricePerUnit || 0))}`,
        timestamp: new Date(dateValue).toISOString(),
      });
    });

    return activity
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 8);
  };

  const activityColumns = [
    { key: 'title', label: 'Activity' },
    { key: 'description', label: 'Details' },
    {
      key: 'timestamp',
      label: 'Time',
      render: (value) => new Date(value).toLocaleString(),
    },
  ];

  const handleToggleSuspend = async (row) => {
    const userId = row.id;
    const action = row.status === 'active' ? 'suspend' : 'activate';
    try {
      setActionLoading(userId);
      await axios.put(`${baseUrl}/api/user/${action}/${userId}`, null, {
        withCredentials: true,
      });
      setUsers((prev) =>
        prev.map((user) => {
          if (user._id === userId || user.id === userId) {
            return {
              ...user,
              isAccountVerified: action === 'activate',
            };
          }
          return user;
        })
      );
      setActionLoading(null);
    } catch (error) {
      console.error(`Failed to ${action} user`, error);
      setActionLoading(null);
    }
  };

  const buildRevenueChart = (salesList) => {
    const monthMap = new Map();
    salesList.forEach((sale) => {
      const month = getMonthLabel(sale.date || sale.createdAt || sale.updatedAt);
      if (!month) return;
      const revenue = Number(sale.totalAmount || sale.pricePerUnit || 0);
      const entry = monthMap.get(month) || { month, revenue: 0, sales: 0 };
      entry.revenue += revenue;
      entry.sales += 1;
      monthMap.set(month, entry);
    });

    const orderedMonths = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];

    return orderedMonths
      .map((month) => monthMap.get(month))
      .filter(Boolean);
  };

  const buildUserGrowth = (userList) => {
    const monthMap = new Map();
    userList.forEach((user) => {
      const month = getMonthLabel(user.createdAt || user.updatedAt);
      if (!month) return;
      const entry = monthMap.get(month) || { month, users: 0 };
      entry.users += 1;
      monthMap.set(month, entry);
    });

    const orderedMonths = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];

    return orderedMonths
      .map((month) => monthMap.get(month))
      .filter(Boolean);
  };

  const getAnalyticsDates = () => {
    const end = new Date();
    const start = new Date(end);
    if (analyticsRange === 'today') start.setHours(0, 0, 0, 0);
    if (analyticsRange === 'last7') start.setDate(start.getDate() - 6);
    if (analyticsRange === 'last30') start.setDate(start.getDate() - 29);
    if (analyticsRange === 'thisMonth') start.setDate(1);
    if (analyticsRange === 'lastMonth') {
      start.setMonth(start.getMonth() - 1, 1);
      end.setDate(0);
    }
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  };

  const fetchSubscriptionAnalytics = async () => {
    setAnalyticsLoading(true);
    setAnalyticsError('');
    try {
      const dates = getAnalyticsDates();
      const response = await axios.get(`${baseUrl}/api/payment/admin/revenue-analytics`, { params: dates, withCredentials: true });
      setSubscriptionAnalytics(response.data.data);
    } catch (error) {
      setAnalyticsError(error.response?.data?.message || 'Unable to load subscription revenue analytics.');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const [usersResult, salesResult, emailResult, backupResult, salesSummaryResult] = await Promise.allSettled([
          axios.get(`${baseUrl}/api/user/users`, { withCredentials: true }),
          axios.get(`${baseUrl}/api/sell/list`, { withCredentials: true }),
          axios.get(`${baseUrl}/api/dashboard/email-activity?limit=8`, { withCredentials: true }),
          axios.get(`${baseUrl}/api/backup/list`, { withCredentials: true }),
          axios.get(`${baseUrl}/api/dashboard/admin/sales-summary`, { withCredentials: true }),
        ]);

        const fetchedUsers = usersResult.status === 'fulfilled' ? safeArray(usersResult.value) : [];
        const fetchedSales = salesResult.status === 'fulfilled' ? safeArray(salesResult.value) : [];
        const fetchedEmailActivity = emailResult.status === 'fulfilled' ? safeArray(emailResult.value) : [];
        const fetchedBackups = backupResult.status === 'fulfilled' ? safeArray(backupResult.value) : [];
        const salesSummary = salesSummaryResult.status === 'fulfilled' ? salesSummaryResult.value.data?.data || {} : {};

        const totalRevenue = fetchedSales.reduce(
          (sum, sale) => sum + Number(sale.totalAmount || sale.pricePerUnit || 0),
          0
        );

        const activeFarmsCount = fetchedUsers.filter(
          (user) => user.role && user.role !== 'admin'
        ).length;

        setUsers(fetchedUsers);
        setSales(fetchedSales);
        setEmailActivity(fetchedEmailActivity);
        setBackups(fetchedBackups);
        setStats({
          totalUsers: fetchedUsers.length,
          activeFarms: activeFarmsCount,
          totalRevenue: Number(salesSummary.totalRevenue ?? totalRevenue),
          marketplaceSales: Number(salesSummary.marketplaceSales ?? fetchedSales.length),
        });
        setRevenueData(buildRevenueChart(fetchedSales));
        setUserGrowthData(buildUserGrowth(fetchedUsers));
        setActivities(buildActivityFeed(fetchedUsers, fetchedSales));

        [usersResult, salesResult, emailResult, backupResult, salesSummaryResult]
          .filter((result) => result.status === 'rejected')
          .forEach((result) => console.error('Admin dashboard request failed:', result.reason));
      } catch (error) {
        console.error('Failed to load admin dashboard data', error);
      }
    };

    if (!baseUrl) return;

    fetchAdminData();
    fetchSubscriptionAnalytics();
    const polling = setInterval(fetchAdminData, 15000);
    return () => clearInterval(polling);
  }, [baseUrl]);

  useEffect(() => {
    if (baseUrl) fetchSubscriptionAnalytics();
  }, [analyticsRange, baseUrl]);

  useEffect(() => {
    const ticking = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(ticking);
  }, []);

  const refreshBackups = async () => {
    try {
      const backupListResponse = await axios.get(`${baseUrl}/api/backup/list`, { withCredentials: true });
      setBackups(safeArray(backupListResponse));
    } catch (error) {
      console.error('Failed to refresh backups', error);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setBackupLoading(true);
      setBackupMessage('');
      const response = await axios.post(`${baseUrl}/api/backup/create`, {}, { withCredentials: true });
      const message = response?.data?.message || 'Backup created successfully';
      setBackupMessage(message);
      await refreshBackups();
    } catch (error) {
      const message = error?.response?.data?.message || 'Failed to create backup';
      setBackupMessage(message);
      console.error('Backup creation failed', error);
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestoreBackup = async (backupName) => {
    try {
      setBackupLoading(true);
      setBackupMessage('');
      const response = await axios.post(`${baseUrl}/api/backup/restore`, { backupName }, { withCredentials: true });
      setBackupMessage(response?.data?.message || 'Backup restored successfully');
    } catch (error) {
      const message = error?.response?.data?.message || 'Failed to restore backup';
      setBackupMessage(message);
      console.error('Backup restore failed', error);
    } finally {
      setBackupLoading(false);
    }
  };

  const handleCleanupBackups = async () => {
    try {
      setBackupLoading(true);
      setBackupMessage('');
      const response = await axios.post(`${baseUrl}/api/backup/cleanup`, {}, { withCredentials: true });
      setBackupMessage(response?.data?.message || 'Backup cleanup completed');
      await refreshBackups();
    } catch (error) {
      const message = error?.response?.data?.message || 'Failed to cleanup backups';
      setBackupMessage(message);
      console.error('Backup cleanup failed', error);
    } finally {
      setBackupLoading(false);
    }
  };

  const tableUsers = users.map((user) => ({
    id: user._id || user.id,
    name: user.name,
    email: user.email,
    role: user.role || 'User',
    farm: user.farmName || user.farmId || 'N/A',
    status: String(user.isAccountVerified) === 'true' || user.isAccountVerified === true ? 'active' : 'inactive',
    joinedDate: user.createdAt
      ? new Date(user.createdAt).toLocaleDateString()
      : user.createdAt || '-',
  }));

  const filteredEmailActivity = emailActivity.filter((item) => {
    const matchesType = emailFilter === 'all' || item.type === emailFilter;
    const matchesStatus = emailStatusFilter === 'all' || item.status === emailStatusFilter;
    const searchValue = emailSearch.trim().toLowerCase();
    const matchesSearch = !searchValue || [item.type, item.subject, item.recipient, item.status]
      .join(' ')
      .toLowerCase()
      .includes(searchValue);

    return matchesType && matchesStatus && matchesSearch;
  });

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Platform overview and management</p>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Live time: <span className="font-semibold text-gray-800 dark:text-gray-100">{currentTime.toLocaleTimeString()}</span>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={FiUsers} label="Total Users" value={stats.totalUsers} />
          <StatCard icon={FiTrendingUp} label="Active Farms" value={stats.activeFarms} />
          <StatCard icon={FiDollarSign} label="Total Revenue" value={formatCurrency(stats.totalRevenue)} />
          <StatCard icon={FiCheckCircle} label="Marketplace Sales" value={stats.marketplaceSales} />
        </div>

        <Card>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div><h3 className="text-lg font-bold text-gray-900 dark:text-white">Subscription revenue analytics</h3><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Successful, processed subscription payments only.</p></div>
            <select value={analyticsRange} onChange={(event) => setAnalyticsRange(event.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white">
              <option value="today">Today</option><option value="last7">Last 7 days</option><option value="last30">Last 30 days</option><option value="thisMonth">This month</option><option value="lastMonth">Last month</option>
            </select>
          </div>
          {analyticsLoading && <p className="mt-6 text-sm text-gray-500">Loading subscription analytics...</p>}
          {analyticsError && <p className="mt-6 rounded-lg bg-red-50 p-3 text-sm text-red-700">{analyticsError}</p>}
          {!analyticsLoading && !analyticsError && subscriptionAnalytics && <>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard icon={FiDollarSign} label="Subscription Revenue" value={formatCurrency(subscriptionAnalytics.totalRevenue)} />
              <StatCard icon={FiCheckCircle} label="Successful Payments" value={subscriptionAnalytics.successfulPayments} />
              <StatCard label="Active Starter" value={subscriptionAnalytics.subscriptionsByPlan?.starter || 0} />
              <StatCard label="Active Basic / Premium" value={`${subscriptionAnalytics.subscriptionsByPlan?.basic || 0} / ${subscriptionAnalytics.subscriptionsByPlan?.premium || 0}`} />
            </div>
            <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div><h4 className="mb-3 font-semibold text-gray-900 dark:text-white">Revenue over time</h4><ResponsiveContainer width="100%" height={260}><LineChart data={subscriptionAnalytics.revenueOverTime || []}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="period" /><YAxis /><Tooltip formatter={(value) => formatCurrency(value)} /><Line type="monotone" dataKey="revenue" stroke="#059669" strokeWidth={3} dot={false} name="Revenue" /></LineChart></ResponsiveContainer></div>
              <div><h4 className="mb-3 font-semibold text-gray-900 dark:text-white">Revenue by plan</h4><ResponsiveContainer width="100%" height={260}><BarChart data={['starter', 'basic', 'premium'].map((plan) => ({ plan: plan.charAt(0).toUpperCase() + plan.slice(1), revenue: subscriptionAnalytics.revenueByPlan?.[plan] || 0 }))}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="plan" /><YAxis /><Tooltip formatter={(value) => formatCurrency(value)} /><Bar dataKey="revenue" fill="#10b981" name="Revenue" /></BarChart></ResponsiveContainer></div>
            </div>
            <div className="mt-6"><h4 className="mb-3 font-semibold text-gray-900 dark:text-white">Active subscriptions by plan</h4><ResponsiveContainer width="100%" height={230}><BarChart data={['starter', 'basic', 'premium'].map((plan) => ({ plan: plan.charAt(0).toUpperCase() + plan.slice(1), subscriptions: subscriptionAnalytics.subscriptionsByPlan?.[plan] || 0 }))}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="plan" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="subscriptions" fill="#047857" name="Active subscriptions" /></BarChart></ResponsiveContainer></div>
          </>}
          {!analyticsLoading && !analyticsError && subscriptionAnalytics && subscriptionAnalytics.successfulPayments === 0 && <p className="mt-5 text-sm text-gray-500">No successful subscription payments in this date range.</p>}
        </Card>

        {/* Revenue Chart */}
        <Card>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Revenue Overview</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value, name) => {
                if (name === 'Revenue') return [formatCurrency(value), name];
                return [value, name];
              }} />
              <Legend />
              <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
              <Bar dataKey="sales" fill="#f09c0a" name="Sales" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* User Growth */}
        <Card>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">User Growth Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={userGrowthData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="users" stroke="#10b981" strokeWidth={2} name="User Signups" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Users Management */}
        <Card>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Users Management</h3>
            <Button variant="outline" size="sm">View All Users</Button>
          </div>

          <Table
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'email', label: 'Email' },
              { key: 'role', label: 'Role', render: (val) => <Badge variant="info">{val}</Badge> },
              { key: 'farm', label: 'Farm' },
              {
                key: 'status',
                label: 'Status',
                render: (val) => <Badge variant={val === 'active' ? 'success' : 'default'}>{val}</Badge>,
              },
            ]}
            data={tableUsers}
            actions={(row) => {
              const isActive = row.status === 'active';
              return [
                <Button
                  key={`toggle-${row.id}`}
                  variant={isActive ? 'danger' : 'success'}
                  size="sm"
                  onClick={() => handleToggleSuspend(row)}
                  disabled={actionLoading === row.id}
                >
                  {actionLoading === row.id
                    ? isActive
                      ? 'Suspending...'
                      : 'Activating...'
                    : isActive
                    ? 'Suspend'
                    : 'Activate'}
                </Button>,
                <Button key={`view-${row.id}`} variant="ghost" size="sm">View</Button>,
              ]
            }}
          />
        </Card>

        {/* Backup Management */}
        <Card>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                <FiDatabase size={18} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Backup Management</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Create a manual backup and review recent backup snapshots.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" size="sm" onClick={handleCreateBackup} disabled={backupLoading}>
                {backupLoading ? 'Creating backup...' : 'Create Backup'}
              </Button>
              <Button variant="outline" size="sm" onClick={handleCleanupBackups} disabled={backupLoading}>
                {backupLoading ? 'Cleaning up...' : 'Cleanup Old'}
              </Button>
            </div>
          </div>

          {backupMessage && (
            <div className={`mt-4 rounded-lg border px-3 py-2 text-sm ${backupMessage.toLowerCase().includes('failed') || backupMessage.toLowerCase().includes('error') ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
              {backupMessage}
            </div>
          )}

          <div className="mt-4">
            <Table
              columns={[
                { key: 'name', label: 'Backup Name' },
                { key: 'createdAt', label: 'Created At', render: (value) => new Date(value).toLocaleString() },
                { key: 'size', label: 'Size' },
                { key: 'farmId', label: 'Target' },
              ]}
              data={backups.slice(0, 5)}
              loading={backups.length === 0 && !backupLoading}
              actions={(row) => [
                <Button
                  key={`restore-${row.name}`}
                  variant="outline"
                  size="sm"
                  onClick={() => handleRestoreBackup(row.name)}
                  disabled={backupLoading}
                >
                  Restore
                </Button>
              ]}
            />
          </div>
        </Card>

        {/* Email Activity Feed */}
        <Card>
          <div className="flex flex-col gap-4 mb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Email Activity</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Recent notifications sent through the platform.</p>
              </div>
            </div>
            <div className="flex flex-col md:flex-row gap-3">
              <input
                type="text"
                value={emailSearch}
                onChange={(event) => setEmailSearch(event.target.value)}
                placeholder="Search email activity"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <select
                value={emailFilter}
                onChange={(event) => setEmailFilter(event.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">All Types</option>
                <option value="WELCOME">Welcome</option>
                <option value="OTP">OTP</option>
                <option value="LOW_FEED_ALERT">Low Feed</option>
                <option value="UNUSUAL_EXPENSE">Unusual Expense</option>
                <option value="ANIMAL_HEALTH_ALERT">Animal Health</option>
                <option value="SUBSCRIPTION_EXPIRING">Subscription Expiring</option>
                <option value="DAILY_SUMMARY">Daily Summary</option>
              </select>
              <select
                value={emailStatusFilter}
                onChange={(event) => setEmailStatusFilter(event.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">All Status</option>
                <option value="sent">Sent</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>
          <Table
            columns={[
              { key: 'type', label: 'Type' },
              { key: 'recipient', label: 'Recipient' },
              { key: 'subject', label: 'Subject' },
              {
                key: 'status',
                label: 'Status',
                render: (val) => <Badge variant={val === 'sent' ? 'success' : 'danger'}>{val}</Badge>,
              },
              {
                key: 'createdAt',
                label: 'Time',
                render: (value) => new Date(value).toLocaleString(),
              },
            ]}
            data={filteredEmailActivity}
            loading={emailActivity.length === 0}
          />
        </Card>

        {/* Live Activity Feed */}
        <Card>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Live Activity Feed</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Real-time events and system activity.</p>
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Updated at {currentTime.toLocaleTimeString()}</span>
          </div>
          <Table columns={activityColumns} data={activities} loading={activities.length === 0 && users.length === 0} />
        </Card>

{/* 
        Marketplace Moderation
        <Card>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Marketplace Listings</h3>
            <Button variant="outline" size="sm">View All Listings</Button>
          </div>

          <Table
            columns={[
              { key: 'title', label: 'Title' },
              { key: 'seller', label: 'Seller' },
              { key: 'price', label: 'Price' },
              {
                key: 'status',
                label: 'Status',
                render: (val) => {
                  const variant = val === 'approved' ? 'success' : val === 'pending' ? 'warning' : 'error';
                  return <Badge variant={variant}>{val}</Badge>;
                },
              },
              { key: 'views', label: 'Views' },
            ]}
            data={marketplaceListings}
            actions={(row) => [
              <Button
                key="approve"
                variant="outline"
                size="sm"
                disabled={row.status !== 'pending'}
              >
                Approve
              </Button>,
              <Button key="reject" variant="danger" size="sm" disabled={row.status !== 'pending'}>
                Reject
              </Button>,
            ]}
          />
        </Card> */}

        {/* System Health */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">System Health</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">API Status</span>
                <Badge variant="success">Operational</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">Database</span>
                <Badge variant="success">Healthy</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">Server Load</span>
                <Badge variant="success">Normal</Badge>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Support Tickets</h3>
            <div className="space-y-3">
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <p className="font-semibold text-yellow-900 dark:text-yellow-100">12 Open Tickets</p>
                <p className="text-sm text-yellow-800 dark:text-yellow-200">Avg response time: 2.5h</p>
              </div>
              <Button variant="primary" fullWidth size="sm">View Support Queue</Button>
            </div>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default AdminDashboardPage;
