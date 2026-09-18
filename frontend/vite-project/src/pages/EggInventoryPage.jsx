import { useEffect, useMemo, useState } from 'react';
import { FiPlus } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { useContext } from 'react';
import MainLayout from '../layouts/MainLayout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import EggStatsCards from '../components/egg/EggStatsCards';
import EggFilters from '../components/egg/EggFilters';
import EggInventoryTable from '../components/egg/EggInventoryTable';
import EggRecordModal from '../components/egg/EggRecordModal';
import EggDetailsModal from '../components/egg/EggDetailsModal';
import EggInventoryHistory from '../components/egg/EggInventoryHistory';
import LowStockAlert from '../components/egg/LowStockAlert';
import { AuthContext } from '../context/AuthContext';

export const LOW_STOCK_THRESHOLD = 200;

const initialFilters = { search: '', fromDate: '', toDate: '', batch: '', typeOrStatus: '' };
const eggTypes = ['layer'];

const getAvailable = (record) => Number(record.avlDailyEgg ?? Math.max(0, record.quantityProduced - record.quantitySold - record.damaged));
const getStatus = (available) => available === 0 ? 'Sold Out' : available <= LOW_STOCK_THRESHOLD ? 'Low Stock' : 'Available';
const enrichRecord = (record) => {
  const mapped = {
    ...record,
    id: record._id || record.id,
    batchId: record.batchId,
    date: record.date || (record.createdAt ? new Date(record.createdAt).toISOString().slice(0, 10) : ''),
    poultryType: record.poultryType,
    quantityProduced: Number(record.totalDailyEgg || 0),
    quantitySold: Number(record.totalCrateSold || 0),
    damaged: Number(record.damageEggs || 0),
    salePrice: Number(record.salePrice || 0),
    costPricePerEgg: Number(record.costPricePerEgg || 0),
    cratePrice: Number(record.cratePrice || 0),
    totalEggCost: Number(record.totalEggCost || 0),
    profitPerEgg: Number(record.profitPerEgg || 0),
    totalEggProfit: Number(record.totalEggProfit || 0),
    AvailableEggCrates: Number(record.AvailableEggCrates || 0),
  };
  const available = getAvailable(mapped);
  return { ...mapped, available, status: getStatus(available) };
};

const EggInventoryPage = () => {
  const { axiosInstance } = useContext(AuthContext);
  const [eggRecords, setEggRecords] = useState([]);
  const [poultryBatches, setPoultryBatches] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const loadEggs = async () => {
      try {
        setLoading(true);
        const [eggResponse, poultryResponse] = await Promise.all([
          axiosInstance.get('/api/egg/get-eggs'),
          axiosInstance.get('/api/poultry/available'),
        ]);
        setEggRecords((eggResponse.data.data || []).map(enrichRecord));
        setPoultryBatches((poultryResponse.data.data || [])
          .filter((poultry) => poultry.type === 'layer' && poultry.batchId)
          .map((poultry) => poultry.batchId));
      } catch (error) {
        toast.error(error.response?.data?.message || 'Unable to load egg records.');
      } finally {
        setLoading(false);
      }
    };
    loadEggs();
  }, [axiosInstance]);

  const stats = useMemo(() => eggRecords.reduce((totals, record) => ({
    totalProduced: totals.totalProduced + record.quantityProduced,
    available: totals.available + record.available,
    sold: totals.sold + record.quantitySold,
    damaged: totals.damaged + record.damaged,
  }), { totalProduced: 0, available: 0, sold: 0, damaged: 0 }), [eggRecords]);

  const filteredRecords = useMemo(() => eggRecords.filter((record) => {
    const search = filters.search.toLowerCase();
    const matchesSearch = !search || [record.batchId, record.eggType, record.productionDate].some((value) => String(value || '').toLowerCase().includes(search));
    const matchesFrom = !filters.fromDate || record.productionDate >= filters.fromDate;
    const matchesTo = !filters.toDate || record.productionDate <= filters.toDate;
    const matchesBatch = !filters.batch || record.batchId === filters.batch;
    const matchesTypeOrStatus = !filters.typeOrStatus || record.eggType === filters.typeOrStatus || record.status === filters.typeOrStatus;
    return matchesSearch && matchesFrom && matchesTo && matchesBatch && matchesTypeOrStatus;
  }), [eggRecords, filters]);

  const updateFilter = (field, value) => setFilters((current) => ({ ...current, [field]: value }));
  const closeRecordModal = () => { setModalMode(null); setSelectedRecord(null); };

  const handleCreateEggRecord = async (payload) => {
    try {
      const response = await axiosInstance.post('/api/egg/add-egg', payload);
      const mappedRecord = enrichRecord(response.data.data);
      setEggRecords((current) => [mappedRecord, ...current]);
    setHistory((current) => [{
      id: Date.now(),
      kind: 'production',
      description: `${mappedRecord.quantityProduced.toLocaleString()} eggs added from ${mappedRecord.batchId}`,
      quantity: mappedRecord.quantityProduced,
      batch: mappedRecord.batchId,
      date: 'Just now',
    }, ...current]);
      toast.success(response.data.message || 'Egg record added');
      closeRecordModal();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to add egg record.');
    }
  };

  const handleUpdateEggRecord = async (payload) => {
    try {
      const response = await axiosInstance.put(`/api/egg/edit-egg/${payload.id}`, payload);
      const updated = enrichRecord(response.data.data);
      setEggRecords((current) => current.map((item) => item.id === updated.id ? updated : item));
    setHistory((current) => [{ id: Date.now(), kind: 'edit', description: `Egg record edited for ${updated.batchId}`, quantity: 0, batch: updated.batchId, date: 'Just now' }, ...current]);
      closeRecordModal();
      toast.success(response.data.message || 'Egg record updated');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to update egg record.');
    }
  };

  const handleDeleteEggRecord = async (record) => {
    if (!window.confirm(`Delete the egg record for ${record.batchId} on ${record.productionDate}?`)) return;
    try {
      await axiosInstance.delete(`/api/egg/delete-egg/${record.id}`);
      setEggRecords((current) => current.filter((item) => item.id !== record.id));
      toast.success('Egg record deleted');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to delete egg record.');
    }
  };

  const openEdit = (record) => { setSelectedRecord(record); setModalMode('edit'); };
  const batches = [...new Set([...poultryBatches, ...eggRecords.map((record) => record.batchId)].filter(Boolean))];
  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center"><div><p className="text-sm font-semibold uppercase tracking-wider text-emerald-600">Poultry operations</p><h1 className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">Egg Inventory</h1><p className="mt-1 text-gray-600 dark:text-gray-400">Manage egg production, inventory, sales, and damaged eggs.</p></div><Button size="lg" onClick={() => { setSelectedRecord(null); setModalMode('create'); }}><FiPlus size={18} /> Add Egg Record</Button></div>
        <EggStatsCards stats={stats} />
        <LowStockAlert available={stats.available} threshold={LOW_STOCK_THRESHOLD} />
        <EggFilters filters={filters} onChange={updateFilter} onReset={() => setFilters(initialFilters)} batches={batches} eggTypes={eggTypes} />
        <Card padding="p-0"><div className="flex flex-col gap-1 p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-bold text-gray-900 dark:text-white">Egg Inventory Records</h2><p className="text-sm text-gray-500 dark:text-gray-400">{filteredRecords.length} record{filteredRecords.length === 1 ? '' : 's'} found</p></div></div><EggInventoryTable records={filteredRecords} loading={loading} onView={setSelectedRecord} onEdit={openEdit} onDelete={handleDeleteEggRecord} /></Card>
        <EggInventoryHistory history={history.slice(0, 6)} />
        <EggRecordModal key={`${modalMode}-${selectedRecord?.id || 'new'}`} isOpen={Boolean(modalMode)} onClose={closeRecordModal} onSave={modalMode === 'edit' ? handleUpdateEggRecord : handleCreateEggRecord} mode={modalMode} record={selectedRecord} batches={batches} eggTypes={eggTypes} />
        <EggDetailsModal record={modalMode ? null : selectedRecord} onClose={() => setSelectedRecord(null)} />
      </div>
    </MainLayout>
  );
};

export default EggInventoryPage;