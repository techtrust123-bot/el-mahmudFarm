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
  FiDatabase
} from 'react-icons/fi';
import MainLayout from '../../components/layout/MainLayout';
import Card from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import Table from '../../components/ui/Table';
import { AuthContext } from '../../context/AuthContext';
import { GiCow, GiChicken, GiPayMoney} from 'react-icons/gi';
import axios from 'axios';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import { Skeleton, SkeletonChart, SkeletonStats } from '../../components/common/Skeletons';


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
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState('');
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupMessage, setBackupMessage] = useState('');
  const [backups, setBackups] = useState([]);
  const { userData, backendUrl } = useContext(AuthContext);
  const baseUrl = backendUrl || import.meta.env.VITE_BACKEND_URL || '';
    const [isLoading, setIsLoading] = useState(false);
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

  const getWeekLabel = (date) => {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return null;
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const dayOfYear = Math.ceil(((d - yearStart) / 86400000) + 1);
    const weekNumber = Math.ceil((dayOfYear + yearStart.getDay()) / 7);
    return `${d.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
  };

  const buildFeedTrend = (feeds) => {
    const map = new Map();
    feeds.forEach((feed) => {
      const rawDate = feed.lastConsumptionUpdate || feed.purchaseDate || feed.createdAt;
      const week = getWeekLabel(rawDate);
      if (!week) return;
      let consumption = Number(feed.consumption || 0);
      if (!consumption) {
        const averageDaily = Number(feed.averageDailyConsumption || 0);
        if (averageDaily > 0) {
          consumption = averageDaily * 7;
        }
      }
      const current = map.get(week) || 0;
      map.set(week, current + consumption);
    });
    return Array.from(map.entries())
      .map(([week, consumption]) => ({ week, consumption }))
      .sort((a, b) => a.week.localeCompare(b.week));
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
        const [poultryResponse, livestockResponse, salesResponse, expenseResponse, feedResponse] = await Promise.allSettled([
          axios.get(`${backendUrl}/api/poultry/list`, { withCredentials: true }),
          axios.get(`${backendUrl}/api/livestock/list`, { withCredentials: true }),
          axios.get(`${backendUrl}/api/sell/list`, { withCredentials: true }),
          axios.get(`${backendUrl}/api/expense/list`, { withCredentials: true }),
          axios.get(`${backendUrl}/api/feed/feed`, { withCredentials: true }),
        ]);

        const poultry = poultryResponse.status === 'fulfilled' ? safeArray(poultryResponse.value) : [];
        const livestock = livestockResponse.status === 'fulfilled' ? safeArray(livestockResponse.value) : [];
        const sales = salesResponse.status === 'fulfilled' ? safeArray(salesResponse.value) : [];
        const expenses = expenseResponse.status === 'fulfilled' ? safeArray(expenseResponse.value) : [];
        const feeds = feedResponse.status === 'fulfilled' ? safeArray(feedResponse.value) : [];

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
        setDashboardError('');
      } catch (error) {
        setDashboardError(error.response?.data?.message || 'Unable to load farm dashboard data.');
        console.error('Failed to load dashboard metrics', error);
      } finally {
        setDashboardLoading(false);
      }
    };

    if (!backendUrl) return;
      fetchDashboardMetrics();
     // fetchSubscriptionAnalytics();
        const polling = setInterval(fetchDashboardMetrics, 150000); // 2.5 minutes
        return () => clearInterval(polling);
  }, [backendUrl]);

  const revenueTrend = getPeriodChange('sales');
  const expenseTrend = getPeriodChange('expenses');

  // const refreshBackups = async () => {
  //     try {
  //       const backupListResponse = await axios.get(`${baseUrl}/api/backup/list`, { withCredentials: true });
  //       setBackups(safeArray(backupListResponse));
  //     } catch (error) {
  //       console.error('Failed to refresh backups', error);
  //     }
  //   };
  
  //   const handleCreateBackup = async () => {
  //     try {
  //       setBackupLoading(true);
  //       setBackupMessage('');
  //       const response = await axios.post(`${baseUrl}/api/backup/create`, {}, { withCredentials: true });
  //       const message = response?.data?.message || 'Backup created successfully';
  //       setBackupMessage(message);
  //       await refreshBackups();
  //     } catch (error) {
  //       const message = error?.response?.data?.message || 'Failed to create backup';
  //       setBackupMessage(message);
  //       console.error('Backup creation failed', error);
  //     } finally {
  //       setBackupLoading(false);
  //     }
  //   };
  
  //   const handleRestoreBackup = async (backupName) => {
  //     try {
  //       setBackupLoading(true);
  //       setBackupMessage('');
  //       const response = await axios.post(`${baseUrl}/api/backup/restore`, { backupName }, { withCredentials: true });
  //       setBackupMessage(response?.data?.message || 'Backup restored successfully');
  //     } catch (error) {
  //       const message = error?.response?.data?.message || 'Failed to restore backup';
  //       setBackupMessage(message);
  //       console.error('Backup restore failed', error);
  //     } finally {
  //       setBackupLoading(false);
  //     }
  //   };
  
  //   const handleCleanupBackups = async () => {
  //     try {
  //       setBackupLoading(true);
  //       setBackupMessage('');
  //       const response = await axios.post(`${baseUrl}/api/backup/cleanup`, {}, { withCredentials: true });
  //       setBackupMessage(response?.data?.message || 'Backup cleanup completed');
  //       await refreshBackups();
  //     } catch (error) {
  //       const message = error?.response?.data?.message || 'Failed to cleanup backups';
  //       setBackupMessage(message);
  //       console.error('Backup cleanup failed', error);
  //     } finally {
  //       setBackupLoading(false);
  //     }
  //   };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Farm Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Welcome {userData?.name}! Here's your farm overview.</p>
        </div>

        {dashboardError && <Alert type="error" message={dashboardError} />}

        {/* Stats Grid */}
        {dashboardLoading ? <SkeletonStats count={7} className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4" /> : <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          <StatCard  label="Total Animals" value={stats.totalAnimals} />
          <StatCard icon={GiCow} label="Total Livestock" value={stats.totalLivestock} />
          <StatCard icon={GiChicken} label="Total Poultry" value={stats.totalPoultry} />
          <StatCard
            icon={FiDollarSign}
            label="Total Revenue"
            value={`${formatCurrency(stats.totalRevenue)}`}
            change={revenueTrend?.change}
            trend={revenueTrend?.trend}
          />
          <StatCard
            icon={GiPayMoney}
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
        </div>}

        {/* Charts Section */}
        {dashboardLoading ? <div className="grid grid-cols-1 gap-6 lg:grid-cols-2"><SkeletonChart /><SkeletonChart /><SkeletonChart className="lg:col-span-2" /></div> : <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                <XAxis dataKey="week" />
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
        </div>}
          {/* <Card>
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
        </Card> */}
        <Card>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
          </div>
          <Table columns={activityColumns} data={activities} loading={dashboardLoading} />
        </Card>
      </div>
    </MainLayout>
  );
};

export default FarmerDashboardPage;
