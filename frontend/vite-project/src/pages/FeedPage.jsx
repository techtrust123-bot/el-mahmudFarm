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
// import { feedData, feedConsumptionData } from '../data/dummyData';
import axios from 'axios';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FEED_TYPE, FEED_CATEGORY, POULTRY_TYPES } from '../utils/constants';

/**
 * Feed Management Page
 */
const FeedPage = () => {
  const [feeds, setFeeds] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [alert, setAlert] = useState(null);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    feedType: '',
    poultryType: '',
    feedCategory: '',
    quantity: '',
    cost: '',
    supplier: '',
    purchaseDate: '',
    consumption: '',
    feedPricePerkg: '',
    feedName:'',
  });
  const [errors, setErrors] = useState({});
  const {backendUrl} = useContext(AuthContext);

  // const filteredFeeds = feeds.filter((item) =>
  //   item.feedType.toLowerCase().includes(searchTerm.toLowerCase())
  // );
  const filteredFeeds = feeds.filter((item) =>
  (item.feedType || "").toLowerCase().includes((searchTerm || "").toLowerCase())

);

  const lowStockFeeds = feeds.filter((item) => {
    const remaining = item.quantity - item.consumption;
    return remaining < 100;
  });

  const totalValue = feeds.reduce((sum, item) => sum + item.cost, 0);
  const totalConsumption = feeds.reduce((sum, item) => sum + item.consumption, 0);
  const feedConsumptionTrend = feeds.reduce((acc, item) => {
  const date = new Date(item.purchaseDate).toLocaleDateString();

  const existing = acc.find((d) => d.date === date);

  if (existing) {
    existing.consumption += Number(item.consumption || 0);
  } else {
    acc.push({
      date,
      consumption: Number(item.consumption || 0),
    });
  }

  return acc;
}, []);
//   const feedConsumptionTrend = feeds.map((item) => ({
//   date: new Date(item.purchaseDate).toLocaleDateString(),
//   consumption: Number(item.consumption || 0),
// }));

  const handleAddNew = () => {
    setFormData({ feedType: '', poultryType: '', feedCategory: '', quantity: '', cost: '', supplier: '', purchaseDate: '', consumption: '', feedPricePerkg: '', feedName:'' });
    setEditingId(null);
    setErrors({});
    setIsModalOpen(true);
  };

  const parsePoultryType = (feedType) => {
    if (!feedType) return ''
    const match = feedType.match(/\b(broiler|layer|cow|goat|sheep|cattle|horse|ram|bool)\b/i)
    return match ? match[1].toLowerCase() : ''
  }

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
      poultryType: item.poultryType || parsePoultryType(item.feedType || ''),
      feedCategory: item.feedCategory || parseFeedCategory(item.feedType || ''),
      quantity: item.quantity || '',
      cost: item.cost || '',
      supplier: item.supplier || '',
      purchaseDate: item.purchaseDate?.split('T')[0] || '',
      consumption: item.consumption || '',
      feedPricePerkg: item.feedPricePerkg || '',
      feedName: item.feedName || '',
    });

    setEditingId(item._id);
    setErrors({});
    setIsModalOpen(true);
  };
  const handleDelete = async (id) => {
    try {
     const response= await axios.delete(`${backendUrl}/api/feed/del-feed/${id}`, { withCredentials: true });
     if (response?.data?.success) {
       setFeeds((prev) => prev.filter((item) => item._id !== id));
        setAlert({ type: 'success', message: response.data.message});
        return;
      }
    } catch (error) {
      setAlert({ type: 'error', message: response.data.message || 'Failed to delete feed' });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'feedType') {
        next.poultryType = parsePoultryType(value)
        next.feedCategory = parseFeedCategory(value)
      }
      if (name === 'poultryType' || name === 'feedCategory') {
        if (next.poultryType && next.feedCategory) {
          next.feedType = composeFeedType(next.poultryType, next.feedCategory)
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
        feedType: formData.poultryType && formData.feedCategory ? composeFeedType(formData.poultryType, formData.feedCategory) : formData.feedType,
      }
      if (editingId) {
        response = await axios.put(`${backendUrl}/api/feed/edit/${editingId}`, payload, { withCredentials: true });
      } else {
        response = await axios.post(`${backendUrl}/api/feed/add-feed`, payload, { withCredentials: true });
      }
      if (response?.data?.success) {
        setAlert({ type: 'success', message: response.data.message || (editingId ? 'Feed updated successfully!' : 'Feed added successfully!') });
        
        setFormData({ feedType: '', poultryType: '', feedCategory: '', quantity: '', cost: '', supplier: '', purchaseDate: '', consumption: '', feedPricePerkg: '', feedName:'' });
        setIsModalOpen(false);
        // Refresh data
        const fetchResponse = await axios.get(backendUrl+'/api/feed/feed', { withCredentials: true });
        setFeeds(fetchResponse.data.message || []);
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
        const response = await axios.get(backendUrl+'/api/feed/feed', { withCredentials: true });
        setFeeds(response.data.message || []);
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
    { key: 'poultryType', label: 'Poultry Type', render: (value, row) => value || parsePoultryType(row.feedType) },
    { key: 'feedCategory', label: 'Feed Category', render: (value, row) => value || parseFeedCategory(row.feedType) },
    { key: 'quantity', label: 'Quantity (kg)' },
    { key: 'consumption', label: 'Consumed (kg)' },
    { key: 'feedPricePerkg', label: 'Price per kg (₦)' },
    {key:'feedName', label:'Feed Name'},
    {
      key: 'quantity',
      label: 'Remaining',
      render: (_, row) => {
        const remaining = row.quantity - row.consumption;
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard label="Total Feed (kg)" value={feeds.reduce((sum, item) => sum + item.quantity, 0).toLocaleString()} />
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
            Weekly Consumption Trend
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
            label="Feed Type"
            type="text"
            name="feedType"
            options={FEED_TYPE}
            value={formData.feedType}
            onChange={handleChange}
            error={errors.feedType}
            required
          />
          <Select
            label="Poultry Type"
            name="poultryType"
            options={POULTRY_TYPES}
            value={formData.poultryType}
            onChange={handleChange}
            error={errors.poultryType}
          />
          
          <Select
            label="Feed Category"
            name="feedCategory"
            options={FEED_CATEGORY}
            value={formData.feedCategory}
            onChange={handleChange}
            error={errors.feedCategory}
          />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4">
            <Input
              label="Quantity (kg)"
              type="number"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              error={errors.quantity}
              required
            />
            <Input
              label="Cost (₦)"
              type="number"
              name="cost"
              value={formData.cost}
              onChange={handleChange}
              error={errors.cost}
              required
            />
          </div>
          <Input
            label="Supplier"
            type="text"
            name="supplier"
            value={formData.supplier}
            onChange={handleChange}
            error={errors.supplier}
            required
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4">
            <Input
              label="Consumption (kg)"
              type="number"
              name="consumption"
              value={formData.consumption}
              onChange={handleChange}
              error={errors.consumption}
              required
            />
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
