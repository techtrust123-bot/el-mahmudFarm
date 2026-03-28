import { useState } from 'react';
import { FiTrendingUp, FiShoppingCart, FiDollarSign, FiBarChart2 } from 'react-icons/fi';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import MainLayout from '../../components/layout/MainLayout';
import Card from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import Table from '../../components/ui/Table';
import { AuthContext } from '../../context/AuthContext';
import { useContext } from 'react';

/**
 * Farmer Dashboard - Main overview page
 */
const FarmerDashboardPage = () => {
  const chartData = [
    { month: 'Jan', sales: 4000, expenses: 2400 },
    { month: 'Feb', sales: 3000, expenses: 1398 },
    { month: 'Mar', sales: 2000, expenses: 9800 },
    { month: 'Apr', sales: 2780, expenses: 3908 },
    { month: 'May', sales: 1890, expenses: 4800 },
    { month: 'Jun', sales: 2390, expenses: 3800 },
  ];

  const mortalityData = [
    { week: 'Wk1', poultry: 5, livestock: 2 },
    { week: 'Wk2', poultry: 4, livestock: 3 },
    { week: 'Wk3', poultry: 3, livestock: 1 },
    { week: 'Wk4', poultry: 2, livestock: 0 },
  ];

  const feedData = [
    { date: 'Mon', usage: 120 },
    { date: 'Tue', usage: 135 },
    { date: 'Wed', usage: 128 },
    { date: 'Thu', usage: 142 },
    { date: 'Fri', usage: 150 },
    { date: 'Sat', usage: 110 },
    { date: 'Sun', usage: 95 },
  ];

  const activities = [
    { id: 1, title: 'Livestock Purchased', description: '5 cattle added to herd', time: '2h ago' },
    { id: 2, title: 'Feed Stock Updated', description: 'Maize stock updated: 500kg', time: '4h ago' },
    { id: 3, title: 'Vet Checkup Completed', description: 'Regular health check', time: '1d ago' },
    { id: 4, title: 'Revenue Recorded', description: '$2,500 from egg sales', time: '2d ago' },
  ];
  const{userData} = useContext(AuthContext)

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Farm Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Welcome {userData?.name}! Here's your farm overview.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={FiShoppingCart} label="Total Animals" value="256" color="green" change="+5%" trend="up" />
          <StatCard icon={FiTrendingUp} label="Monthly Revenue" value="$12,500" color="blue" change="+12%" trend="up" />
          <StatCard icon={FiBarChart2} label="Avg Mortality Rate" value="2.3%" color="orange" change="-0.5%" trend="down" />
          <StatCard icon={FiDollarSign} label="Feed Inventory" value="2,450 kg" color="purple" change="+120kg" trend="up" />
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Revenue Chart */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Revenue vs Expenses</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="sales" stackId="1" stroke="#10b981" fill="#d1fae5" />
                <Area type="monotone" dataKey="expenses" stackId="1" stroke="#ef4444" fill="#fee2e2" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {/* Mortality Trend */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Mortality Trends</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={mortalityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="poultry" fill="#f59e0b" name="Poultry" />
                <Bar dataKey="livestock" fill="#ef4444" name="Livestock" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Feed Usage Chart */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Weekly Feed Usage</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={feedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="usage" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Recent Activities */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activities</h3>
          <Table
            columns={[
              { key: 'title', label: 'Activity' },
              { key: 'description', label: 'Description' },
              { key: 'time', label: 'Time' },
            ]}
            data={activities}
          />
        </Card>
      </div>
    </MainLayout>
  );
};

export default FarmerDashboardPage;
