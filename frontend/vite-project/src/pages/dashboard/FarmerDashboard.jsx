import React, { useState, useEffect, useContext } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import {
  FiTrendingUp,
  FiShoppingCart,
  FiDollarSign,
  FiAlertCircle,
} from 'react-icons/fi';
import MainLayout from '../../components/layout/MainLayout';
import Card from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import Table from '../../components/ui/Table';
import { AuthContext } from '../../context/AuthContext';
import axios from 'axios';

/**
 * Farmer Dashboard - Main overview page
 */
const FarmerDashboardPage = () => {
  const [stats, setStats] = useState({
    totalAnimals: 0,
    totalLivestock: 0,
    totalPoultry: 0,
    totalRevenue: 0,
    totalExpenses: 0,
    mortalityRate: 0,
    farmProfit: 0,
  });
  const [monthlyData, setMonthlyData] = useState([]);
  const [feedTrend, setFeedTrend] = useState([]);
  const [mortalityTrend, setMortalityTrend] = useState([]);
  const [activities, setActivities] = useState([]);
  const { userData, backendUrl } = useContext(AuthContext);

  const activityColumns = [
    { key: 'title', label: 'Activity' },
    { key: 'description', label: 'Description' },
    { key: 'timestamp', label: 'Time' },
  ];

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);

  const safeArray = (response) => {
    if (!response || !response.data) return [];
    if (Array.isArray(response.data.data)) return response.data.data;
    if (Array.isArray(response.data.message)) return response.data.message;
    return [];
  };

  const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const getMonthLabel = (dateString) => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleString('default', { month: 'short' });
  };

  const buildMonthlyData = (sales, expenses) => {
    const map = new Map();

    sales.forEach((sale) => {
      const month = getMonthLabel(sale.date);
      if (!month) return;
      const value = Number(sale.totalAmount || sale.quantity * sale.unitPrice || 0);
      const current = map.get(month) || { month, sales: 0, expenses: 0 };
      current.sales += value;
      map.set(month, current);
    });

    expenses.forEach((expense) => {
      const month = getMonthLabel(expense.date);
      if (!month) return;
      const value = Number(expense.amount || 0);
      const current = map.get(month) || { month, sales: 0, expenses: 0 };
      current.expenses += value;
      map.set(month, current);
    });

    return Array.from(map.values()).sort(
      (a, b) => monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month)
    );
  };

  const buildFeedTrend = (feeds) => {
    const map = new Map();
    feeds.forEach((feed) => {
      const date = new Date(feed.purchaseDate);
      if (Number.isNaN(date.getTime())) return;
      const key = date.toISOString().split('T')[0];
      const current = map.get(key) || 0;
      map.set(key, current + Number(feed.consumption || 0));
    });
    return Array.from(map.entries())
      .map(([date, consumption]) => ({ date, consumption }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  const buildMortalityTrend = (poultry) => {
    const map = new Map();
    poultry.forEach((batch) => {
      const date = new Date(batch.purchaseDate);
      if (Number.isNaN(date.getTime())) return;
      const week = `Week ${Math.ceil(date.getDate() / 7)}`;
      const current = map.get(week) || { week, poultry: 0, livestock: 0 };
      current.poultry += Number(batch.mortality || 0);
      map.set(week, current);
    });
    if (map.size === 0) {
      return [{ week: 'Week 1', poultry: 0, livestock: 0 }];
    }
    return Array.from(map.values());
  };

  const buildActivityFeed = (sales, expenses) => {
    const activity = [];

    sales.forEach((sale) => {
      if (!sale.date) return;
      activity.push({
        id: `sale-${sale._id || sale.id || sale.invoiceId}`,
        title: 'Sale Completed',
        description: `${sale.product || 'Product'} sold for ${formatCurrency(
          Number(sale.totalAmount || sale.quantity * sale.unitPrice || 0)
        )}`,
        timestamp: new Date(sale.date).toLocaleString(),
      });
    });

    expenses.forEach((expense) => {
      if (!expense.date) return;
      activity.push({
        id: `expense-${expense._id || expense.id || expense.title}`,
        title: 'Expense Recorded',
        description: `${expense.title}: ${formatCurrency(Number(expense.amount || 0))}`,
        timestamp: new Date(expense.date).toLocaleString(),
      });
    });

    return activity
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 6);
  };

  const calculateMortalityRate = (poultry) => {
    const totalQuantity = poultry.reduce((sum, batch) => sum + Number(batch.quantity || 0), 0);
    const totalMortality = poultry.reduce((sum, batch) => sum + Number(batch.mortality || 0), 0);
    if (!totalQuantity) return 0;
    return Number(((totalMortality / (totalQuantity + totalMortality)) * 100).toFixed(2));
  };

  const getPeriodChange = (field) => {
    if (monthlyData.length < 2) return null;
    const sorted = [...monthlyData].sort((a, b) => monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month));
    const latest = sorted[sorted.length - 1];
    const previous = sorted[sorted.length - 2];
    const latestValue = Number(latest[field] || 0);
    const previousValue = Number(previous[field] || 0);
    const diff = latestValue - previousValue;
    if (diff === 0) return null;
    const trend = diff > 0 ? 'up' : 'down';
    if (previousValue === 0) {
      return {
        change: `${diff > 0 ? '+' : '-'}${formatCurrency(Math.abs(diff))}`,
        trend,
      };
    }
    const percentage = ((Math.abs(diff) / previousValue) * 100).toFixed(2);
    return {
      change: `${diff > 0 ? '+' : '-'}${percentage}%`,
      trend,
    };
  };

  useEffect(() => {
    const fetchDashboardMetrics = async () => {
      try {
        const [poultryResponse, livestockResponse, salesResponse, expenseResponse, feedResponse] = await Promise.all([
          axios.get(`${backendUrl}/api/poultry/list`, { withCredentials: true }),
          axios.get(`${backendUrl}/api/livestock/list`, { withCredentials: true }),
          axios.get(`${backendUrl}/api/sell/list`, { withCredentials: true }),
          axios.get(`${backendUrl}/api/expense/list`, { withCredentials: true }),
          axios.get(`${backendUrl}/api/feed/feed`, { withCredentials: true }),
        ]);

        const poultry = safeArray(poultryResponse);
        const livestock = safeArray(livestockResponse);
        const sales = safeArray(salesResponse);
        const expenses = safeArray(expenseResponse);
        const feeds = safeArray(feedResponse);

        const totalPoultry = poultry.reduce((sum, batch) => sum + Number(batch.quantity || 0), 0);
        const totalLivestock = livestock.reduce((sum, animal) => sum + (Number(animal.quantity) || 1), 0);
        const totalAnimals = totalPoultry + totalLivestock;
        const totalRevenue = sales.reduce(
          (sum, sale) => sum + Number(sale.totalAmount || sale.quantity * sale.unitPrice || 0),
          0
        );
        const totalProfit = sales.reduce((sum, sale) => sum + Number(sale.profit || 0), 0);
        const totalExpenses = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
        const farmProfit = totalProfit - totalExpenses;
        const mortalityRate = calculateMortalityRate(poultry);

        setStats({
          totalAnimals,
          totalLivestock,
          totalPoultry,
          totalRevenue,
          farmProfit,
          totalExpenses,
          mortalityRate,
        });
        setMonthlyData(buildMonthlyData(sales, expenses));
        setFeedTrend(buildFeedTrend(feeds));
        setMortalityTrend(buildMortalityTrend(poultry));
        setActivities(buildActivityFeed(sales, expenses));
      } catch (error) {
        console.error('Failed to load dashboard metrics', error);
      }
    };

    if (backendUrl) {
      fetchDashboardMetrics();
    }
  }, [backendUrl]);

  const revenueTrend = getPeriodChange('sales');
  const expenseTrend = getPeriodChange('expenses');

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Farm Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Welcome {userData?.name}! Here's your farm overview.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          <StatCard icon={FiShoppingCart} label="Total Animals" value={stats.totalAnimals} />
          <StatCard icon={FiTrendingUp} label="Total Livestock" value={stats.totalLivestock} />
          <StatCard icon={FiDollarSign} label="Total Poultry" value={stats.totalPoultry} />
          <StatCard
            icon={FiDollarSign}
            label="Total Revenue"
            value={`${formatCurrency(stats.totalRevenue)}`}
            change={revenueTrend?.change}
            trend={revenueTrend?.trend}
          />
          <StatCard
            icon={FiAlertCircle}
            label="Total Expenses"
            value={`${formatCurrency(stats.totalExpenses)}`}
            change={expenseTrend?.change}
            trend={expenseTrend?.trend}
          />
            <StatCard
            icon={FiDollarSign}
            label="Farm Profit"
            value={`${formatCurrency(stats.farmProfit)}`}
            change={revenueTrend?.change}
            trend={revenueTrend?.trend}
          />

          <StatCard icon={FiAlertCircle} label="Mortality Rate" value={`${stats.mortalityRate}%`} />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Monthly Revenue & Expenses</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="sales" fill="#10b981" name="Sales" />
                <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Weekly Feed Consumption</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={feedTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="consumption"
                  stroke="#3b82f6"
                  name="Consumption (kg)"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card className="lg:col-span-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Mortality Trends</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={mortalityTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="poultry"
                  stroke="#f59e0b"
                  name="Poultry"
                  strokeWidth={2}
                  dot={{ fill: '#f59e0b', r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="livestock"
                  stroke="#ef4444"
                  name="Livestock"
                  strokeWidth={2}
                  dot={{ fill: '#ef4444', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>

        <Card>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
          </div>
          <Table columns={activityColumns} data={activities} />
        </Card>
      </div>
    </MainLayout>
  );
};

export default FarmerDashboardPage;
