import React, { useEffect, useMemo, useState } from 'react';
import MainLayout from '../layout/MainLayout';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Table from '../ui/Table';
import subscriptionService from '../../services/subscriptionService';
import { formatCurrency } from '../../data/subscriptionPlans';
import { formatDisplayDate } from '../../utils/subscriptionUtils';

const statusColors = {
  active: 'success',
  expired: 'error',
  pending: 'warning',
  cancelled: 'default',
  failed: 'error',
  trial: 'info',
};

const StatCard = ({ label, value, icon }) => (
  <Card className="border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      </div>
      <div className="rounded-lg bg-emerald-100 p-3 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
        {icon}
      </div>
    </div>
  </Card>
);

const AdminSubscriptionPage = () => {
  const [stats, setStats] = useState({});
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRow, setSelectedRow] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');
        const [nextStats, nextRows] = await Promise.all([
          subscriptionService.getAdminStats(),
          subscriptionService.getAdminSubscriptions(),
        ]);
        setStats(nextStats);
        setRows(nextRows);
      } catch (err) {
        setError('Unable to load subscription data.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesSearch = !search || `${row.customer} ${row.plan} ${row.id}`.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || row.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [rows, search, statusFilter]);

  const columns = [
    { key: 'customer', label: 'Farm / Customer', sortable: true },
    { key: 'plan', label: 'Plan', sortable: true },
    { key: 'billingCycle', label: 'Billing Cycle', sortable: true },
    { key: 'amount', label: 'Amount', sortable: true, render: (value) => formatCurrency(value) },
    { key: 'status', label: 'Status', sortable: true, render: (value) => <Badge variant={statusColors[value] || 'default'}>{value}</Badge> },
    { key: 'startDate', label: 'Start Date', sortable: true, render: (value) => formatDisplayDate(value) },
    { key: 'endDate', label: 'End Date', sortable: true, render: (value) => formatDisplayDate(value) },
    { key: 'autoRenew', label: 'Auto Renew', sortable: true, render: (value) => (value ? 'Yes' : 'No') },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
            Admin
          </p>
          <h1 className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">Subscription management</h1>
        </div>

        {error && (
          <Card className="border border-red-200 bg-red-50 dark:border-red-700 dark:bg-red-900/20">
            <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
          </Card>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard label="Total subscribers" value={stats.totalSubscribers ?? 0} icon={<span>👥</span>} />
          <StatCard label="Active subscriptions" value={stats.activeSubscriptions ?? 0} icon={<span>✅</span>} />
          <StatCard label="Expired subscriptions" value={stats.expiredSubscriptions ?? 0} icon={<span>⏳</span>} />
          <StatCard label="Trial subscriptions" value={stats.trialSubscriptions ?? 0} icon={<span>🧪</span>} />
          <StatCard label="Monthly subscriptions" value={stats.monthlySubscriptions ?? 0} icon={<span>📆</span>} />
          <StatCard label="Yearly subscriptions" value={stats.yearlySubscriptions ?? 0} icon={<span>📘</span>} />
          <StatCard label="Starter subscribers" value={stats.starterSubscribers ?? 0} icon={<span>1</span>} />
          <StatCard label="Basic subscribers" value={stats.basicSubscribers ?? 0} icon={<span>2</span>} />
          <StatCard label="Premium subscribers" value={stats.premiumSubscribers ?? 0} icon={<span>3</span>} />
        </div>

        <Card className="border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-col gap-3 border-b border-gray-200 pb-4 dark:border-gray-700 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Subscription records</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Frontend-only admin list for later backend integration.</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search farms or plan"
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none ring-0 transition focus:border-emerald-400 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-emerald-400 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Cancelled</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <Table
              columns={columns}
              data={filteredRows}
              loading={loading}
              pageSize={6}
              actions={(row) => (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedRow(row)}
                >
                  View
                </Button>
              )}
            />
          </div>
        </Card>

        {selectedRow && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800">
              <div className="mb-5 flex items-center justify-between gap-3">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Subscription details</h3>
                <button
                  type="button"
                  onClick={() => setSelectedRow(null)}
                  className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700 dark:bg-gray-700 dark:text-gray-200"
                >
                  Close
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Customer / Farm</p>
                  <p className="mt-1 text-base font-semibold text-gray-900 dark:text-white">{selectedRow.customer}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Subscription ID</p>
                  <p className="mt-1 text-base font-semibold text-gray-900 dark:text-white">{selectedRow.id}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Plan</p>
                  <p className="mt-1 text-base font-semibold text-gray-900 dark:text-white">{selectedRow.plan}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Billing cycle</p>
                  <p className="mt-1 text-base font-semibold text-gray-900 dark:text-white">{selectedRow.billingCycle}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Amount</p>
                  <p className="mt-1 text-base font-semibold text-gray-900 dark:text-white">{formatCurrency(selectedRow.amount)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Status</p>
                  <p className="mt-1 text-base font-semibold text-gray-900 dark:text-white">{selectedRow.status}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Start date</p>
                  <p className="mt-1 text-base font-semibold text-gray-900 dark:text-white">{formatDisplayDate(selectedRow.startDate)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500">End date</p>
                  <p className="mt-1 text-base font-semibold text-gray-900 dark:text-white">{formatDisplayDate(selectedRow.endDate)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Payment reference</p>
                  <p className="mt-1 text-base font-semibold text-gray-900 dark:text-white">{selectedRow.paymentReference || 'placeholder'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Auto-renew</p>
                  <p className="mt-1 text-base font-semibold text-gray-900 dark:text-white">{selectedRow.autoRenew ? 'Enabled' : 'Disabled'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Created date</p>
                  <p className="mt-1 text-base font-semibold text-gray-900 dark:text-white">{formatDisplayDate(selectedRow.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Updated date</p>
                  <p className="mt-1 text-base font-semibold text-gray-900 dark:text-white">{formatDisplayDate(selectedRow.updatedAt)}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default AdminSubscriptionPage;
