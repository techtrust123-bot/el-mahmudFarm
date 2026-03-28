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
} from 'recharts';
import {
  FiTrendingUp,
  FiShoppingCart,
  FiDollarSign,
  FiAlertCircle,
  FiEdit2,
  FiTrash2,
} from 'react-icons/fi';
import MainLayout from '../layouts/MainLayout';
import Card from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';
import Table from '../components/ui/Table';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import {
  dashboardStats,
  monthlyChartData,
  feedConsumptionData,
  mortalityTrendData,
  recentActivity,
} from '../data/dummyData';
import { AuthContext } from '../context/AuthContext';

/**
 * Dashboard Page - Main analytics and overview
 */
const DashboardPage = () => {
  const [stats, setStats] = useState(dashboardStats);
  const{userData} = useContext(AuthContext)

  const activityColumns = [
    { key: 'title', label: 'Activity' },
    { key: 'description', label: 'Description' },
    { key: 'timestamp', label: 'Time' },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Welcome back, {userData?.name}! Here's your farm overview.</p>
        </div>

        {/* Summary Stats Grid */}
        {/*
          Use responsive breakpoints so cards flow naturally on smaller screens.
          - 1 col on mobile
          - 2 cols on small
          - 3 cols on medium
          - 5 cols on large and above
        */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          <StatCard
            icon={FiShoppingCart}
            label="Total Livestock"
            value={stats.totalAnimals}
            change="+2"
            trend="up"
          />
          <StatCard
            icon={FiTrendingUp}
            label="Total Poultry"
            value={stats.totalPoultry}
            change="+50"
            trend="up"
          />
          <StatCard
            icon={FiDollarSign}
            label="Total Revenue"
            value={`$${stats.totalRevenue.toLocaleString()}`}
            change="+12%"
            trend="up"
          />
          <StatCard
            icon={FiAlertCircle}
            label="Total Expenses"
            value={`$${stats.totalExpenses.toLocaleString()}`}
            change="+5%"
            trend="down"
          />
          <StatCard
            icon={FiAlertCircle}
            label="Mortality Rate"
            value={`${stats.mortalityRate}%`}
            change="-0.2%"
            trend="down"
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales & Expenses Chart */}
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Monthly Revenue & Expenses
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyChartData}>
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

          {/* Feed Consumption Chart */}
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Weekly Feed Consumption
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={feedConsumptionData}>
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

          {/* Mortality Trend Chart */}
          <Card className="lg:col-span-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Mortality Trends
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={mortalityTrendData}>
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

        {/* Recent Activity */}
        <Card>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Activity
            </h2>
            <Button variant="ghost" size="sm">
              View All
            </Button>
          </div>
          <Table
            columns={activityColumns}
            data={recentActivity}
            actions={(row) => [
              <Button key="view" variant="ghost" size="sm">
                View
              </Button>,
            ]}
          />
        </Card>
      </div>
    </MainLayout>
  );
};

export default DashboardPage;
