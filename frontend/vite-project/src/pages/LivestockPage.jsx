import React, { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiSearch } from 'react-icons/fi';
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
import { LIVESTOCK_TYPES, HEALTH_STATUS } from '../utils/constants';
import axios from 'axios';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';


/**
 * Livestock Management Page
 */
const LivestockPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterHealth, setFilterHealth] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [alert, setAlert] = useState(null);
  const { backendUrl } = useContext(AuthContext);
  const [livestockList, setLivestockList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    tagNumber: '',
    breed: '',
    age: '',
    weight: '',
    healthStatus: '',
    purchaseDate: '',
    purchasePrice: '',
    type: '',
  });
  const [errors, setErrors] = useState({});

  const filteredLivestock = livestockList.filter((item) => {
    const matchesSearch =
      item.tagNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.breed.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !filterType || item.type === filterType;
    const matchesHealth = !filterHealth || item.healthStatus === filterHealth;
    return matchesSearch && matchesType && matchesHealth;
  });

  const totalLivestocks = livestockList.length;
  const totalCost = livestockList.reduce((sum,item)=> sum + Number(item.totalCost), 0)
  const totalSold = livestockList.filter(item => item.status === 'sold').length
  const totalAvailable = livestockList.filter(item => item.status === 'available').length
  const avgFeedConsumption = livestockList.length > 0 ? (livestockList.reduce((sum, item) => sum + Number(item.livestockFeedConsumed || 0), 0) / livestockList.length).toFixed(2) : 0
  const starterStage = livestockList.filter(item => item.feedStage === 'Starter').length
  const growerStage = livestockList.filter(item => item.feedStage === 'Grower').length
  const finisherStage = livestockList.filter(item => item.feedStage === 'Finisher').length

  const handleAddNew = () => {
    setFormData({
      tagNumber: '',
      breed: '',
      age: '',
      weight: '',
      healthStatus: '',
      purchaseDate: '',
      purchasePrice: '',
      type: '',
    });
    setEditingId(null);
    setErrors({});
    setIsModalOpen(true);
  };

  const handleEdit = async (item) => {
    const response = await axios.get(`${backendUrl}/api/livestock/${item._id}`, { withCredentials: true });
    if(response.data.success){
    setFormData({
      tagNumber: item.tagNumber,
      breed: item.breed,
      age: item.age,
      weight: item.weight,
      healthStatus: item.healthStatus,
      purchaseDate: item.purchaseDate ? new Date(item.purchaseDate).toISOString().split('T')[0] : '',
      purchasePrice: item.purchasePrice,
      type: item.type,
    });
    } else {
      setAlert({ type: 'error', message: 'Error fetching livestock details' });
      return;
    }
    setEditingId(item._id);
    setErrors({});
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${backendUrl}/api/livestock/${id}`, { withCredentials: true });
      setLivestockList((prev) => prev.filter((item) => item._id !== id));
      setAlert({ type: 'success', message: 'Livestock deleted successfully!' });
    } catch (error) {
      console.log(error);
      setAlert({ type: 'error', message: 'Error deleting livestock' });
    }
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
    try {
      let response;
      if (editingId) {
        response = await axios.put(`${backendUrl}/api/livestock/edit/${editingId}`, formData, { withCredentials: true });
      } else {
        response = await axios.post(backendUrl + '/api/livestock/add-animal', formData, { withCredentials: true });
      }
      if (response.data.success) {
        setAlert({ type: "success", message: response.data.message });
        setFormData({
          tagNumber: '',
          breed: '',
          age: '',
          weight: '',
          healthStatus: '',
          purchaseDate: '',
          purchasePrice: '',
          type: '',
        });
        setIsModalOpen(false);
        // Refresh data
        const fetchResponse = await axios.get(backendUrl+'/api/livestock/list', { withCredentials: true });
        setLivestockList(fetchResponse.data.data);
      }
    } catch (error) {
      console.log(error);
      setAlert({ type: "error", message: error.response?.data?.message || 'Error saving livestock' });
    }
  };
  useEffect(()=>{
    console.log('Fetching livestock data...');
    const fetchLivestock = async()=>{
      try {
        const response = await axios.get(backendUrl+'/api/livestock/list',{withCredentials: true})
        console.log('Fetched data:', response.data.data);
        setLivestockList(response.data.data)
      } catch (error) {
        console.log(error)
      } finally {
        setLoading(false)
      }
    }
    fetchLivestock()
  },[backendUrl])

    const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN'
  }).format(amount);
  const tableColumns = [
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
          <Button variant="primary" size="lg" onClick={handleAddNew} className="flex items-center gap-2">
            <FiPlus size={20} />
            Add Livestock
          </Button>
        </div>

        {alert && (
          <Alert
            type={alert.type}
            message={alert.message}
            closeable
            onClose={() => setAlert(null)}
          />
        )}
        {/* Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
          <StatCard label="Total Livestocks" value={totalLivestocks} />
          <StatCard label="Total Cost" value={`${formatCurrency(totalCost)}`} />
          <StatCard label="Available" value={totalAvailable} />
          <StatCard label="Sold" value={totalSold} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
          <StatCard label="Avg Feed (kg)" value={avgFeedConsumption} />
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
              <Button key="edit" variant="outline" size="sm" onClick={() => handleEdit(row)} className="flex items-center gap-1">
                <FiEdit2 size={14} />
                Edit
              </Button>,
              <Button key="delete" variant="danger" size="sm" onClick={() => handleDelete(row._id)} className="flex items-center gap-1">
                <FiTrash2 size={14} />
                Delete
              </Button>,
            ]}
          />
        </Card>
       
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
            <Input
              label="Purchase Price"
              type="number"
              name="purchasePrice"
              value={formData.purchasePrice}
              onChange={handleChange}
              error={errors.purchasePrice}
              required
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
            <Button variant="primary" type="submit">
              {editingId ? 'Update' : 'Add'} Livestock
            </Button>
          </div>
        </form>
      </Modal>
    </MainLayout>
  );
};

export default LivestockPage;
