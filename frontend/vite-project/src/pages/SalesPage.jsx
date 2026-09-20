import React, { useState,useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiDownload } from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import MainLayout from '../layouts/MainLayout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import CurrencyInput from '../components/ui/CurrencyInput';
import Select from '../components/ui/Select';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import StatCard from '../components/ui/StatCard';
import { toast } from 'react-hot-toast';
import Badge from '../components/ui/Badge';
import { ANIMAL_TYPE } from '../utils/constants';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { downloadExport, getDefaultFilename } from '../utils/exportHelper';

/**
 * Sales & Revenue Page
 */
const SalesPage = () => {
  const [sales, setSales] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const {axiosInstance} = useContext(AuthContext)
 
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availablePoultry, setAvailablePoultry] = useState([]);
  const [availableLivestock, setAvailableLivestock] = useState([]);
  const [eggRecords, setEggRecords] = useState([]);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);

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

  useEffect(() => {
    if (!isModalOpen || editingId) return;
    const fetchAvailableInventory = async () => {
      setIsLoadingInventory(true);
      try {
        const response = await axiosInstance.get('/api/sell/inventory');
        const inventory = response.data.data || {};
        setAvailablePoultry(inventory.poultry || []);
        setAvailableLivestock(inventory.livestock || []);
        setEggRecords(inventory.eggs || []);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Unable to load sale inventory.');
      } finally {
        setIsLoadingInventory(false);
      }
    };
    fetchAvailableInventory();
  }, [isModalOpen, editingId, axiosInstance]);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await downloadExport('sales', axiosInstance, getDefaultFilename('sales'));
      toast.success('Sales data exported successfully!');
    } catch (error) {
      toast.error(error.message || 'Failed to export sales data');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(`Are you show you want to delete ${id}?`)) return;
    try {
    const response =  await axiosInstance.delete(`/api/sell/del/${id}`);
      setSales((prev) => prev.filter((item) => item._id !== id));
      toast.success(response.data.message || 'Sale deleted successfully');
    } catch (error) {
      console.log(error);
      toast.error(error.response?.data?.message || 'Failed to delete sale');
    }
  };

  const handleGenerateReceipt = (sale) => {
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) return;

    const groupKey = sale.invoiceGroupId || sale.invoiceId;
    const invoiceItems = sales.filter((item) => {
      if (sale.invoiceGroupId) {
        return item.invoiceGroupId === sale.invoiceGroupId;
      }
      return item.invoiceId === sale.invoiceId;
    });

    const firstSale = invoiceItems[0] || sale;
    const saleDate = firstSale.date ? new Date(firstSale.date).toLocaleString() : '';
    const invoiceLabel = firstSale.invoiceGroupId || firstSale.invoiceId || 'N/A';
    const totalAmount = invoiceItems.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0);
    const totalProfit = invoiceItems.reduce((sum, item) => sum + Number(item.profit || 0), 0);

    const rows = invoiceItems
      .map((item) => {
        const unitPrice = formatCurrency(Number(item.pricePerUnit || 0));
        const amount = formatCurrency(Number(item.totalAmount || 0));
        return `
          <tr>
            <td>${item.animalType || 'N/A'}</td>
            <td>${item.batchId || 'N/A'}</td>
            <td>${item.animalType || item.tagNumber || 'N/A'}</td>
            <td>${item.quantitySold || 'N/A'}</td>
            <td>${unitPrice}</td>
            <td>${amount}</td>
          </tr>`;
      })
      .join('');

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
          <p><strong>Invoice Group:</strong> ${invoiceLabel}</p>
          <p><strong>Date:</strong> ${saleDate}</p>
          <p><strong>Customer:</strong> ${firstSale.customerName || 'N/A'}</p>
          <p><strong>Contact:</strong> ${firstSale.buyerContact || 'N/A'}</p>
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
              ${rows}
            </tbody>
          </table>
          <div class="summary">
            <p><strong>Total Amount:</strong> ${formatCurrency(totalAmount)}</p>
            
            <p><strong>Status:</strong> ${firstSale.status || 'N/A'}</p>
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

  const validateSale = () => {
    const validationErrors = {};

    if (!formData.date) validationErrors.date = 'Sale date is required';
    if (!formData.customerName) validationErrors.customerName = 'Customer name is required';
    if (!formData.buyerContact) validationErrors.buyerContact = 'Buyer contact is required';
    if (!formData.status) validationErrors.status = 'Sale status is required';

    if (!editingId) {
      if (!orderItems.length) {
        toast.error('Please add at least one order item.');
        return false;
      }

      let orderHasError = false;
      orderItems.forEach((item, index) => {
        const row = index + 1;
        if (!item.animalType) {
          orderHasError = true;
          toast.error(`Order ${row}: animal type is required`);
        }
        if (!item.pricePerUnit) {
          orderHasError = true;
          toast.error(`Order ${row}: unit price is required`);
        }
        if (item.quantitySold && (isNaN(Number(item.quantitySold)) || Number(item.quantitySold) <= 0)) {
          orderHasError = true;
          toast.error(`Order ${row}: quantity must be a valid number`);
        }
        if (item.animalType === 'Poultry' && !item.batchId) {
          orderHasError = true;
          toast.error(`Order ${row}: batch ID is required for poultry`);
        }
        if (item.animalType === 'Egg' && !item.batchId) {
          orderHasError = true;
          toast.error(`Order ${row}: egg batch ID is required`);
        }
        if (item.animalType === 'Livestock' && !item.tagNumber && !item.type) {
          orderHasError = true;
          toast.error(`Order ${row}: tag number or type is required for livestock`);
        }
      });

      if (orderHasError) {
        return false;
      }
    }

    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
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
    setOrderItems((prev) => prev.map((item, idx) => {
      if (idx !== index) return item;
      if (name === 'animalType') return { ...item, animalType: value, batchId: '', tagNumber: '', pricePerUnit: '' };
      const updatedItem = { ...item, [name]: value };
      if (name === 'batchId' || name === 'tagNumber') {
        const records = updatedItem.animalType === 'Poultry' ? availablePoultry : updatedItem.animalType === 'Egg' ? eggRecords : availableLivestock;
        const selectedRecord = records.find((record) => String(record[name] || '').trim().toLowerCase() === String(value || '').trim().toLowerCase());
        const priceField = updatedItem.animalType === 'Poultry' ? 'poultrySalePrice' : updatedItem.animalType === 'Egg' ? 'salePricePerCrate' : 'livestockSalePrice';
        updatedItem.pricePerUnit = selectedRecord ? Number(selectedRecord[priceField] || 0) : '';
      }
      return updatedItem;
    }));
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

  const handleEdit = (sale) => {
    setEditingId(sale._id);
    setFormData({
      invoiceId: sale.invoiceId || '',
      date: sale.date ? sale.date.split('T')[0] : '',
      customerName: sale.customerName || '',
      buyerContact: sale.buyerContact || '',
      status: sale.status || '',
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateSale()) {
      return;
    }

    setIsSubmitting(true);
    try {
      let response;
      if (editingId) {
        response = await axiosInstance.put(`/api/sell/edit/${editingId}`, formData);
        toast.success('Sale updated successfully!');
      } else {
        const payload = {
          orders: orderItems.map((item) => ({
            animalType: item.animalType,
            batchId: item.batchId,
            tagNumber: item.tagNumber,
            quantitySold: item.quantitySold,
            date: formData.date,
            customerName: formData.customerName,
            buyerContact: formData.buyerContact,
            status: formData.status,
          })),
        };

        response = await axiosInstance.post(`/api/sell/add`, payload);

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
          toast.success('Sale recorded successfully!');
        }
      }

      const fetchSells = await axiosInstance.get(`/api/sell/list`);
      if (fetchSells.data.success) {
        setSales(Array.isArray(fetchSells.data.data) ? fetchSells.data.data : []);
      }
      setIsModalOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save sale');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(()=>{
    const fetchSells = async()=>{
      try {
        const response = await axiosInstance.get(`/api/sell/list`)
        if(response.data.success){
          setSales(response.data.data || response.data.message || [])
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
    {
      key: 'invoiceGroupId',
      label: 'Invoice Group',
      render: (value, row) => value || row.invoiceId || 'N/A'
    },
    { key: 'invoiceId', label: 'Invoice ID' },
    { key: 'date', label: 'Date',render: (value) => value ? new Date(value).toLocaleDateString() : 'N/A' },
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
          <div className="flex gap-2">
            <Button variant="outline" size="lg" onClick={handleExport} disabled={isExporting} className="flex items-center gap-2">
              <FiDownload size={20} />
              {isExporting ? 'Exporting...' : 'Export'}
            </Button>
            <Button variant="primary" size="lg" onClick={handleAddNew} className="flex items-center gap-2">
              <FiPlus size={20} />
              Record Sale
            </Button>
          </div>
        </div>


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
              <Button key="edit" variant="secondary" size="sm" className="flex items-center gap-1" onClick={() => handleEdit(row)}>
                <FiEdit2 size={14} />
                Edit
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
                        label={item.animalType === 'Egg' ? 'Crates' : 'Quantity'}
                        type="number"
                        name="quantitySold"
                        value={item.quantitySold}
                        onChange={(e) => handleOrderItemChange(index, 'quantitySold', e.target.value)}
                        placeholder="Quantity"
                        required
                      />
                      <CurrencyInput
                        label={item.animalType === 'Egg' ? 'Price per crate (NGN)' : 'Unit Price (NGN)'}
                        name="pricePerUnit"
                        value={item.pricePerUnit}
                        placeholder="Automatically sourced"
                        disabled
                        required
                      />
                      <div className="md:col-span-5 text-sm text-gray-700 dark:text-gray-300">
                        <span className="font-medium">Total Amount:</span>{' '}
                        {Number(item.pricePerUnit || 0) > 0
                          ? formatCurrency(Number(item.quantitySold || 0) * Number(item.pricePerUnit))
                          : 'Price unavailable'}
                        <span className="ml-2 text-xs text-gray-500">
                          {Number(item.pricePerUnit || 0) > 0 ? 'Price is sourced automatically from the selected record.' : 'Enter a valid record with a configured sale price.'}
                        </span>
                      </div>
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
              { value: 'completed', label: 'completed' },
              { value: 'pending', label: 'pending' },
            ]}
            value={formData.status}
            onChange={handleChange}
            required
          />

          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={isSubmitting || (!editingId && orderItems.some((item) => Number(item.pricePerUnit || 0) <= 0))}
            >
              {isSubmitting ? (editingId ? 'Updating...' : 'Recording...') : editingId ? 'Update Sale' : 'Record Sale'}
            </Button>
          </div>
        </form>
      </Modal>
    </MainLayout>
  );
};

export default SalesPage;
