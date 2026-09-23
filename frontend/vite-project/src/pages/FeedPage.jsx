import React, { useState, useEffect, useContext } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiAlertTriangle, FiDownload } from 'react-icons/fi';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import MainLayout from '../layouts/MainLayout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Alert from '../components/ui/Alert';
import StatCard from '../components/ui/StatCard';
import CurrencyInput from '../components/ui/CurrencyInput';
import { toast } from 'react-hot-toast';
import { AuthContext } from '../context/AuthContext';
import { FEED_CATEGORY, ANIMAL_TYPES } from '../utils/constants';
import { downloadExport, getDefaultFilename } from '../utils/exportHelper';
// import { FEED_TYPE, FEED_CATEGORY, POULTRY_TYPES,ANIMAL_TYPES } from '../utils/constants';

/**
 * Feed Management Page
 */
const FeedPage = () => {
  const [feeds, setFeeds] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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
  const [aiFeedInput, setAiFeedInput] = useState({
    animalType: '',
    ageMonths: '',
    weightKg: '',
    feedCategory: 'standard',
    pastureQuality: 'average',
  });
  const [aiRecommendation, setAiRecommendation] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const { axiosInstance } = useContext(AuthContext);

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

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await downloadExport('feed', axiosInstance, getDefaultFilename('feed'));
      toast.success('Feed data exported successfully!');
    } catch (error) {
      toast.error(error.message || 'Failed to export feed data');
    } finally {
      setIsExporting(false);
    }
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
    // if(formData.totalPoultryFeedConsumedPerday){
    //   formData.totalLivestockFeedConsumedPerday = 1;
    // }
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
        toast.success(response.data.message || 'Feed deleted successfully');
        return;
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete feed');
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
      };

      Object.keys(payload).forEach((key) => {
        if (payload[key] === '') {
          delete payload[key];
        }
      });

      if (editingId) {
        response = await axiosInstance.put(`/api/feed/edit/${editingId}`, payload);
      } else {
        response = await axiosInstance.post(`/api/feed/add-feed`, payload);
      }
      if (response?.data?.success) {
        toast.success(response.data.message || (editingId ? 'Feed updated successfully!' : 'Feed added successfully!'));
        
        setFormData({ feedType: '', poultryType: '', feedCategory: '', quantity: '', cost: '', supplier: '', purchaseDate: '', averageDailyConsumption: '', feedPricePerkg: '', feedName:'' });
        setIsModalOpen(false);
        // Refresh data
        const fetchResponse = await axiosInstance.get('/api/feed/feed');
        setFeeds(fetchResponse.data.data || fetchResponse.data.message || []);
      } else {
        toast.error(response.data.message || (editingId ? 'Failed to update feed' : 'Failed to add feed'));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || (editingId ? 'Failed to update feed' : 'Failed to add feed'));
    }
  }

  // const handleRecommendFeed = async () => {
  //   setAiError(null);
  //   setAiRecommendation(null);
  //   const { animalType, ageMonths, weightKg, feedCategory, pastureQuality } = aiFeedInput;

  //   if (!animalType || !ageMonths || !weightKg) {
  //     setAiError('Animal type, age in months and weight are required');
  //     return;
  //   }

  //   setAiLoading(true);
  //   try {
  //     const response = await axiosInstance.post('/api/ai/predict/feed', {
  //       animalType,
  //       ageMonths: Number(ageMonths),
  //       weightKg: Number(weightKg),
  //       feedCategory,
  //       pastureQuality,
  //     });
  //     if (response.data.success) {
  //       setAiRecommendation(response.data.data);
  //     } else {
  //       setAiError(response.data.message || 'Failed to get recommendation');
  //     }
  //   } catch (error) {
  //     setAiError(error.response?.data?.message || 'Failed to get recommendation');
  //   } finally {
  //     setAiLoading(false);
  //   }
  // }

  useEffect(() => {
    const fetchFeeds = async () => {
      try {
        const response = await axiosInstance.get('/api/feed/feed');
        setFeeds(response.data.data || response.data.message || []);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to fetch feeds');
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
    {key:'purchaseDate', label:'P/Date', render: (value) => value ? new Date(value).toLocaleDateString() : 'N/A' },
    { key: 'feedType', label: 'Feed Type' },
    { key: 'animalType', label: 'Animal Type', render: (value, row) => value || parseanimalType(row.feedType) },
    { key: 'feedCategory', label: 'Feed Category', render: (value, row) => value || parseFeedCategory(row.feedType) },
    { key: 'quantity', label: 'Quantity (kg)' },
    // { key: 'feedPricePerkg', label: 'pricePer kg (₦)', render: (value) => formatCurrency(Number(value || 0)) },
    { key: 'totalPoultryFeedConsumedPerday', label: 'Poultry daily Consum',style:{fontSize: 'small'} },
    { key: 'totalLivestockFeedConsumedPerday', label: 'Livestock daily Consum',style:{fontSize: 'small'} },
    { key: 'poultryDailyConsumption', label: 'per poultry Consume' },
    { key: 'livestockDailyConsumption', label: 'per Livestock Consume' },
    { key: 'consumption', label: 'Consumed (kg)' },
    { key: 'feedPricePerkg', label: 'price Per kg (₦)', render: (value) => formatCurrency(Number(value || 0)) },
    { key:'feedName', label:'Feed Name'},
    {
      key: 'quantity',
      label: 'Remain',
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
    // { key: 'supplier', label: 'Supplier' },
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
          <div className="flex gap-2">
            <Button variant="outline" size="lg" onClick={handleExport} disabled={isExporting} className="flex items-center gap-2">
              <FiDownload size={20} />
              {isExporting ? 'Exporting...' : 'Export'}
            </Button>
            <Button variant="primary" size="lg" onClick={handleAddNew} className="flex items-center gap-2">
              <FiPlus size={20} />
              Add Feed
            </Button>
          </div>
        </div>

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

        {/* AI Feed Recommendation */}
        {/* <Card className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">AI Feed Recommendation</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Get a recommended daily feed quantity based on animal type, age, and weight.
              </p>
            </div>
            <Button
              variant="primary"
              size="md"
              onClick={handleRecommendFeed}
              disabled={aiLoading}
            >
              {aiLoading ? 'Calculating...' : 'Get Recommendation'}
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
            <Select
              label="Animal Type"
              name="animalType"
              options={ANIMAL_TYPES}
              value={aiFeedInput.animalType}
              onChange={(e) => setAiFeedInput((prev) => ({ ...prev, animalType: e.target.value }))}
            />
            <Input
              label="Age (months)"
              type="number"
              name="ageMonths"
              value={aiFeedInput.ageMonths}
              onChange={(e) => setAiFeedInput((prev) => ({ ...prev, ageMonths: e.target.value }))}
            />
            <Input
              label="Weight (kg)"
              type="number"
              name="weightKg"
              value={aiFeedInput.weightKg}
              onChange={(e) => setAiFeedInput((prev) => ({ ...prev, weightKg: e.target.value }))}
            />
            <Select
              label="Feed Category"
              name="feedCategory"
              options={FEED_CATEGORY}
              value={aiFeedInput.feedCategory}
              onChange={(e) => setAiFeedInput((prev) => ({ ...prev, feedCategory: e.target.value }))}
            />
            <Select
              label="Pasture Quality"
              name="pastureQuality"
              options={[
                { label: 'Average', value: 'average' },
                { label: 'Good', value: 'good' },
                { label: 'Poor', value: 'poor' },
              ]}
              value={aiFeedInput.pastureQuality}
              onChange={(e) => setAiFeedInput((prev) => ({ ...prev, pastureQuality: e.target.value }))}
            />
          </div>

          {aiError && <Alert type="error" message={aiError} closeable onClose={() => setAiError(null)} />}
          {aiRecommendation && (
            <Card className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700">
              <div className="p-4">
                <h3 className="text-lg font-semibold text-emerald-800 dark:text-emerald-100">Recommendation</h3>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-200 mt-2">
                  {aiRecommendation.recommendedDailyFeedKg} kg/day
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  {aiRecommendation.note}
                </p>
              </div>
            </Card>
          )}
        </Card> */}

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
            <CurrencyInput
              label="Feed price (₦)"
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
            <Button variant="primary" type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...': editingId ? 'Update' : 'Add'} Feed
            </Button>
          </div>
        </form>
      </Modal>
    </MainLayout>
  );
};

export default FeedPage;
