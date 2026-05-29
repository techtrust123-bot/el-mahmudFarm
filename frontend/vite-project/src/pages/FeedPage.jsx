import React, { useState,useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiAlertTriangle } from 'react-icons/fi';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import MainLayout from '../layouts/MainLayout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import StatCard from '../components/ui/StatCard';
import Alert from '../components/ui/Alert';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import {  FEED_CATEGORY,ANIMAL_TYPES } from '../utils/constants';
// import { FEED_TYPE, FEED_CATEGORY, POULTRY_TYPES,ANIMAL_TYPES } from '../utils/constants';

/**
 * Feed Management Page
 */
const FeedPage = () => {
  const [feeds, setFeeds] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [alert, setAlert] = useState(null);
  const [formData, setFormData] = useState({
    feedType: '',
    animalType: '',
    feedCategory: '',
    quantity: '',
    cost: '',
    supplier: '',
    purchaseDate: '',
    totalPoultryFeedConsumedPerday: '',
    totalLivestockFeedConsumedPerday: '',
    feedPricePerkg: '',
    feedName:'',
  });
  const [errors, setErrors] = useState({});
  const {axiosInstance} = useContext(AuthContext);

  // const filteredFeeds = feeds.filter((item) =>
  //   item.feedType.toLowerCase().includes(searchTerm.toLowerCase())
  // );
  const filteredFeeds = feeds.filter((item) =>
  (item.feedType || "").toLowerCase().includes((searchTerm || "").toLowerCase())

);

  const lowStockFeeds = feeds.filter((item) => {
    const remaining = Number(item.quantity) || 0;
    return remaining < 100;
  });

  const totalValue = feeds.reduce((sum, item) => sum + Number(item.cost || 0), 0);
  const totalConsumption = feeds.reduce((sum, item) => sum + Number(item.consumption || 0), 0);
  const totalDailyConsumption = feeds.reduce((sum, item) => sum + Number(item.totalDailyConsumption || 0), 0);
  const feedConsumptionTrend = feeds
    .reduce((acc, item) => {
      const rawDate = item.lastConsumptionUpdate || item.purchaseDate;
      const dateObj = new Date(rawDate);
      if (Number.isNaN(dateObj.getTime())) return acc;
      const date = dateObj.toLocaleDateString();
      const consumption = Number(item.totalDailyConsumption || item.consumption || 0);
      const existing = acc.find((d) => d.date === date);
      if (existing) {
        existing.consumption += consumption;
      } else {
        acc.push({
          date,
          consumption,
        });
      }
      return acc;
    }, [])
    .sort((a, b) => new Date(a.date) - new Date(b.date));
//   const feedConsumptionTrend = feeds.map((item) => ({
//   date: new Date(item.purchaseDate).toLocaleDateString(),
//   consumption: Number(item.consumption || 0),
// }));

  const handleAddNew = () => {
    setFormData({ feedType: '', poultryType: '', feedCategory: '', quantity: '', cost: '', supplier: '', purchaseDate: '', totalPoultryFeedConsumedPerday: '', totalLivestockFeedConsumedPerday: '', feedPricePerkg: '', feedName:'' });
    setEditingId(null);
    setErrors({});
    setIsModalOpen(true);
  };

  const parseanimalType = (feedType) => {
    if (!feedType) return ''
    const match = feedType.match(/\b(broiler|layer|cow|goat|sheep|cattle|horse|ram|bool)\b/i)
    return match ? match[1].toLowerCase() : ''
  }

  const parsePoultryType = (feedType) => parseanimalType(feedType)

  const parseFeedCategory = (feedType) => {
    if (!feedType) return ''
    if (/super starter|starter|chick mash/i.test(feedType)) return 'Starter'
    if (/grower|grower mash/i.test(feedType)) return 'Grower'
    if (/finisher|layer mash/i.test(feedType)) return 'Finisher'
    return ''
  }

  const composeFeedType = (poultryType, feedCategory) => {
    if (!poultryType || !feedCategory) return ''
    return `${poultryType}(${feedCategory.toLowerCase()})`
  }

  const handleEdit = (item) => {
    setFormData({
      feedType: item.feedType || '',
      animalType: item.poultryType || parsePoultryType(item.feedType || ''),
      feedCategory: item.feedCategory || parseFeedCategory(item.feedType || ''),
      quantity: item.quantity || '',
      cost: item.cost || '',
      supplier: item.supplier || '',
      purchaseDate: item.purchaseDate?.split('T')[0] || '',
      totalPoultryFeedConsumedPerday: item.totalPoultryFeedConsumedPerday || '',
      totalLivestockFeedConsumedPerday: item.totalLivestockFeedConsumedPerday || '',
      feedPricePerkg: item.feedPricePerkg || '',
      feedName: item.feedName || '',
    });

    setEditingId(item._id);
    setErrors({});
    setIsModalOpen(true);
  };
  const handleDelete = async (id) => {
    try {
     const response= await axiosInstance.delete(`/api/feed/del-feed/${id}`);
     if (response?.data?.success) {
       setFeeds((prev) => prev.filter((item) => item._id !== id));
        setAlert({ type: 'success', message: response.data.message});
        return;
      }
    } catch (error) {
      setAlert({ type: 'error', message: error.response?.data?.message || 'Failed to delete feed' });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'feedType') {
        next.animalType = parseanimalType(value)
        next.feedCategory = parseFeedCategory(value)
      }
      if (name === 'animalType' || name === 'feedCategory') {
        if (next.animalType && next.feedCategory) {
          next.feedType = composeFeedType(next.animalType, next.feedCategory)
        }
      }
      return next;
    });
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let response;
      const payload = {
        ...formData,
        feedType: formData.animalType && formData.feedCategory ? composeFeedType(formData.animalType, formData.feedCategory) : formData.feedType,
      }
      if (editingId) {
        response = await axiosInstance.put(`/api/feed/edit/${editingId}`, payload);
      } else {
        response = await axiosInstance.post(`/api/feed/add-feed`, payload);
      }
      if (response?.data?.success) {
        setAlert({ type: 'success', message: response.data.message || (editingId ? 'Feed updated successfully!' : 'Feed added successfully!') });
        
        setFormData({ feedType: '', poultryType: '', feedCategory: '', quantity: '', cost: '', supplier: '', purchaseDate: '', averageDailyConsumption: '', feedPricePerkg: '', feedName:'' });
        setIsModalOpen(false);
        // Refresh data
        const fetchResponse = await axiosInstance.get('/api/feed/feed');
        setFeeds(fetchResponse.data.data || fetchResponse.data.message || []);
      } else {
        setAlert({ type: 'error', message: response.data.message || (editingId ? 'Failed to update feed' : 'Failed to add feed') });
      }
    } catch (error) {
      setAlert({ type: 'error', message: error.response?.data?.message || (editingId ? 'Failed to update feed' : 'Failed to add feed') });
    }
  }

  useEffect(() => {
    const fetchFeeds = async () => {
      try {
        const response = await axiosInstance.get('/api/feed/feed');
        setFeeds(response.data.data || response.data.message || []);
      } catch (error) {
        setAlert({ type: 'error', message: error.response?.data?.message || 'Failed to fetch feeds' });
      }
    };
    fetchFeeds();
  }, []);

  const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN'
  }).format(amount);

  const tableColumns = [
    { key: 'feedType', label: 'Feed Type' },
    { key: 'animalType', label: 'Animal Type', render: (value, row) => value || parseanimalType(row.feedType) },
    { key: 'feedCategory', label: 'Feed Category', render: (value, row) => value || parseFeedCategory(row.feedType) },
    { key: 'quantity', label: 'Quantity (kg)' },
    { key: 'totalPoultryFeedConsumedPerday', label: 'Total Poultry Feed Consumed (kg)' },
    { key: 'totalLivestockFeedConsumedPerday', label: 'Total Livestock Feed Consumed (kg)' },
    { key: 'poultryDailyConsumption', label: 'P/Avg Consume' },
    { key: 'livestockDailyConsumption', label: 'L/Avg Consume' },
    { key: 'consumption', label: 'Consumed (kg)' },
    { key: 'feedPricePerkg', label: 'Price per kg (₦)', render: (value) => formatCurrency(Number(value || 0)) },
    { key:'feedName', label:'Feed Name'},
    {
      key: 'quantity',
      label: 'Remaining',
      render: (_, row) => {
        const remaining = Number(row.quantity) || 0;
        const isLow = remaining < 100;
        return (
          <Badge variant={isLow ? 'error' : 'success'}>
            {remaining} kg {isLow && '⚠️'}
          </Badge>
        );
      },
    },
    { key: 'supplier', label: 'Supplier' },
    { key: 'cost', label: 'Cost (₦)', render: (value) => formatCurrency(Number(value || 0)) },
    // { key: 'cost', label: 'Cost (€)', render: (value) => `€${value.toFixed(2)}` },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Feed Management</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Track and manage feed inventory</p>
          </div>
          <Button variant="primary" size="lg" onClick={handleAddNew} className="flex items-center gap-2">
            <FiPlus size={20} />
            Add Feed
          </Button>
        </div>

        {alert && (
          <Alert type={alert.type} message={alert.message} closeable onClose={() => setAlert(null)} />
        )}

        {/* Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="Total Feed (kg)" value={feeds.reduce((sum, item) => sum + Number(item.quantity || 0), 0).toLocaleString()} />
          <StatCard label="Total Consumption (kg)" value={totalConsumption.toLocaleString()} />
          <StatCard label="Inventory Value" value={formatCurrency(Number(totalValue || 0).toFixed(2))} />
        </div>

        {/* Low Stock Alert */}
        {lowStockFeeds.length > 0 && (
          <Alert
            type="warning"
            title="Low Stock Alert ⚠️"
            message={`${lowStockFeeds.length} feed type(s) have low stock levels`}
          />
        )}

        {/* Feed Consumption Chart */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Daily Consumption Trend
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={feedConsumptionTrend} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="consumption" stroke="#10b981" name="Consumption (kg)" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Search */}
        <Card className="p-4">
          <Input
            placeholder="Search feed..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </Card>

        {/* Table */}
        <Card className="overflow-x-auto">
          <Table
            columns={tableColumns}
            data={filteredFeeds}
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
        title={editingId ? 'Edit Feed' : 'Add New Feed'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4">
            <Select
              label="Feed Category"
              name="feedCategory"
              options={FEED_CATEGORY}
              value={formData.feedCategory}
              onChange={handleChange}
              error={errors.feedCategory}
            />
            <Select
              label="Animal Type"
              name="animalType"
              options={ANIMAL_TYPES}
              value={formData.animalType}
              onChange={handleChange}
              error={errors.animalType}
            />
            <Input
            label="Feed Type"
            type="text"
            name="feedType"
            value={formData.feedType}
            onChange={handleChange}
            error={errors.feedType}
            required
          />
          
            <Input
              label="Quantity (kg)"
              type="number"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              error={errors.quantity}
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4">
            <Input
              label="Cost (₦)"
              type="number"
              name="cost"
              value={formData.cost}
              onChange={handleChange}
              error={errors.cost}
              required
            />
          <Input
            label="Supplier"
            type="text"
            name="supplier"
            value={formData.supplier}
            onChange={handleChange}
            error={errors.supplier}
            required
          />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4">
            {formData.animalType === 'broiler' || formData.animalType === 'layer' ? (
               <Input
              label="Total PoultryFeedConsumedPerday (kg)"
              type="number"
              name="totalPoultryFeedConsumedPerday"
              value={formData.totalPoultryFeedConsumedPerday}
              onChange={handleChange}
              error={errors.totalPoultryFeedConsumedPerday}
              required
            />
            ) : (
              <Input
              label="Total LivestockFeedConsumedPerday (kg)"
              type="number"
              name="totalLivestockFeedConsumedPerday"
              value={formData.totalLivestockFeedConsumedPerday}
              onChange={handleChange}
              error={errors.totalLivestockFeedConsumedPerday}
              required
            />
            )}
           
            <Input
              label="Feed Name"
              type="text"
              name="feedName"
              value={formData.feedName}
              onChange={handleChange}
              error={errors.feedName}
              required
            />
          </div>
            
          <Input
            label="Purchase Date"
            type="date"
            name="purchaseDate"
            value={formData.purchaseDate}
            onChange={handleChange}
            error={errors.purchaseDate}
            required
          />

          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {editingId ? 'Update' : 'Add'} Feed
            </Button>
          </div>
        </form>
      </Modal>
    </MainLayout>
  );
};

export default FeedPage;
