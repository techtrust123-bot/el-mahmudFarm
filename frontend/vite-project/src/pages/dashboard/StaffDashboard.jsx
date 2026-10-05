import React from 'react';
import { FiActivity, FiCheckCircle, FiClock, FiPackage, FiUsers } from 'react-icons/fi';
import MainLayout from '../../components/layout/MainLayout';
import Card from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import { useAuth } from '../../hooks/useAuth';

const priorityTasks = [
  { title: 'Morning animal check-in', detail: 'Review health notes and feed logs before 9:00 AM.', status: 'Due today' },
  { title: 'Feed stock count', detail: 'Confirm inventory levels and reorder low-stock items.', status: 'In progress' },
  { title: 'Sales handoff', detail: 'Share today’s sales summary with the farm manager.', status: 'Pending' },
];

const quickInsights = [
  'Feed usage is trending within the expected range this week.',
  'Two poultry batches need attention before the next feed cycle.',
  'The farm is on track to meet the current production target.',
];

const StaffDashboardPage = () => {
  const { user } = useAuth();
  const staffName = user?.name || 'Staff Member';

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-600">Staff dashboard</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Welcome back, {staffName}</h1>
          </div>
          <div className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
            Farm operations overview
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={FiActivity} label="Today’s tasks" value="08" change="3 due today" trend="up" />
          <StatCard icon={FiCheckCircle} label="Completed" value="14" change="+2 from yesterday" trend="up" />
          <StatCard icon={FiPackage} label="Inventory alerts" value="02" change="Needs review" trend="down" />
          <StatCard icon={FiClock} label="Shift status" value="On duty" change="8:00 AM - 5:00 PM" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <Card className="p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">Priority tasks</h2>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">3 active</span>
            </div>

            <div className="space-y-4">
              {priorityTasks.map((task) => (
                <div key={task.title} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-slate-900">{task.title}</h3>
                      <p className="mt-1 text-sm text-slate-600">{task.detail}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                      {task.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700">
                <FiUsers size={20} />
              </div>
              <h2 className="text-xl font-semibold text-slate-900">Quick insights</h2>
            </div>

            <ul className="space-y-3">
              {quickInsights.map((insight) => (
                <li key={insight} className="flex gap-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default StaffDashboardPage;
