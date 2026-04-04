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
import { ANIMAL_TYPE } from '../utils/constants';
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
    date: '',
    customerName: '',
    buyerContact: '',
    status: '',
  });
  const [orderItems, setOrderItems] = useState([
    {
      animalType: '',
      batchId: '',
      tagNumber: '',
      quantitySold: '',
      pricePerUnit: '',
    },
  ]);
  const [errors, setErrors] = useState({});

  const filteredSales = sales.filter((item) => {
    const matchesSearch = item.invoiceId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !filterStatus || item.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const totalRevenue = sales.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0);
  const completedSales = sales.filter((item) => item.status === 'completed').length;
  const pendingSales = sales.filter((item) => item.status === 'pending').length;
  const profit = sales.reduce((sum, item) => sum + Number(item.profit || 0), 0);
  const quantitySold = sales.reduce((sum,item)=>sum + Number(item.quantitySold || 0),0)

  const monthlyRevenueData = Object.entries(
    sales.reduce((acc, item) => {
      const date = new Date(item.date)
      if (Number.isNaN(date.getTime())) return acc
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      acc[monthKey] = (acc[monthKey] || 0) + Number(item.totalAmount || 0)
      return acc
    }, {})
  )
    .sort(([a], [b]) => new Date(`${a}-01`) - new Date(`${b}-01`))
    .map(([month, revenue]) => ({ month, revenue }))

  const latestMonthRevenue = monthlyRevenueData.length > 0 ? monthlyRevenueData[monthlyRevenueData.length - 1].revenue : 0

  const handleAddNew = () => {
    setFormData({
      invoiceId: '',
      date: '',
      customerName: '',
      buyerContact: '',
      status: '',
    });
    setOrderItems([
      {
        animalType: '',
        batchId: '',
        tagNumber: '',
        quantitySold: '',
        pricePerUnit: '',
      },
    ]);
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

  const handleGenerateReceipt = (sale) => {
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) return;

    const saleDate = sale.date ? new Date(sale.date).toLocaleString() : '';
    const amount = formatCurrency(Number(sale.totalAmount || 0));
    const unitPrice = formatCurrency(Number(sale.pricePerUnit || 0));
    const profit = formatCurrency(Number(sale.profit || 0));

    const html = `<!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Order Receipt</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
            h1 { margin-bottom: 8px; font-size: 24px; }
            h2 { margin-bottom: 16px; font-size: 18px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ccc; padding: 10px; text-align: left; }
            th { background: #f5f7fa; }
            .summary { margin-top: 24px; }
            .summary p { margin: 4px 0; }
            .footer { margin-top: 32px; font-size: 14px; color: #555; }
          </style>
        </head>
        <body>
          <h1>Order Receipt</h1>
          <p><strong>Invoice ID:</strong> ${sale.invoiceId || 'N/A'}</p>
          <p><strong>Date:</strong> ${saleDate}</p>
          <p><strong>Customer:</strong> ${sale.customerName || 'N/A'}</p>
          <p><strong>Contact:</strong> ${sale.buyerContact || 'N/A'}</p>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Batch / Tag</th>
                <th>Type</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${sale.animalType || 'N/A'}</td>
                <td>${sale.batchId || sale.tagNumber || 'N/A'}</td>
                <td>${sale.animalType || 'N/A'}</td>
                <td>${sale.quantitySold || 1}</td>
                <td>${unitPrice}</td>
                <td>${amount}</td>
              </tr>
            </tbody>
          </table>
          <div class="summary">
            <p><strong>Status:</strong> ${sale.status || 'N/A'}</p>
          </div>
          <div class="footer">
            <p>Thank you for your purchase.</p>
          </div>
        </body>
      </html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleOrderItemChange = (index, name, value) => {
    setOrderItems((prev) =>
      prev.map((item, idx) =>
        idx === index
          ? {
              ...item,
              [name]: value,
            }
          : item
      )
    );
  };

  const handleAddOrderItem = () => {
    setOrderItems((prev) => [
      ...prev,
      {
        animalType: '',
        batchId: '',
        tagNumber: '',
        quantitySold: '',
        pricePerUnit: '',
      },
    ]);
  };

  const handleRemoveOrderItem = (index) => {
    setOrderItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let response;
      if (editingId) {
        response = await axios.put(`${backendUrl}/api/sell/edit/${editingId}`, formData, {
          withCredentials: true,
        });
        setAlert({ type: 'success', message: 'Sale updated successfully!' });
      } else {
        const payload = {
          orders: orderItems.map((item) => ({
            ...item,
            date: formData.date,
            customerName: formData.customerName,
            buyerContact: formData.buyerContact,
            status: formData.status,
          })),
        };

        response = await axios.post(`${backendUrl}/api/sell/add`, payload, {
          withCredentials: true,
        });

        if (response.data.success) {
          setFormData({
            invoiceId: '',
            date: '',
            customerName: '',
            buyerContact: '',
            status: '',
          });
          setOrderItems([
            {
              animalType: '',
              batchId: '',
              tagNumber: '',
              quantitySold: '',
              pricePerUnit: '',
            },
          ]);
          setAlert({ type: 'success', message: 'Sale recorded successfully!' });
        }

        const fetchSells = await axios.get(`${backendUrl}/api/sell/list`, {
          withCredentials: true,
        });
        if (fetchSells.data.success) {
          setSales(fetchSells.data.message);
        }
      }
    } catch (error) {
      setAlert({ type: 'error', message: error.response?.data?.message });
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
  },[backendUrl])
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
          <StatCard label="Latest Month Revenue" value={formatCurrency(latestMonthRevenue)} />
          <StatCard label="Profit" value={formatCurrency(profit)} />
          <StatCard label="Total Quantity Sold" value={quantitySold} />
          <StatCard label="Completed Sales" value={completedSales} change="+3" trend="up" />
          <StatCard label="Pending Sales" value={pendingSales} />
        </div>

        {/* Revenue Chart */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Monthly Revenue
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyRevenueData.length > 0 ? monthlyRevenueData : [{ month: 'No data', revenue: 0 }] }>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
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
              <Button key="invoice" variant="outline" size="sm" className="flex items-center gap-1" onClick={() => handleGenerateReceipt(row)}>
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
        title={editingId ? 'Edit Sale' : 'Record New Sale'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {!editingId && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Order Items</h3>
                <Button type="button" variant="outline" size="sm" onClick={handleAddOrderItem}>
                  <FiPlus size={16} />
                  Add Item
                </Button>
              </div>
              <div className="space-y-4">
                {orderItems.map((item, index) => (
                  <Card key={`order-item-${index}`} className="p-4 bg-gray-50 dark:bg-gray-900">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                      <Select
                        label={`Item ${index + 1} type`}
                        name="animalType"
                        options={ANIMAL_TYPE}
                        value={item.animalType}
                        onChange={(e) => handleOrderItemChange(index, 'animalType', e.target.value)}
                        required
                      />

                      {item.animalType !== 'Livestock' ? (
                        <Input
                          label="Batch ID"
                          type="text"
                          name="batchId"
                          value={item.batchId}
                          onChange={(e) => handleOrderItemChange(index, 'batchId', e.target.value)}
                          placeholder="Enter batch ID"
                          required
                        />
                      ) : (
                        <Input
                          label="Tag Number"
                          type="text"
                          name="tagNumber"
                          value={item.tagNumber}
                          onChange={(e) => handleOrderItemChange(index, 'tagNumber', e.target.value)}
                          placeholder="Enter tag number"
                          required
                        />
                      )}

                      <Input
                        label="Quantity"
                        type="number"
                        name="quantitySold"
                        value={item.quantitySold}
                        onChange={(e) => handleOrderItemChange(index, 'quantitySold', e.target.value)}
                        placeholder="Quantity"
                        required
                      />
                      <Input
                        label="Unit Price (NGN)"
                        type="number"
                        name="pricePerUnit"
                        value={item.pricePerUnit}
                        onChange={(e) => handleOrderItemChange(index, 'pricePerUnit', e.target.value)}
                        placeholder="Unit price"
                        required
                      />
                      <div className="flex justify-end">
                        {orderItems.length > 1 && (
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            onClick={() => handleRemoveOrderItem(index)}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <Input
              label="Date"
              type="date"
              name="date"
              value={formData.date}
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
            <Input
              label="Buyer Contact"
              type="text"
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
              {editingId ? 'Update Sale' : 'Record Sale'}
            </Button>
          </div>
        </form>
      </Modal>
    </MainLayout>
  );
};

export default SalesPage;
