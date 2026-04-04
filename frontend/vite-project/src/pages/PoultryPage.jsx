import React, { useState,useEffect } from 'react';
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
import { POULTRY_TYPES, VACCINATION_STATUS } from '../utils/constants';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { useContext } from 'react';

/**
 * Poultry Management Page
 */
const PoultryPage = () => {
  const [poultry, setPoultry] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [alert, setAlert] = useState(null);
  const {backendUrl} = useContext(AuthContext)
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    batchId: '',
    type: '',
    quantity: '',
    vaccinationStatus: '',
    feedConsumption: '',
    purchaseDate: '',
    mortality: '',
    poultryConsumePerkg:'',
    purchasePrice: '',
    costPerPoultry: '',
  });
  const [errors, setErrors] = useState({});

  const filteredPoultry = poultry.filter((item) => {
    const matchesSearch = item.batchId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !filterType || item.type === filterType;
    return matchesSearch && matchesType;
  });

const totalQuantity = poultry.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

const totalMortality = poultry.reduce((sum, item) => sum + Number(item.mortality || 0), 0);

const vaccinatedBatches = poultry.filter(
  (item) => item.vaccinationStatus === "vaccinated"
).length;

const remainingBirds = totalQuantity - totalMortality;

const starterFeed = poultry.filter(item => item.currentFeedStage === 'Starter').reduce((sum, item) => sum + Number(item.quantity || 0), 0);
const growerFeed = poultry.filter(item => item.currentFeedStage === 'Grower').reduce((sum, item) => sum + Number(item.quantity || 0), 0);
const finisherFeed = poultry.filter(item => item.currentFeedStage === 'Finisher').reduce((sum, item) => sum + Number(item.quantity || 0), 0);
const avgFeedConsumption = poultry.length > 0 ? (poultry.reduce((sum, item) => sum + Number(item.poultryConsumePerkg || 0), 0) / poultry.length).toFixed(2) : 0


  useEffect(() => {
    const fetchPoultry = async () => {
      try {
        setTimeout(async()=>{
          // setLoading(true);
          const response = await axios.get(backendUrl+'/api/poultry/list', { withCredentials: true });
          setPoultry(response.data.data);

        }, 1000)
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    };
    fetchPoultry();
  }, [backendUrl]);

  const handleAddNew = () => {
    setFormData({
      batchId: '',
      type: '',
      quantity: '',
      vaccinationStatus: '',
      poultryConsumePerkg: '',
      purchaseDate: '',
      mortality: '',
      purchasePrice: '',
    });
    setEditingId(null);
    setErrors({});
    setIsModalOpen(true);
  };

 

  const handleEdit = async (item) => {
  try {
      setFormData({
        batchId: item.batchId,
        type: item.type,
        quantity: item.quantity,
        vaccinationStatus: item.vaccinationStatus,
        purchaseDate: item.purchaseDate ? new Date(item.purchaseDate).toISOString().split('T')[0] : '',
        mortality: item.mortality || '',
        purchasePrice: item.purchasePrice || '',
      });

      setEditingId(item._id);
      setErrors({});
      setIsModalOpen(true);
  } catch (error) {
    setAlert({ type: 'error', message: 'Error fetching poultry details' });
    console.error('Error fetching poultry details:', error);
  }
  };


  const handleDelete = async (id) => {
    try {
      await axios.delete(`${backendUrl}/api/poultry/${id}`, { withCredentials: true });
      setPoultry((prev) => prev.filter((item) => item._id !== id));
      setAlert({ type: 'success', message: 'Poultry deleted successfully!' });
    } catch (error) {
      console.log(error);
      setAlert({ type: 'error', message: error.response?.data?.message || 'Error deleting poultry' });
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

    // Validate required fields
    const requiredFields = ['batchId', 'type', 'quantity', 'purchaseDate', 'vaccinationStatus', 'purchasePrice'];
    const newErrors = {};
    requiredFields.forEach(field => {
      if (!formData[field] || formData[field].toString().trim() === '') {
        newErrors[field] = `${field} is required`;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      let response;
      if (editingId) {
        response = await axios.put(`${backendUrl}/api/poultry/edit/${editingId}`, formData, { withCredentials: true });
      } else {
        response = await axios.post(backendUrl+'/api/poultry/add-poultry', formData, { withCredentials: true });
      }
      if (response.data.success) {
        setAlert({ type: 'success', message: response.data.message });
        setFormData({
          batchId: '',
          type: '',
          quantity: '',
          vaccinationStatus: '',
          purchaseDate: '',
          mortality: '',
          purchasePrice: '',
        });
        setIsModalOpen(false);
        // Refresh data
        setTimeout(async()=>{
          const fetchResponse = await axios.get(backendUrl+'/api/poultry/list', { withCredentials: true });
          setPoultry(fetchResponse.data.data);
        }, 5000)
      }
    } catch (error) {
      setAlert({ type: 'error', message: error.response?.data?.message});
      console.error( error);
    }
  }
     const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN'
  }).format(amount);
  const tableColumns = [
    { key: 'batchId', label: 'BatchID' ,style: { fontSize: 'small' } },
    { key: 'type', label: 'Type', render: (value) => POULTRY_TYPES.find((t) => t.value === value)?.label },
    { key: 'quantity', label: 'Quantity' },
    { key: 'mortality', label: 'Mortality' },
    { key: 'purchasePrice', label: 'Purchase Price', render: (value) => formatCurrency(value) },
    { key: 'currentFeedType', label: 'Current FeedType' },
    // { key: 'currentFeedName', label: 'Current Feed Name' },
    { key: 'ageInDays', label: 'Days' },
    { key: 'ageInWeeks', label: 'Weeks' },
    { key: 'currentFeedStage', label: 'FeedStage' },
    // { key: 'totalCostPerPoultry', label: 'Total Cost Per Poultry' },
    { key: 'costPerPoultry', label: 'Cost PerPoultry',render:(value)=> formatCurrency(value) },
    {
      key: 'vaccinationStatus',
      label: 'Vaccination',
      render: (value) => {
        const status = VACCINATION_STATUS.find((s) => s.value === value);
        return <Badge variant={value === 'vaccinated' ? 'success' : 'warning'}>{status?.label}</Badge>;
      },
    },
    { key: 'poultryConsumePerkg', label: 'Feed (kg)' },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Poultry Management</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Monitor and manage poultry batches</p>
          </div>
          <Button variant="primary" size="lg" onClick={handleAddNew} className="flex items-center gap-2">
            <FiPlus size={20} />
            Add Batch
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Poultry" value={remainingBirds.toLocaleString()} />
          <StatCard label="Total Mortality" value={totalMortality} />
          <StatCard label="Vaccinated Batches" value={vaccinatedBatches} />
          <StatCard label="Avg Feed (kg)" value={avgFeedConsumption} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard label="Starter Stage (qty)" value={starterFeed.toLocaleString()} />
          <StatCard label="Grower Stage (qty)" value={growerFeed.toLocaleString()} />
          <StatCard label="Finisher Stage (qty)" value={finisherFeed.toLocaleString()} />
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <Input
              placeholder="Search by batch ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select
              options={POULTRY_TYPES}
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              placeholder="Filter by type"
            />
            {(searchTerm || filterType) && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSearchTerm('');
                  setFilterType('');
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </Card>

        {/* Table */}
        <Card className="overflow-x-auto">
          <Table
            columns={tableColumns}
            data={filteredPoultry}
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

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Poultry Batch' : 'Add New Batch'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4">
            <Input
              label="Batch ID"
              type="text"
              name="batchId"
              value={formData.batchId}
              onChange={handleChange}
              error={errors.batchId}
              required
            />
            
            <Select
              label="Type"
              name="type"
              options={POULTRY_TYPES}
              value={formData.type}
              onChange={handleChange}
              error={errors.type}
              required
            />
            <Input
              label="Quantity"
              type="number"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              error={errors.quantity}
              required
            />
            <Input
              label="Mortality"
              type="number"
              name="mortality"
              value={formData.mortality}
              onChange={handleChange}
              error={errors.mortality}
            />
            {formData.type === 'layer' || formData.type === 'broiler' ? (
              <Input
                label="Purchase Price (₦)"
                type="number"
                name="purchasePrice"
                value={formData.purchasePrice}
                onChange={handleChange}
                error={errors.purchasePrice}
                required
              />
            ) : null}
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
              label="Vaccination Status"
              name="vaccinationStatus"
              options={VACCINATION_STATUS}
              value={formData.vaccinationStatus}
              onChange={handleChange}
              error={errors.vaccinationStatus}
              required
            />
          </div>

          {editingId && (
            <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 p-4">
              <h3 className="text-sm font-semibold text-green-900 dark:text-green-200 mb-3">Calculated Information</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {poultry.find(item => item._id === editingId)?.ageInDays && (
                  <>
                    <div>
                      <p className="text-xs text-green-700 dark:text-green-300">Age (Days)</p>
                      <p className="text-lg font-semibold text-green-900 dark:text-green-100">{poultry.find(item => item._id === editingId)?.ageInDays || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-green-700 dark:text-green-300">Age (Weeks)</p>
                      <p className="text-lg font-semibold text-green-900 dark:text-green-100">{poultry.find(item => item._id === editingId)?.ageInWeeks || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-green-700 dark:text-green-300">Feed Stage</p>
                      <Badge variant={
                        poultry.find(item => item._id === editingId)?.currentFeedStage === 'Starter' ? 'success' :
                        poultry.find(item => item._id === editingId)?.currentFeedStage === 'Grower' ? 'warning' :
                        'error'
                      }>{poultry.find(item => item._id === editingId)?.currentFeedStage || 'N/A'}</Badge>
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
              {editingId ? 'Update' : 'Add'} Batch
            </Button>
          </div>
        </form>
      </Modal>
    </MainLayout>
  );
};


export default PoultryPage;
