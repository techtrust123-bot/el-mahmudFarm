import React, { useState, useEffect, useContext } from 'react';
import { FiUsers, FiTrendingUp, FiCheckCircle, FiDollarSign } from 'react-icons/fi';
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
  const [currentTime, setCurrentTime] = useState(new Date());
  const [actionLoading, setActionLoading] = useState(null);
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

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const [usersResponse, salesResponse] = await Promise.all([
          axios.get(`${baseUrl}/api/user/users`, { withCredentials: true }),
          axios.get(`${baseUrl}/api/sell/list`, { withCredentials: true }),
        ]);

        const fetchedUsers = safeArray(usersResponse);
        const fetchedSales = safeArray(salesResponse);

        const totalRevenue = fetchedSales.reduce(
          (sum, sale) => sum + Number(sale.totalAmount || sale.pricePerUnit || 0),
          0
        );

        const activeFarmsCount = fetchedUsers.filter(
          (user) => user.role && user.role !== 'admin'
        ).length;

        setUsers(fetchedUsers);
        setSales(fetchedSales);
        setStats({
          totalUsers: fetchedUsers.length,
          activeFarms: activeFarmsCount,
          totalRevenue,
          marketplaceSales: fetchedSales.length,
        });
        setRevenueData(buildRevenueChart(fetchedSales));
        setUserGrowthData(buildUserGrowth(fetchedUsers));
        setActivities(buildActivityFeed(fetchedUsers, fetchedSales));
      } catch (error) {
        console.error('Failed to load admin dashboard data', error);
      }
    };

    if (!baseUrl) return;

    fetchAdminData();
    const polling = setInterval(fetchAdminData, 15000);
    return () => clearInterval(polling);
  }, [baseUrl]);

  useEffect(() => {
    const ticking = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(ticking);
  }, []);

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
