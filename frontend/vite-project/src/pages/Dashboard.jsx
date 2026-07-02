import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';
import { BiError, BiLoading } from 'react-icons/bi';
import { AiOutlineDownload, AiOutlineWarning } from 'react-icons/ai';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Alert from '../components/ui/Alert';
import Recharts from 'recharts';

const { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } = Recharts;

const Dashboard = () => {
  const { user, backendUrl } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [overview, setOverview] = useState(null);
  const [kpi, setKpi] = useState(null);

  // Colors for charts
  const COLORS = ['#10b981', '#8b5c3c', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6'];

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [overviewRes, kpiRes] = await Promise.all([
          axios.get(`${backendUrl}/api/dashboard/overview`, { withCredentials: true }),
          axios.get(`${backendUrl}/api/dashboard/kpi?days=30`, { withCredentials: true })
        ]);

        setOverview(overviewRes.data.data);
        setKpi(kpiRes.data.data);
        setError('');
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load dashboard data');
        console.error('Dashboard error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchDashboardData();
    }
  }, [user, backendUrl]);

  const handleExport = async (type) => {
    try {
      const response = await axios.get(`${backendUrl}/api/export/${type}`, {
        withCredentials: true,
        responseType: 'blob'
      });

      // Create download link
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (err) {
      setError(`Failed to export ${type} data`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <BiLoading className="text-4xl text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Farm Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">Welcome back, {user?.name}!</p>
        </div>
      </div>

      {/* Error Alert */}
      {error && <Alert type="error" message={error} />}

      {/* KPI Cards Grid */}
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Livestock Card */}
          <Card>
            <div className="p-6">
              <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium">Total Livestock</h3>
              <p className="text-3xl font-bold text-emerald-600 mt-2">{overview.livestock.total}</p>
              <p className="text-xs text-gray-500 mt-1">Active animals</p>
            </div>
          </Card>

          {/* Poultry Card */}
          <Card>
            <div className="p-6">
              <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium">Total Poultry</h3>
              <p className="text-3xl font-bold text-orange-600 mt-2">{overview.poultry.total}</p>
              <p className="text-xs text-gray-500 mt-1">Active birds</p>
            </div>
          </Card>

          {/* Revenue Card */}
          <Card>
            <div className="p-6">
              <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium">Revenue</h3>
              <p className="text-3xl font-bold text-green-600 mt-2">
                ₦{overview.financials.revenue?.toLocaleString('en-NG', { maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-gray-500 mt-1">{overview.financials.period}</p>
            </div>
          </Card>

          {/* Profit Card */}
          <Card>
            <div className="p-6">
              <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium">Net Profit</h3>
              <p className={`text-3xl font-bold mt-2 ${overview.financials.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ₦{overview.financials.profit?.toLocaleString('en-NG', { maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-gray-500 mt-1">Profit Margin: {overview.financials.profitMargin}%</p>
            </div>
          </Card>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Livestock Distribution */}
        {overview && (
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Livestock Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={Object.entries(overview.livestock.byType).map(([name, value]) => ({
                      name: name.charAt(0).toUpperCase() + name.slice(1),
                      value
                    }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {Object.entries(overview.livestock.byType).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {/* Sales Trend */}
        {kpi?.salesTrend && kpi.salesTrend.length > 0 && (
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Sales Trend (30 Days)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={kpi.salesTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="_id" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="revenue" stroke="#10b981" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </div>

      {/* Recent Activity */}
      {overview && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Sales */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Recent Sales</h3>
              <div className="space-y-3">
                {overview.recentActivity?.sales?.length > 0 ? (
                  overview.recentActivity.sales.map((sale, idx) => (
                    <div key={idx} className="flex justify-between items-center py-2 border-b last:border-b-0">
                      <div>
                        <p className="font-medium text-gray-800 dark:text-white">{sale.itemSold}</p>
                        <p className="text-sm text-gray-500">{new Date(sale.saleDate).toLocaleDateString()}</p>
                      </div>
                      <p className="font-bold text-emerald-600">
                        ₦{(sale.quantity * sale.sellingPrice)?.toLocaleString()}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">No recent sales</p>
                )}
              </div>
            </div>
          </Card>

          {/* Recent Expenses */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Recent Expenses</h3>
              <div className="space-y-3">
                {overview.recentActivity?.expenses?.length > 0 ? (
                  overview.recentActivity.expenses.map((expense, idx) => (
                    <div key={idx} className="flex justify-between items-center py-2 border-b last:border-b-0">
                      <div>
                        <p className="font-medium text-gray-800 dark:text-white">{expense.category}</p>
                        <p className="text-sm text-gray-500">{new Date(expense.expenseDate).toLocaleDateString()}</p>
                      </div>
                      <p className="font-bold text-red-600">
                        -₦{expense.amount?.toLocaleString()}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">No recent expenses</p>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Export Section */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <AiOutlineDownload /> Export Data
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <Button
              variant="outline"
              onClick={() => handleExport('livestock')}
              className="flex items-center justify-center gap-2"
            >
              <AiOutlineDownload /> Livestock
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExport('poultry')}
              className="flex items-center justify-center gap-2"
            >
              <AiOutlineDownload /> Poultry
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExport('sales')}
              className="flex items-center justify-center gap-2"
            >
              <AiOutlineDownload /> Sales
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExport('expenses')}
              className="flex items-center justify-center gap-2"
            >
              <AiOutlineDownload /> Expenses
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExport('feed')}
              className="flex items-center justify-center gap-2"
            >
              <AiOutlineDownload /> Feed
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExport('farm-report')}
              className="flex items-center justify-center gap-2"
            >
              <AiOutlineDownload /> Report
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Dashboard;
