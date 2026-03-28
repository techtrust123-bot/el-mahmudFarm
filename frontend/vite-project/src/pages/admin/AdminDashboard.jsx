import { useState } from 'react';
import { FiUsers, FiTrendingUp, FiCheckCircle, FiDollarSign } from 'react-icons/fi';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import MainLayout from '../../components/layout/MainLayout';
import Card from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';

/**
 * Admin Super Dashboard - Platform overview
 */
const AdminDashboardPage = () => {
  const revenueData = [
    { month: 'Jan', subscriptions: 12000, marketplace: 4000 },
    { month: 'Feb', subscriptions: 15000, marketplace: 5500 },
    { month: 'Mar', subscriptions: 18000, marketplace: 6800 },
    { month: 'Apr', subscriptions: 22000, marketplace: 8200 },
    { month: 'May', subscriptions: 25000, marketplace: 9500 },
    { month: 'Jun', subscriptions: 28000, marketplace: 11000 },
  ];

  const users = [
    { id: 1, name: 'Ahmed Hassan', email: 'ahmed@farm.com', role: 'Farmer', farms: 2, status: 'active', joinedDate: '2024-01-15' },
    { id: 2, name: 'Nneka Okafor', email: 'nneka@poultry.com', role: 'Farmer', farms: 1, status: 'active', joinedDate: '2024-01-20' },
    { id: 3, name: 'Dr. Sarah Johnson', email: 'sarah@vet.com', role: 'Veterinarian', farms: 0, status: 'active', joinedDate: '2024-02-01' },
    { id: 4, name: 'Kofi Mensah', email: 'kofi@ranch.com', role: 'Farmer', farms: 3, status: 'inactive', joinedDate: '2024-01-10' },
  ];

  const marketplaceListings = [
    { id: 1, title: 'Jersey Cows', seller: 'Ahmed Hassan', price: '$3,500', status: 'approved', views: 234, created: '2024-02-15' },
    { id: 2, title: 'Laying Hens', seller: 'Nneka Okafor', price: '$50/bird', status: 'pending', views: 0, created: '2024-02-20' },
    { id: 3, title: 'Brahman Bulls', seller: 'Kofi Mensah', price: '$5,000', status: 'rejected', views: 456, created: '2024-02-10' },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Platform overview and management</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={FiUsers} label="Total Users" value="1,247" color="blue" change="+8%" trend="up" />
          <StatCard icon={FiTrendingUp} label="Active Farms" value="456" color="green" change="+12%" trend="up" />
          <StatCard icon={FiDollarSign} label="Total Revenue" value="$156,800" color="purple" change="+18%" trend="up" />
          <StatCard icon={FiCheckCircle} label="Marketplace Sales" value="342" color="orange" change="+24%" trend="up" />
        </div>

        {/* Revenue Chart */}
        <Card>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Revenue Overview</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => `$${value}`} />
              <Legend />
              <Bar dataKey="subscriptions" fill="#10b981" name="Subscriptions" />
              <Bar dataKey="marketplace" fill="#f59e0b" name="Marketplace" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* User Growth */}
        <Card>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">User Growth Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="subscriptions" stroke="#10b981" strokeWidth={2} name="Total Users Growth" />
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
              { key: 'farms', label: 'Farms' },
              {
                key: 'status',
                label: 'Status',
                render: (val) => <Badge variant={val === 'active' ? 'success' : 'default'}>{val}</Badge>,
              },
            ]}
            data={users}
            actions={(row) => [
              <Button key="suspend" variant="danger" size="sm">Suspend</Button>,
              <Button key="view" variant="ghost" size="sm">View</Button>,
            ]}
          />
        </Card>

        {/* Marketplace Moderation */}
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
        </Card>

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
