import React, { useState,useEffect,useContext } from 'react';
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
import { EXPENSE_CATEGORIES } from '../utils/constants';
import { validateForm, expenseSchema } from '../utils/validation';
import { AuthContext } from '../context/AuthContext';

/**
 * Expense Management Page
 */
const ExpensePage = () => {
  const [expenses, setExpenses] = useState([]);
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
  const {axiosInstance} = useContext(AuthContext)
  const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
  const expensesByCategory = EXPENSE_CATEGORIES.map((cat) => ({
    name: cat.label,
    value: expenses
      .filter((exp) => exp.category === cat.value)
      .reduce((sum, exp) => sum + exp.amount, 0),
  }));

  const monthlyExpenseData = Object.entries(
    expenses.reduce((acc, item) => {
      const date = new Date(item.date);
      if (Number.isNaN(date.getTime())) return acc;
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      acc[monthKey] = (acc[monthKey] || 0) + Number(item.amount || 0);
      return acc;
    }, {})
  )
    .sort(([a], [b]) => new Date(`${a}-01`) - new Date(`${b}-01`))
    .map(([month, amount]) => ({ month, expenses: amount }));

  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const currentMonthExpense = monthlyExpenseData.find((entry) => entry.month === currentMonthKey)?.expenses || 0;
  const monthlyAverageExpense = monthlyExpenseData.length
    ? monthlyExpenseData.reduce((sum, entry) => sum + entry.expenses, 0) / monthlyExpenseData.length
    : 0;

  const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6'];

  const handleAddNew = () => {
    setFormData({ title: '', amount: '', category: '', date: '', description: '' });
    setEditingId(null);
    setErrors({});
    setIsModalOpen(true);
  };

  const handleEdit = (item) => {
    setFormData({
      title: item.title || '',
      amount: item.amount || '',
      category: item.category || '',
      date: item.date ? item.date.toString().slice(0, 10) : '',
      description: item.description || item.descriptions || '',
    });
    setEditingId(item._id || item.id);
    setErrors({});
    setIsModalOpen(true);
  };

  const handleDelete = async(id) => {
    try {
      const response = await axiosInstance.delete(`/api/expense/delete/${id}`)
      if(response.data.success){
        setExpenses((prev) => prev.filter((item) => (item._id || item.id) !== id));
        setAlert({ type: 'success', message: response.data.message || 'Expense deleted successfully!' });
      }else{
        setAlert({ type: 'error', message: response.data.message || 'Failed to delete expense.' });
      }
    } catch (error) {
      console.log(error)
      setAlert({ type: 'error', message: error.response?.data?.message || 'An error occurred while deleting expense.' });
    }
    
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const parsedValue = name === 'amount' ? (value === '' ? '' : Number(value)) : value;
    setFormData((prev) => ({
      ...prev,
      [name]: parsedValue,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async(e) => {
    e.preventDefault();
    
    const payload = {
      ...formData,
      amount: formData.amount === '' ? formData.amount : Number(formData.amount),
    };

    const { isValid, errors: validationErrors } = validateForm(payload, expenseSchema);
    if (!isValid) {
      setErrors(validationErrors);
      return;
    }
    try {
      let response;
      if (editingId) {
        response = await axiosInstance.put(`/api/expense/edit/${editingId}`, payload)
        setAlert({ type: 'success', message: response.data.message || 'Expense updated successfully!' });
      }else{
        response = await axiosInstance.post('/api/expense/add-expense', payload)
        setAlert({ type: 'success', message: response.data.message || 'Expense added successfully!' });
      }
      if(response.data.success){
        setAlert({ type: 'success', message: response.data.message || (editingId ? 'Expense updated successfully!' : 'Expense added successfully!') });
        setFormData({ title: '', amount: '', category: '', date: '', description: '' });
        setEditingId(null);
        setIsModalOpen(false);
        // Optionally, you can refetch expenses from the backend here to get the latest data
        const fetchExpenses = await axiosInstance.get('/api/expense/list')
        setExpenses(fetchExpenses.data.data || [])
      }
    } catch (error) {
      console.log(error)
      setAlert({ type: 'error', message: error.response?.data?.message });
      return;
    }
  }

  useEffect(()=>{
    const fetchExpenses = async()=>{
      try {
        const response = await axiosInstance.get('/api/expense/list')
        if(response.data.success){
          setExpenses(response.data.data || [])
        }else{
          setAlert({ type: 'error', message: response.data.message || 'Failed to fetch expenses.' });
        }
      } catch (error) {
        setAlert({ type: 'error', message: 'An error occurred while fetching expenses.' });
      }
    }
    fetchExpenses();
  }, []);
   
  const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN'
  }).format(amount);

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
    { key: 'amount', label: 'Amount', render: (value) => `${formatCurrency(value)}` },
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
          <StatCard label="Total Expenses" value={`${formatCurrency(totalExpenses)}`} change="+8%" trend="up" />
          <StatCard label="This Month" value={`${formatCurrency(currentMonthExpense)}`} />
          <StatCard label="Monthly Average" value={`${formatCurrency(monthlyAverageExpense)}`} />
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
                  label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {expensesByCategory.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${formatCurrency(value)}`} />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          {/* Monthly Expenses Chart */}
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Monthly Expenses
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyExpenseData.length > 0 ? monthlyExpenseData : [{ month: 'No data', expenses: 0 }] }>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `${formatCurrency(value)}`} />
                <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
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
              <Button key="delete" variant="danger" size="sm" onClick={() => handleDelete(row._id)}>
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
