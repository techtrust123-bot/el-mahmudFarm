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
import { validateForm, livestockSchema } from '../utils/validation';
import axios from 'axios';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';


/**
 * Livestock Management Page
 */
const LivestockPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterHealth, setFilterHealth] = useState('');
  const [viewMode, setViewMode] = useState('table');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [alert, setAlert] = useState(null);
  const { backendUrl } = useContext(AuthContext);
  const navigate = useNavigate();
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
      purchaseDate: item.purchaseDate,
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
  },[])

  
  const tableColumns = [
    { key: 'tagNumber', label: 'Tag Number' },
    { key: 'type', label: 'Type', render: (value) => LIVESTOCK_TYPES.find((t) => t.value === value)?.label || value },
    { key: 'breed', label: 'Breed' },
    { key: 'age', label: 'Age (years)' },
    { key: 'weight', label: 'Weight (kg)' },
    { key: 'purchasePrice', label: 'purchasePrice' },
    { key: 'livestockFeedConsumed', label: 'feedConsumed (kg)' },
    { key: 'totalCost', label: 'costPrice' },
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard label="Total Livestocks" value={totalLivestocks} />
          <StatCard label="Total LivestocksCost" value={totalCost} />
          <StatCard label="Total Sold" value={totalSold} />
          <StatCard label="Available Livestocks" value={totalAvailable} />
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
          </div>
          <Select
            label="Health Status"
            name="healthStatus"
            options={HEALTH_STATUS}
            value={formData.healthStatus}
            onChange={handleChange}
            error={errors.healthStatus}
            required
          />

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
