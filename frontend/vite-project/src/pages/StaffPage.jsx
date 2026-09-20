import React, { useState,useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { useAuth } from '../hooks/useAuth';
import MainLayout from '../layouts/MainLayout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import CurrencyInput from '../components/ui/CurrencyInput';
import Select from '../components/ui/Select';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import StatCard from '../components/ui/StatCard';
import Alert from '../components/ui/Alert';
import Badge from '../components/ui/Badge';
import { STAFF_ROLES } from '../utils/constants';
import { validateForm, staffSchema } from '../utils/validation';
import axiosInstance from '../utils/axiosInstance';

/**
 * Staff Management Page
 */
const StaffPage = () => {
  const [staff, setStaff] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [alert, setAlert] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    salary: '',
    contact: '',
    email: '',
    password: '',
    hireDate: '',
    permissions: [],

  });
  const [errors, setErrors] = useState({});
  const { user } = useAuth();

  const normalizedRole = user?.role?.toLowerCase();
  const normalizedUserType = user?.userType?.toLowerCase();
  const canManageStaff =
    normalizedRole === 'manager' ||
    normalizedRole === 'admin' ||
    normalizedUserType === 'manager' ||
    normalizedUserType === 'admin';

  const PERMISSION_OPTIONS = [
    { value: 'dashboard', label: 'Dashboard' },
    { value: 'livestock', label: 'Livestock' },
    { value: 'poultry', label: 'Poultry' },
    { value: 'feed', label: 'Feed' },
    { value: 'sales', label: 'Sales' },
    { value: 'expenses', label: 'Expenses' },
    {value: 'eggInventory', label: 'Egg Inventory'},
    // { value: 'staff', label: 'Staff' },
    { value: 'settings', label: 'Settings' },
  ];

  const filteredStaff = staff.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = !filterRole || item.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const totalPayroll = staff.reduce((sum, item) => sum + item.salary, 0);
  const activeStaff = staff.filter((item) => item.status === 'active').length;

  const handleAddNew = () => {
    setFormData({ name: '', salary: '', contact: '', email: '', password: '', hireDate: '', permissions: [], });
    setEditingId(null);
    setErrors({});
    setIsModalOpen(true);
  };

  const handleEdit = (item) => {
    setFormData({
      name: item.name,
      salary: item.salary,
      contact: item.contact?.toString() || '',
      email: item.email,
      password: '',
      hireDate: item.hireDate ? new Date(item.hireDate).toISOString().slice(0, 10) : '',
      permissions: Array.isArray(item.permissions) ? item.permissions : [],
    });
    setEditingId(item._id || item.id);
    setErrors({});
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm(`Are you show you want to delete ${id}?`)) return;
    try {
      const response = await axiosInstance.delete(`/api/user/staff/${id}`);
      if (response.data.success) {
          setStaff((prev) => prev.filter((item) => item._id !== id));
          setAlert({ type: 'success', message: 'Staff member deleted successfully!' });
      }
    } catch (error) {
      console.log(error)
      setAlert({ type: 'error', message: error.response?.data?.message || 'Failed to delete staff member. Please try again.' });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'salary' ? parseFloat(value) || '' : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handlePermissionChange = (permission) => {
    setFormData((prev) => {
      const hasPermission = prev.permissions.includes(permission);
      return {
        ...prev,
        permissions: hasPermission
          ? prev.permissions.filter((item) => item !== permission)
          : [...prev.permissions, permission],
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      name: formData.name,
      email: formData.email,
      contact: formData.contact?.toString() || '',
      salary: Number(formData.salary) || 0,
      hireDate: formData.hireDate,
      permissions: formData.permissions,
    };

    // const { isValid, errors: validationErrors } = validateForm(payload, staffSchema);
    // if (!isValid) {
    //   setErrors(validationErrors);
    //   return;
    // }

    if (!editingId && (!formData.password || formData.password.length < 6)) {
      setErrors((prev) => ({ ...prev, password: 'Password must be at least 6 characters' }));
      return;
    }

    if (!editingId) {
      payload.password = formData.password;
    }

    try {
      let response;
      if (editingId) {
        response = await axiosInstance.put(`/api/user/staff/${editingId}`, payload);
        if (response.data.success) {
          setAlert({ type: 'success', message: response.data.message || 'Staff member updated successfully!' });
          setFormData({ name: '', salary: '', contact: '', email: '', password: '', hireDate: '', permissions: [], });
          setEditingId(null);
          setIsModalOpen(false);
          const fetchStaffs = await axiosInstance.get('/api/user/staff/list');
          setStaff(fetchStaffs.data.data || []);
        }
      } else {
        response = await axiosInstance.post('/api/user/staff', payload);
        if (response.data.success) {
          setAlert({ type: 'success', message: response.data.message });
          setFormData({ name: '', salary: '', contact: '', email: '', password: '', hireDate: '', permissions: [], });
          setEditingId(null);
          setIsModalOpen(false);
          const fetchStaffs = await axiosInstance.get('/api/user/staff/list');
          setStaff(fetchStaffs.data.data || []);
        }
      }
    } catch (error) {
      console.log(error);
      setAlert({ type: 'error', message: error.response?.data?.message || 'An error occurred. Please try again.' });
    }
  };

  useEffect(() => {
    const fetchStaffs = async () => {
      try {
        const response = await axiosInstance.get('/api/user/staff/list');
        if (response.data.success) {
          setStaff(response.data.data || []);
        }
      } catch (error) {
        console.log(error);
        setAlert({ type: 'error', message: error.response?.data?.message || 'Failed to fetch staff data. Please try again.' });
      }
    };
    fetchStaffs();
  }, []);

  const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN'
  }).format(amount);

  const tableColumns = [
    { key: 'name', label: 'Name' },
    {
      key: 'role',
      label: 'Role',
      // render: (value) => {
      //   const role = STAFF_ROLES.find((r) => r.value === value);
      //   return <Badge variant="info">{role?.label}</Badge>;
      // },
    },
    {
      key: 'permissions',
      label: 'Permissions',
      render: (value) => (
        <div className="flex flex-wrap gap-1">
          {(Array.isArray(value) ? value : []).map((permission) => (
            <Badge key={permission} variant="secondary">{permission}</Badge>
          ))}
        </div>
      ),
    },
    { key: 'email', label: 'Email' },
    { key: 'contact', label: 'Contact' },
    { key: 'salary', label: 'Salary', render: (value) => formatCurrency(value) },
    { key: 'hireDate', label: 'Hire Date' },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Staff Management</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Manage farm staff and personnel</p>
          </div>
          {canManageStaff && (
            <Button variant="primary" size="lg" onClick={handleAddNew} className="flex items-center gap-2">
              <FiPlus size={20} />
              Add Staff
            </Button>
          )}
        </div>

        {alert && (
          <Alert type={alert.type} message={alert.message} closeable onClose={() => setAlert(null)} />
        )}

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="Total Staff" value={staff.length} />
          <StatCard label="Active Staff" value={activeStaff} />
          <StatCard label="Monthly Payroll" value={formatCurrency(totalPayroll)} />
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Search staff..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select
              options={STAFF_ROLES}
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              placeholder="Filter by role"
            />
            {(searchTerm || filterRole) && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSearchTerm('');
                  setFilterRole('');
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </Card>

        {/* Table */}
        <Card>
          <Table
            columns={tableColumns}
            data={filteredStaff}
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
        title={editingId ? 'Edit Staff Member' : 'Add New Staff Member'}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[72vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              error={errors.name}
              required
            />
            {/* <Select
              label="Role"
              name="role"
              options={STAFF_ROLES}
              value={formData.role}
              onChange={handleChange}
              error={errors.role}
              required
            /> */}
            <Input
              label="Email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              required
            />
            {!editingId && (
              <Input
                label="Password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                error={errors.password}
                required
              />
            )}
            <Input
              label="Contact"
              type="tel"
              name="contact"
              value={formData.contact}
              onChange={handleChange}
              error={errors.contact}
              required
            />
            <CurrencyInput
              label="Monthly Salary (NGN)"
              name="salary"
              value={formData.salary}
              onChange={handleChange}
              error={errors.salary}
              required
            />
            <Input
              label="Hire Date"
              type="date"
              name="hireDate"
              value={formData.hireDate}
              onChange={handleChange}
              error={errors.hireDate}
              required
            />
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Assign Permissions</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {PERMISSION_OPTIONS.map((permission) => (
                <label
                  key={permission.value}
                  className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 cursor-pointer text-sm"
                >
                  <input
                    type="checkbox"
                    checked={formData.permissions.includes(permission.value)}
                    onChange={() => handlePermissionChange(permission.value)}
                    className="h-4 w-4 text-emerald-600 rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-200">{permission.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {editingId ? 'Update' : 'Add'} Staff
            </Button>
          </div>
        </form>
      </Modal>
    </MainLayout>
  );
};

export default StaffPage;
