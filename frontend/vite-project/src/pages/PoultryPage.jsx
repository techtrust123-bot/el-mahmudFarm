import React, { useState,useEffect } from 'react';
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
import { POULTRY_TYPES, VACCINATION_STATUS } from '../utils/constants';
import { AuthContext } from '../context/AuthContext';
import { useContext } from 'react';
import { downloadExport, getDefaultFilename } from '../utils/exportHelper';

/**
 * Poultry Management Page
 */
const PoultryPage = () => {
  const [poultry, setPoultry] = useState([]);
  const [availablePoultry, setAvailablePoultry] = useState([]);
  const [soldPoultry, setSoldPoultry] = useState([]);
  const [activeTab, setActiveTab] = useState('available');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedHistoricalRecord, setSelectedHistoricalRecord] = useState(null);
  const [isHistoricalModalOpen, setIsHistoricalModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const {axiosInstance} = useContext(AuthContext)
  const [loading, setLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    batchId: '',
    type: '',
    quantity: '',
    vaccinationStatus: '',
    feedConsumption: '',
    purchaseDate: '',
    poultrySalePrice: '',
    mortality: '',
    poultryConsumePerBird:'',
    purchasePrice: '',
    costPerPoultry: '',
  });
  const [errors, setErrors] = useState({});

  const filteredPoultry = (activeTab === 'available' ? availablePoultry : soldPoultry).filter((item) => {
    const matchesSearch = item.batchId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !filterType || item.type === filterType;
    return matchesSearch && matchesType;
  });

  const getStatistics = (data) => {
    const totalQuantity = data.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const totalMortality = data.reduce((sum, item) => sum + Number(item.mortality || 0), 0);
    const vaccinatedBatches = data.filter((item) => item.vaccinationStatus === "vaccinated").length;
    const remainingBirds = totalQuantity;
    const starterFeed = data.filter(item => item.currentFeedStage === 'Starter').reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const growerFeed = data.filter(item => item.currentFeedStage === 'Grower').reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const finisherFeed = data.filter(item => item.currentFeedStage === 'Finisher').reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const avgFeedConsumption = data.length > 0 ? (data.reduce((sum, item) => sum + Number(item.poultryConsumePerkg || 0), 0) / data.length).toFixed(2) : 0;
    return { totalQuantity, totalMortality, vaccinatedBatches, remainingBirds, starterFeed, growerFeed, finisherFeed, avgFeedConsumption };
  };

  const stats = getStatistics(activeTab === 'available' ? availablePoultry : soldPoultry);
  const { remainingBirds, totalMortality, vaccinatedBatches, starterFeed, growerFeed, finisherFeed, avgFeedConsumption } = stats;


  useEffect(() => {
    const fetchPoultry = async () => {
      try {
        setTimeout(async()=>{
          const [availableRes, soldRes] = await Promise.all([
            axiosInstance.get('/api/poultry/available'),
            axiosInstance.get('/api/poultry/sold')
          ]);
          setAvailablePoultry(availableRes.data.data);
          setSoldPoultry(soldRes.data.data);
          setPoultry([...availableRes.data.data, ...soldRes.data.data]);
        }, 1000)
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    };
    fetchPoultry();
  }, []);

  const handleAddNew = () => {
    setFormData({
      batchId: '',
      type: '',
      quantity: '',
      vaccinationStatus: '',
      poultryConsumePerBird: '',
      purchaseDate: '',
      // ageInWeeks: '',
      // ageInDays: '',
      mortality: '',
      purchasePrice: '',
    });
    setEditingId(null);
    setErrors({});
    setIsModalOpen(true);
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await downloadExport('poultry', axiosInstance, getDefaultFilename('poultry'));
      toast.success('Poultry data exported successfully!');
    } catch (error) {
      toast.error(error.message || 'Failed to export poultry data');
    } finally {
      setIsExporting(false);
    }
  };

 

  const handleEdit = async (item) => {
  try {
      setFormData({
        batchId: item.batchId,
        type: item.type,
        quantity: item.quantity,
        vaccinationStatus: item.vaccinationStatus,
        purchaseDate: item.purchaseDate ? new Date(item.purchaseDate).toISOString().split('T')[0] : '',
        poultrySalePrice: item.poultrySalePrice || '',
        mortality: item.mortality || '',
        purchasePrice: item.purchasePrice || '',
      });

      setEditingId(item._id);
      setErrors({});
      setIsModalOpen(true);
  } catch (error) {
    toast.error('Error fetching poultry details');
    console.error('Error fetching poultry details:', error);
  }
  };


  const handleDelete = async (id) => {
    if (!window.confirm(`Are you show you want to delete ${id}?`)) return;
    try {
      await axiosInstance.delete(`/api/poultry/${id}`);
      setAvailablePoultry((prev) => prev.filter((item) => item._id !== id));
      setSoldPoultry((prev) => prev.filter((item) => item._id !== id));
      setPoultry((prev) => prev.filter((item) => item._id !== id));
      toast.success('Poultry deleted successfully!');
    } catch (error) {
      console.log(error);
      toast.error(error.response?.data?.message || 'Error deleting poultry');
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
    const requiredFields = ['type', 'quantity', 'vaccinationStatus', 'purchasePrice'];
    const newErrors = {};
    requiredFields.forEach(field => {
      if (!formData[field] || formData[field].toString().trim() === '') {
        newErrors[field] = `${field} is required`;
      }
    });

    if (!formData.purchaseDate) {
      newErrors.purchaseDate = 'Either purchase date or age in weeks/days is required';
      // if (!formData.ageInWeeks) newErrors.ageInWeeks = 'Enter age in weeks or days';
      // if (!formData.ageInDays) newErrors.ageInDays = 'Enter age in weeks or days';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      let response;
      if (editingId) {
        response = await axiosInstance.put(`/api/poultry/edit/${editingId}`, formData);
      } else {
        response = await axiosInstance.post('/api/poultry/add-poultry', formData);
      }
      if (response.data.success) {
        toast.success(response.data.message || 'Poultry saved successfully');
        setFormData({
          batchId: '',
          type: '',
          quantity: '',
          vaccinationStatus: '',
          purchaseDate: '',
          mortality: '',
          purchasePrice: '',
          poultrySalePrice: '',
        });
        setIsModalOpen(false);
        // Refresh data
        setTimeout(async()=>{
          const [availableRes, soldRes] = await Promise.all([
            axiosInstance.get('/api/poultry/available'),
            axiosInstance.get('/api/poultry/sold')
          ]);
          setAvailablePoultry(availableRes.data.data);
          setSoldPoultry(soldRes.data.data);
          setPoultry([...availableRes.data.data, ...soldRes.data.data]);
        }, 5000)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error saving poultry');
      console.error( error);
    }
  }
     const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN'
  }).format(amount);
  const tableColumns = [
    {key: 'purchaseDate', label: 'Purchase Date', render: (value) => value ? new Date(value).toLocaleDateString() : 'N/A' },
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
    {key: 'poultrySalePrice', label: 'Sale Price', render:(value)=> formatCurrency(value)},
    {
      key: 'vaccinationStatus',
      label: 'Vaccination',
      render: (value) => {
        const status = VACCINATION_STATUS.find((s) => s.value === value);
        return <Badge variant={value === 'vaccinated' ? 'success' : 'warning'}>{status?.label}</Badge>;
      },
    },
    { key: 'poultryConsumePerBird', label: 'Feed (kg)'},
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
          <div className="flex gap-2">
            <Button variant="outline" size="lg" onClick={handleExport} disabled={isExporting} className="flex items-center gap-2">
              <FiDownload size={20} />
              {isExporting ? 'Exporting...' : 'Export'}
            </Button>
            <Button variant="primary" size="lg" onClick={handleAddNew} className="flex items-center gap-2">
              <FiPlus size={20} />
              Add Batch
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
            Available ({availablePoultry.length})
          </button>
          <button
            onClick={() => setActiveTab('sold')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'sold'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Sold ({soldPoultry.length})
          </button>
        </div>

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

      <HistoricalDataModal
        isOpen={isHistoricalModalOpen}
        onClose={handleCloseHistoricalData}
        data={selectedHistoricalRecord}
        type="poultry"
      />

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Poultry Batch' : 'Add New Batch'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4">
           
            
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

              <CurrencyInput
                label="Purchase Price (₦)"
                name="purchasePrice"
                value={formData.purchasePrice}
                onChange={handleChange}
                error={errors.purchasePrice}
                required
              />
            
            < CurrencyInput
              label="Sale Price (₦)"
              name="poultrySalePrice"
              value={formData.poultrySalePrice}
              onChange={handleChange}
              error={errors.poultrySalePrice}
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
            <Button variant="primary" type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : editingId ? 'Update' : 'Add'} Batch
            </Button>
          </div>
        </form>
      </Modal>
    </MainLayout>
  );
};


export default PoultryPage;
