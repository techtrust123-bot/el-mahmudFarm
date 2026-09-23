import React, { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiDownload, FiClock } from 'react-icons/fi';
import MainLayout from '../layouts/MainLayout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import CurrencyInput from '../components/ui/CurrencyInput';
import Select from '../components/ui/Select';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import StatCard from '../components/ui/StatCard';
import HistoricalDataModal from '../components/feedHistory/HistoricalDataModal';
import { toast } from 'react-hot-toast';
import { LIVESTOCK_TYPES, HEALTH_STATUS } from '../utils/constants';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { downloadExport, getDefaultFilename } from '../utils/exportHelper';


/**
 * Livestock Management Page
 */
const LivestockPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterHealth, setFilterHealth] = useState('');
  const [activeTab, setActiveTab] = useState('available');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedHistoricalRecord, setSelectedHistoricalRecord] = useState(null);
  const [isHistoricalModalOpen, setIsHistoricalModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { axiosInstance } = useContext(AuthContext);
  const [livestockList, setLivestockList] = useState([]);
  const [availableLivestock, setAvailableLivestock] = useState([]);
  const [soldLivestock, setSoldLivestock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    tagNumber: '',
    breed: '',
    age: '',
    weight: '',
    healthStatus: '',
    purchaseDate: '',
    purchasePrice: '',
    livestockSalePrice:'',
    type: '',
  });
  const [errors, setErrors] = useState({});

  const filteredLivestock = (activeTab === 'available' ? availableLivestock : soldLivestock).filter((item) => {
    const matchesSearch =
      item.tagNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.breed.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !filterType || item.type === filterType;
    const matchesHealth = !filterHealth || item.healthStatus === filterHealth;
    return matchesSearch && matchesType && matchesHealth;
  });

  const getStatistics = (data) => {
    const totalLivestocks = data.length;
    const totalCost = data.reduce((sum,item)=> sum + Number(item.totalCost), 0)
    const avgFeedConsumption = data.length > 0 ? (data.reduce((sum, item) => sum + Number(item.livestockFeedConsumed || 0), 0) / data.length).toFixed(2) : 0
    const starterStage = data.filter(item => item.feedStage === 'Starter').length
    const growerStage = data.filter(item => item.feedStage === 'Grower').length
    const finisherStage = data.filter(item => item.feedStage === 'Finisher').length
    return { totalLivestocks, totalCost, avgFeedConsumption, starterStage, growerStage, finisherStage };
  };

  const stats = getStatistics(activeTab === 'available' ? availableLivestock : soldLivestock);
  const { totalLivestocks, totalCost, avgFeedConsumption, starterStage, growerStage, finisherStage } = stats;

  const handleAddNew = () => {
    setFormData({
      tagNumber: '',
      breed: '',
      age: '',
      weight: '',
      healthStatus: '',
      purchaseDate: '',
      purchasePrice: '',
      livestockSalePrice:'',
      type: '',
    });
    setEditingId(null);
    setErrors({});
    setIsModalOpen(true);
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await downloadExport('livestock', axiosInstance, getDefaultFilename('livestock'));
      toast.success('Livestock data exported successfully!');
    } catch (error) {
      toast.error(error.message || 'Failed to export livestock data');
    } finally {
      setIsExporting(false);
    }
  };

  const handleEdit = async (item) => {
    const response = await axiosInstance.get(`/api/livestock/${item._id}`);
    if(response.data.success){
    setFormData({
      tagNumber: item.tagNumber,
      breed: item.breed,
      age: item.age,
      weight: item.weight,
      healthStatus: item.healthStatus,
      purchaseDate: item.purchaseDate ? new Date(item.purchaseDate).toISOString().split('T')[0] : '',
      purchasePrice: item.purchasePrice,
      livestockSalePrice: item.livestockSalePrice || '',
      type: item.type,
    });
    } else {
      toast.error('Error fetching livestock details');
      return;
    }
    setEditingId(item._id);
    setErrors({});
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm(`Are you show you want to delete ${id}?`)) return;
    try {
      await axiosInstance.delete(`/api/livestock/${id}`);
      setLivestockList((prev) => prev.filter((item) => item._id !== id));
      setAvailableLivestock((prev) => prev.filter((item) => item._id !== id));
      setSoldLivestock((prev) => prev.filter((item) => item._id !== id));
      toast.success('Livestock deleted successfully!');
    } catch (error) {
      console.log(error);
      toast.error('Error deleting livestock');
    }
  };

  const handleOpenHistoricalData = (row) => {
    setSelectedHistoricalRecord(row);
    setIsHistoricalModalOpen(true);
  };

  const handleCloseHistoricalData = () => {
    setSelectedHistoricalRecord(null);
    setIsHistoricalModalOpen(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    console.log('Input Change:', name, value);
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async(e) => {
    e.preventDefault();
    const newErrors = {};
    if (!formData.purchaseDate) {
      newErrors.purchaseDate = 'Either purchase date or age in weeks/days is required';
      
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    try {
      let response;
      if (editingId) {
        response = await axiosInstance.put(`/api/livestock/edit/${editingId}`, formData);
      } else {
        response = await axiosInstance.post('/api/livestock/add-animal', formData);
      }
      if (response.data.success) {
        toast.success(response.data.message || 'Livestock saved successfully');
        setFormData({
          tagNumber: '',
          breed: '',
          age: '',
          weight: '',
          healthStatus: '',
          purchaseDate: '',
          purchasePrice: '',
          livestockSalePrice:'',
          type: '',
        });
        setIsModalOpen(false);
        // Refresh data
        const [availableRes, soldRes] = await Promise.all([
          axiosInstance.get('/api/livestock/available'),
          axiosInstance.get('/api/livestock/sold')
        ]);
        setAvailableLivestock(availableRes.data.data);
        setSoldLivestock(soldRes.data.data);
        setLivestockList([...availableRes.data.data, ...soldRes.data.data]);
      }
    } catch (error) {
      console.log(error);
      toast.error(error.response?.data?.message || 'Error saving livestock');
    }
  };
  useEffect(()=>{
    console.log('Fetching livestock data...');
    const fetchLivestock = async()=>{
      try {
        const [availableRes, soldRes] = await Promise.all([
          axiosInstance.get('/api/livestock/available'),
          axiosInstance.get('/api/livestock/sold')
        ]);
        console.log('Fetched available:', availableRes.data.data);
        console.log('Fetched sold:', soldRes.data.data);
        setAvailableLivestock(availableRes.data.data);
        setSoldLivestock(soldRes.data.data);
        setLivestockList([...availableRes.data.data, ...soldRes.data.data]);
      } catch (error) {
        console.log(error)
      } finally {
        setLoading(false)
      }
    }
    fetchLivestock()
  },[])

    const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN'
  }).format(amount);
  const tableColumns = [
    {key: 'purchaseDate', label: 'Purchase Date', render: (value) => value ? new Date(value).toLocaleDateString() : 'N/A' },
    { key: 'tagNumber', label: 'Tag Number' },
    { key: 'type', label: 'Type', render: (value) => LIVESTOCK_TYPES.find((t) => t.value === value)?.label || value },
    { key: 'breed', label: 'Breed' },
    // { key: 'age', label: 'Age (years)' },
    { key: 'ageInDays', label: 'Age (days)' },
    { key: 'ageInWeeks', label: 'Age (weeks)' },
    { key: 'feedStage', label: 'Feed Stage', render: (value) => {
      const stageColors = {
        'Starter': 'success',
        'Grower': 'warning',
        'Finisher': 'error',
      }
      return <Badge variant={stageColors[value] || 'default'}>{value}</Badge>
    }},
    // { key: 'currentFeedType', label: 'Current Feed Type' },
    { key: 'currentFeedName', label: 'Current Feed Name' },
    { key: 'weight', label: 'Weight (kg)' },
    { key: 'purchasePrice', label: 'purchase Price',render:(value)=> formatCurrency(value) },
    { key: 'livestockFeedConsumed', label: 'feed Consumed (kg)' },
    { key: 'totalCost', label: 'costPrice',render:(value)=> formatCurrency(value) },
    {key: 'livestockSalePrice', label: 'sale Price',render:(value)=> formatCurrency(value) },
    {key: 'status', label: 'status', render:(value)=>{
      const status = value === 'available' ? 'success' : value === 'sold' ? 'error' : 'warning'
      return <Badge variant={status}>{value}</Badge>
     },
    },
    {
      key: 'healthStatus',
      label: 'Health Status',
      render: (value) => {
        const status = HEALTH_STATUS.find((s) => s.value === value);
        return <Badge variant={value === 'healthy' ? 'success' : value === 'sick' ? 'error' : 'warning'}>{status?.label || value}</Badge>;
      },
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Livestock Management</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Manage and track your livestock inventory</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="lg" onClick={handleExport} disabled={isExporting} className="flex items-center gap-2">
              <FiDownload size={20} />
              {isExporting ? 'Exporting...' : 'Export'}
            </Button>
            <Button variant="primary" size="lg" onClick={handleAddNew} className="flex items-center gap-2">
              <FiPlus size={20} />
              Add Livestock
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('available')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'available'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Available ({availableLivestock.length})
          </button>
          <button
            onClick={() => setActiveTab('sold')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'sold'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Sold ({soldLivestock.length})
          </button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
          <StatCard label="Total Livestocks" value={totalLivestocks} />
          <StatCard label="Total Cost" value={`${formatCurrency(totalCost)}`} />
          <StatCard label="Avg Feed (kg)" value={avgFeedConsumption} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          <StatCard label="Starter Stage" value={starterStage} />
          <StatCard label="Grower Stage" value={growerStage} />
          <StatCard label="Finisher Stage" value={finisherStage} />
        </div>
        {/* Filters */}
        <Card className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <Input
              placeholder="Search by tag or breed..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
              icon={FiSearch}
            />
            <Select
              options={LIVESTOCK_TYPES}
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              placeholder="Filter by type"
            />
            <Select
              options={HEALTH_STATUS}
              value={filterHealth}
              onChange={(e) => setFilterHealth(e.target.value)}
              placeholder="Filter by health"
            />
            {(searchTerm || filterType || filterHealth) && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSearchTerm('');
                  setFilterType('');
                  setFilterHealth('');
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </Card>

        {/* Table View */}
        <Card className="overflow-x-auto">
          <Table
            columns={tableColumns}
            data={filteredLivestock}
            loading={loading}
            actions={(row) => [
              <Button
                key="history"
                type="button"
                variant="ghost"
                size="sm"
                title="View Historical Data"
                aria-label="View Historical Data"
                onClick={() => handleOpenHistoricalData(row)}
                className="inline-flex items-center justify-center gap-1 rounded-md border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 focus:ring-blue-500 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
              >
                <FiClock size={14} />
                <span className="hidden sm:inline">History</span>
              </Button>,
              <Button key="edit" variant="outline" size="sm" onClick={() => handleEdit(row)} className="flex items-center gap-1">
                <FiEdit2 size={13} />
                Edit
              </Button>,
              <Button key="delete" variant="danger" size="sm" onClick={() => handleDelete(row._id)} className="flex items-center gap-1">
                <FiTrash2 size={14} />
                Delete
              </Button>,
            ]}
          />
        </Card>

        <HistoricalDataModal
          isOpen={isHistoricalModalOpen}
          onClose={handleCloseHistoricalData}
          data={selectedHistoricalRecord}
          type="livestock"
        />
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Livestock' : 'Add New Livestock'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4">
            <Select
              label="Type"
              name="type"
              options={LIVESTOCK_TYPES}
              value={formData.type}
              onChange={handleChange}
              error={errors.type}
              required
            />
            <Input
              label="Tag Number"
              type="text"
              name="tagNumber"
              value={formData.tagNumber}
              onChange={handleChange}
              error={errors.tagNumber}
              placeholder="e.g., COW-001"
              required
            />
            <Input
              label="Breed"
              type="text"
              name="breed"
              value={formData.breed}
              onChange={handleChange}
              error={errors.breed}
              required
            />
            <Input
              label="Age (years)"
              type="number"
              name="age"
              value={formData.age}
              onChange={handleChange}
              error={errors.age}
              required
            />
            <Input
              label="Weight (kg)"
              type="number"
              name="weight"
              value={formData.weight}
              onChange={handleChange}
              error={errors.weight}
              required
            />
            <CurrencyInput
              label="Purchase Price"
              name="purchasePrice"
              value={formData.purchasePrice}
              onChange={handleChange}
              error={errors.purchasePrice}
              required
            />
            <CurrencyInput
              label="Sale Price"
              name="livestockSalePrice"
              value={formData.livestockSalePrice}
              onChange={handleChange}
              error={errors.livestockSalePrice}
            />
            <Input
              label="Purchase Date"
              type="date"
              name="purchaseDate"
              value={formData.purchaseDate}
              onChange={handleChange}
              error={errors.purchaseDate}
              required
            />
          <Select
            label="Health Status"
            name="healthStatus"
            options={HEALTH_STATUS}
            value={formData.healthStatus}
            onChange={handleChange}
            error={errors.healthStatus}
            required
          />
          </div>

          {editingId && (
            <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 p-4">
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-3">Calculated Information</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {livestockList.find(item => item._id === editingId)?.ageInDays && (
                  <>
                    <div>
                      <p className="text-xs text-blue-700 dark:text-blue-300">Age (Days)</p>
                      <p className="text-lg font-semibold text-blue-900 dark:text-blue-100">{livestockList.find(item => item._id === editingId)?.ageInDays || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-blue-700 dark:text-blue-300">Age (Weeks)</p>
                      <p className="text-lg font-semibold text-blue-900 dark:text-blue-100">{livestockList.find(item => item._id === editingId)?.ageInWeeks || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-blue-700 dark:text-blue-300">Feed Stage</p>
                      <Badge variant={
                        livestockList.find(item => item._id === editingId)?.feedStage === 'Starter' ? 'success' :
                        livestockList.find(item => item._id === editingId)?.feedStage === 'Grower' ? 'warning' :
                        'error'
                      }>{livestockList.find(item => item._id === editingId)?.feedStage || 'N/A'}</Badge>
                    </div>
                  </>
                )}
              </div>
            </Card>
          )}

          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : editingId ? 'Update' : 'Add'} Livestock
            </Button>
          </div>
        </form>
      </Modal>
    </MainLayout>
  );
};

export default LivestockPage;
