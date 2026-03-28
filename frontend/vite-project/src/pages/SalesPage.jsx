import React, { useState,useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiDownload } from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import MainLayout from '../layouts/MainLayout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import StatCard from '../components/ui/StatCard';
import Alert from '../components/ui/Alert';
import Badge from '../components/ui/Badge';
import { ANIMAL_TYPES, VACCINATION_STATUS } from '../utils/constants';
import { salesData, monthlyChartData } from '../data/dummyData';
import axios from 'axios'
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

/**
 * Sales & Revenue Page
 */
const SalesPage = () => {
  const [sales, setSales] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [alert, setAlert] = useState(null);
  const {backendUrl} = useContext(AuthContext)
  const [formData, setFormData] = useState({
    invoiceId: '',
    tagNumber: '',
    date: '',
    animalType: '',
    quantity: '',
    unitPrice: '',
    customerName: '',
    status: '',
  });
  const [errors, setErrors] = useState({});

  const filteredSales = sales.filter((item) => {
    const matchesSearch = item.invoiceId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !filterStatus || item.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const totalRevenue = sales.reduce((sum, item) => sum + item.totalAmount, 0);
  const completedSales = sales.filter((item) => item.status === 'completed').length;
  const pendingSales = sales.filter((item) => item.status === 'pending').length;
  const profit = sales.reduce((sum, item) => sum + item.profit, 0);
  const quantitySold = sales.reduce((sum,item)=>sum + item.quantitySold,0)

  const handleAddNew = () => {
    setFormData({
      batchId: '',
      date: '',
      animalType: '',
      tagNumber: '',
      quantitySold: '',
      pricePerUnit: '',
      customerName: '',
      status: '',
      costPrice:'',
      buyerContact:''
    });
    setEditingId(null);
    setErrors({});
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    try {
    const response =  await axios.delete(`${backendUrl}/api/sell/del/${id}`, { withCredentials: true });
      setSales((prev) => prev.filter((item) => item._id !== id));
      setAlert({ type: 'success', message: response.data.message });
    } catch (error) {
      console.log(error);
      setAlert({ type: 'error', message: error.response?.data?.message });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async(e) => {
    e.preventDefault();
    try {
      let response;
      if (editingId) {
      response = await axios.put(`${backendUrl}/api/sell/edit/${editingId}`,formData,{withCredentials:true })
      setAlert({ type: 'success', message: 'Sale updated successfully!' });
    }else{
      response = await axios.post(`${backendUrl}/api/sell/add`,formData,{withCredentials:true })
      if(response.data.success){
        setFormData({
          batchId: '',
          date: '',
          animalType: '',
          tagNumber: '',
          quantitySold: '',
          pricePerUnit: '',
          customerName: '',
          status: '',
          costPrice:'',
          buyerContact:''
        })
        setAlert({ type: 'success', message: 'Sale recorded successfully!' });
      }
      const fetchSells = await axios.get(`${backendUrl}/api/sell/list`,{withCredentials:true})
      if(fetchSells.data.success){
        setSales(fetchSells.data.message)
      }
    }
    } catch (error) {
      setAlert({ type: 'error', message: error.response?.data?.message  });
    }
    setIsModalOpen(false);
  };

  useEffect(()=>{
    const fetchSells = async()=>{
      try {
        const response = await axios.get(`${backendUrl}/api/sell/list`,{withCredentials:true})
        if(response.data.success){
          setSales(response.data.message)
        }
      } catch (error) {
        console.log(error)
      }
    }
    fetchSells()
  },[])
  const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN'
  }).format(amount);

  const tableColumns = [
    { key: 'invoiceId', label: 'Invoice ID' },
    { key: 'date', label: 'Date' },
    { key: 'animalType', label: 'Animal Type' },
    { key: 'customerName', label: 'Customer' },
    { key: 'quantitySold', label: 'Quantity Sold' },
    { key: 'totalAmount', label: 'Amount', render: (value) => formatCurrency(value) },
    { key: 'profit', label: 'Profit', render: (value) => formatCurrency(value) },
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <Badge variant={value === 'completed' ? 'success' : 'warning'}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </Badge>
      ),
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Sales & Revenue</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Track and manage all sales transactions</p>
          </div>
          <Button variant="primary" size="lg" onClick={handleAddNew} className="flex items-center gap-2">
            <FiPlus size={20} />
            Record Sale
          </Button>
        </div>

        {alert && (
          <Alert type={alert.type} message={alert.message} closeable onClose={() => setAlert(null)} />
        )}

        {/* Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard label="Total Revenue" value={formatCurrency(totalRevenue)} change="+15%" trend="up" />
          <StatCard label="Completed Sales" value={completedSales} change="+3" trend="up" />
          <StatCard label="Pending Sales" value={pendingSales} />
          <StatCard label="Profit" value={formatCurrency(profit)} />
          <StatCard label="Total QuantitySold" value={quantitySold} />
        </div>

        {/* Revenue Chart */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Monthly Revenue
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="sales" fill="#10b981" name={`Sales (${formatCurrency(1)})`} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Filters */}
        <Card className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <Input
              placeholder="Search invoice..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select
              options={[
                { value: 'completed', label: 'Completed' },
                { value: 'pending', label: 'Pending' },
              ]}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              placeholder="Filter by status"
            />
          </div>
        </Card>

        {/* Table */}
        <Card className="overflow-x-auto">
          <Table
            columns={tableColumns}
            data={filteredSales}
            actions={(row) => [
              <Button key="invoice" variant="outline" size="sm" className="flex items-center gap-1">
                <FiDownload size={14} />
                Invoice
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
        title="Record New Sale"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4">
           {formData.animalType !== "Livestock" && (
              <Input
                label="Batch ID"
                type="text"
                name="batchId"
                value={formData.batchId}
                onChange={handleChange}
                placeholder="001"
                required
              />
            )}

          {formData.animalType === "Livestock" && (
            <Input
              label="Tag Number"
              type="text"
              name="tagNumber"
              value={formData.tagNumber}
              onChange={handleChange}
              placeholder="Enter tag number"
              required={formData.animalType === "Livestock"}
            />
          )}

            {formData.animalType !== "Livestock" && (
              <Input
                label="Quantity"
                type="number"
                name="quantitySold"
                value={formData.quantitySold}
                onChange={handleChange}
                required={formData.animalType !== "Livestock"}
              />
            )}
            <Input
              label="Date"
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
            />
            <Select
              label="animalType"
              type="text"
              name="animalType"
              options={ANIMAL_TYPES}
              value={formData.animalType}
              onChange={handleChange}
              required
            />
            <Input
              label="Customer"
              type="text"
              name="customerName"
              value={formData.customerName}
              onChange={handleChange}
              required
            />
            {/* <Input
              label="Cost Price"
              type="number"
              name="costPrice"
              value={formData.costPrice}
              onChange={handleChange}
              required
            /> */}
            <Input
              label="Unit Price (NGN)"
              type="number"
              name="pricePerUnit"
              value={formData.pricePerUnit}
              onChange={handleChange}
              required
            />
            <Input
              label="buyerContact"
              type="number"
              name="buyerContact"
              value={formData.buyerContact}
              onChange={handleChange}
              required
            />
          </div>

          <Select
            label="Status"
            name="status"
            options={[
              { value: 'completed', label: 'Completed' },
              { value: 'pending', label: 'Pending' },
            ]}
            value={formData.status}
            onChange={handleChange}
            required
          />

          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Record Sale
            </Button>
          </div>
        </form>
      </Modal>
    </MainLayout>
  );
};

export default SalesPage;
