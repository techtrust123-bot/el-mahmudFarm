import React, { useState } from 'react';
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import MainLayout from '../layouts/MainLayout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Textarea from '../components/ui/Textarea';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import StatCard from '../components/ui/StatCard';
import Alert from '../components/ui/Alert';
import Badge from '../components/ui/Badge';
import { expenseData, monthlyChartData } from '../data/dummyData';
import { EXPENSE_CATEGORIES } from '../utils/constants';
import { validateForm, expenseSchema } from '../utils/validation';

/**
 * Expense Management Page
 */
const ExpensePage = () => {
  const [expenses, setExpenses] = useState(expenseData);
  const [filterCategory, setFilterCategory] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [alert, setAlert] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    category: '',
    date: '',
    description: '',
  });
  const [errors, setErrors] = useState({});

  const filteredExpenses = expenses.filter((item) =>
    !filterCategory || item.category === filterCategory
  );

  const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
  const expensesByCategory = EXPENSE_CATEGORIES.map((cat) => ({
    name: cat.label,
    value: expenses
      .filter((exp) => exp.category === cat.value)
      .reduce((sum, exp) => sum + exp.amount, 0),
  }));

  const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6'];

  const handleAddNew = () => {
    setFormData({ title: '', amount: '', category: '', date: '', description: '' });
    setEditingId(null);
    setErrors({});
    setIsModalOpen(true);
  };

  const handleEdit = (item) => {
    setFormData(item);
    setEditingId(item.id);
    setErrors({});
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    setExpenses((prev) => prev.filter((item) => item.id !== id));
    setAlert({ type: 'success', message: 'Expense deleted successfully!' });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'amount' ? parseFloat(value) || '' : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const { isValid, errors: validationErrors } = validateForm(formData, expenseSchema);
    if (!isValid) {
      setErrors(validationErrors);
      return;
    }

    if (editingId) {
      setExpenses((prev) =>
        prev.map((item) => (item.id === editingId ? { ...item, ...formData } : item))
      );
      setAlert({ type: 'success', message: 'Expense updated successfully!' });
    } else {
      const newExpense = {
        id: Math.max(...expenses.map((item) => item.id), 0) + 1,
        ...formData,
      };
      setExpenses((prev) => [...prev, newExpense]);
      setAlert({ type: 'success', message: 'Expense recorded successfully!' });
    }

    setIsModalOpen(false);
  };

  const tableColumns = [
    { key: 'title', label: 'Title' },
    {
      key: 'category',
      label: 'Category',
      render: (value) => {
        const cat = EXPENSE_CATEGORIES.find((c) => c.value === value);
        const colors = {
          feed: 'bg-green-100 text-green-800',
          medication: 'bg-blue-100 text-blue-800',
          maintenance: 'bg-orange-100 text-orange-800',
          staff: 'bg-purple-100 text-purple-800',
        };
        return <Badge variant="info">{cat?.label}</Badge>;
      },
    },
    { key: 'amount', label: 'Amount', render: (value) => `€${value.toFixed(2)}` },
    { key: 'date', label: 'Date' },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Expense Management</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Track farm expenses and spending</p>
          </div>
          <Button variant="primary" size="lg" onClick={handleAddNew} className="flex items-center gap-2">
            <FiPlus size={20} />
            Add Expense
          </Button>
        </div>

        {alert && (
          <Alert type={alert.type} message={alert.message} closeable onClose={() => setAlert(null)} />
        )}

        {/* Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard label="Total Expenses" value={`€${totalExpenses.toFixed(2)}`} change="+8%" trend="up" />
          <StatCard label="Monthly Average" value={`€${(totalExpenses / 12).toFixed(2)}`} />
          <StatCard label="Total Records" value={expenses.length} />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {/* Expenses by Category Pie Chart */}
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Expenses by Category
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={expensesByCategory}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: €${value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {expensesByCategory.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `€${value.toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          {/* Monthly Expenses Chart */}
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Monthly Expenses
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="expenses" fill="#ef4444" name="Expenses (€)" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Filter */}
        <Card className="p-4">
          <Select
            options={EXPENSE_CATEGORIES}
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            placeholder="Filter by category"
          />
        </Card>

        {/* Table */}
        <Card className="overflow-x-auto">
          <Table
            columns={tableColumns}
            data={filteredExpenses}
            actions={(row) => [
              <Button key="edit" variant="outline" size="sm" onClick={() => handleEdit(row)}>
                <FiEdit2 size={14} />
              </Button>,
              <Button key="delete" variant="danger" size="sm" onClick={() => handleDelete(row.id)}>
                <FiTrash2 size={14} />
              </Button>,
            ]}
          />
        </Card>
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Expense' : 'Add New Expense'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Title"
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            error={errors.title}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4">
            <Input
              label="Amount (€)"
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              error={errors.amount}
              required
            />
            <Select
              label="Category"
              name="category"
              options={EXPENSE_CATEGORIES}
              value={formData.category}
              onChange={handleChange}
              error={errors.category}
              required
            />
          </div>

          <Input
            label="Date"
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            error={errors.date}
            required
          />

          <Textarea
            label="Description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
          />

          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {editingId ? 'Update' : 'Add'} Expense
            </Button>
          </div>
        </form>
      </Modal>
    </MainLayout>
  );
};

export default ExpensePage;
