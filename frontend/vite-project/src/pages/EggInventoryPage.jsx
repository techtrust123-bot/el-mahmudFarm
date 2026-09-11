import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { FiPlus } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
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

export const LOW_STOCK_THRESHOLD = 200;

const initialRecords = [
  { id: 1, batchId: 'BATCH-001', productionDate: '2026-08-31', eggType: 'Large', quantityProduced: 4200, quantitySold: 1500, damaged: 100, notes: 'Morning collection from layer house.', createdAt: '31 Aug 2026, 10:42 AM', updatedAt: '31 Aug 2026, 10:42 AM' },
  { id: 2, batchId: 'BATCH-002', productionDate: '2026-08-30', eggType: 'Medium', quantityProduced: 3100, quantitySold: 900, damaged: 120, notes: '', createdAt: '30 Aug 2026, 11:15 AM', updatedAt: '30 Aug 2026, 11:15 AM' },
  { id: 3, batchId: 'BATCH-001', productionDate: '2026-08-29', eggType: 'Large', quantityProduced: 2800, quantitySold: 1100, damaged: 80, notes: 'Collection completed before noon.', createdAt: '29 Aug 2026, 12:06 PM', updatedAt: '29 Aug 2026, 12:06 PM' },
  { id: 4, batchId: 'BATCH-003', productionDate: '2026-08-28', eggType: 'Small', quantityProduced: 2400, quantitySold: 400, damaged: 100, notes: 'Small eggs separated for local sales.', createdAt: '28 Aug 2026, 10:18 AM', updatedAt: '28 Aug 2026, 10:18 AM' },
];

const initialFilters = { search: '', fromDate: '', toDate: '', batch: '', typeOrStatus: '' };
const eggTypes = ['Large', 'Medium', 'Small', 'Extra Large'];

const getAvailable = (record) => Math.max(0, record.quantityProduced - record.quantitySold - record.damaged);
const getStatus = (available) => available === 0 ? 'Sold Out' : available <= LOW_STOCK_THRESHOLD ? 'Low Stock' : 'Available';
const enrichRecord = (record) => { const available = getAvailable(record); return { ...record, available, status: getStatus(available) }; };

const EggInventoryPage = () => {
  const [eggRecords, setEggRecords] = useState(() => initialRecords.map(enrichRecord));
  const [filters, setFilters] = useState(initialFilters);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [history, setHistory] = useState([
    { id: 1, kind: 'production', description: '500 eggs added from BATCH-001', quantity: 500, batch: 'BATCH-001', date: 'Today, 9:40 AM' },
    { id: 2, kind: 'sale', description: '120 eggs sold', quantity: 120, batch: 'BATCH-002', date: 'Yesterday, 4:15 PM' },
    { id: 3, kind: 'damage', description: '10 eggs marked as damaged', quantity: 10, batch: 'BATCH-001', date: 'Yesterday, 1:05 PM' },
    { id: 4, kind: 'edit', description: 'Egg record edited', quantity: 0, batch: 'BATCH-003', date: '28 Aug 2026, 10:18 AM' },
  ]);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 350);
    return () => clearTimeout(timer);
  }, []);

  const stats = useMemo(() => eggRecords.reduce((totals, record) => ({
    totalProduced: totals.totalProduced + record.quantityProduced,
    available: totals.available + record.available,
    sold: totals.sold + record.quantitySold,
    damaged: totals.damaged + record.damaged,
  }), { totalProduced: 0, available: 0, sold: 0, damaged: 0 }), [eggRecords]);

  const filteredRecords = useMemo(() => eggRecords.filter((record) => {
    const search = filters.search.toLowerCase();
    const matchesSearch = !search || [record.batchId, record.eggType, record.productionDate].some((value) => value.toLowerCase().includes(search));
    const matchesFrom = !filters.fromDate || record.productionDate >= filters.fromDate;
    const matchesTo = !filters.toDate || record.productionDate <= filters.toDate;
    const matchesBatch = !filters.batch || record.batchId === filters.batch;
    const matchesTypeOrStatus = !filters.typeOrStatus || record.eggType === filters.typeOrStatus || record.status === filters.typeOrStatus;
    return matchesSearch && matchesFrom && matchesTo && matchesBatch && matchesTypeOrStatus;
  }), [eggRecords, filters]);

  const updateFilter = (field, value) => setFilters((current) => ({ ...current, [field]: value }));
  const closeRecordModal = () => { setModalMode(null); setSelectedRecord(null); };

  const handleCreateEggRecord = (record) => {
    const now = new Date().toLocaleString();
    const created = enrichRecord({ ...record, id: Date.now(), createdAt: now, updatedAt: now });
    setEggRecords((current) => [created, ...current]);
    setHistory((current) => [{ id: Date.now(), kind: 'production', description: `${created.quantityProduced.toLocaleString()} eggs added from ${created.batchId}`, quantity: created.quantityProduced, batch: created.batchId, date: 'Just now' }, ...current]);
    closeRecordModal();
    toast.success('Egg record added');
  };

  const handleUpdateEggRecord = (record) => {
    const updated = enrichRecord({ ...record, updatedAt: new Date().toLocaleString() });
    setEggRecords((current) => current.map((item) => item.id === updated.id ? updated : item));
    setHistory((current) => [{ id: Date.now(), kind: 'edit', description: `Egg record edited for ${updated.batchId}`, quantity: 0, batch: updated.batchId, date: 'Just now' }, ...current]);
    closeRecordModal();
    toast.success('Egg record updated');
  };

  const handleDeleteEggRecord = (record) => {
    if (!window.confirm(`Delete the egg record for ${record.batchId} on ${record.productionDate}?`)) return;
    setEggRecords((current) => current.filter((item) => item.id !== record.id));
    toast.success('Egg record deleted');
  };

  const openEdit = (record) => { setSelectedRecord(record); setModalMode('edit'); };
  const batches = [...new Set(eggRecords.map((record) => record.batchId))];
  const analytics = { daily: [{ label: 'Mon', eggs: 1450 }, { label: 'Tue', eggs: 1620 }, { label: 'Wed', eggs: 1380 }, { label: 'Thu', eggs: 1750 }, { label: 'Fri', eggs: 1580 }, { label: 'Sat', eggs: 1490 }, { label: 'Sun', eggs: 1720 }], weekly: [{ label: 'W1', eggs: 8200 }, { label: 'W2', eggs: 9100 }, { label: 'W3', eggs: 8750 }, { label: 'W4', eggs: 10200 }], monthly: [{ label: 'May', eggs: 36500 }, { label: 'Jun', eggs: 38900 }, { label: 'Jul', eggs: 41200 }, { label: 'Aug', eggs: 44750 }] };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center"><div><p className="text-sm font-semibold uppercase tracking-wider text-emerald-600">Poultry operations</p><h1 className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">Egg Inventory</h1><p className="mt-1 text-gray-600 dark:text-gray-400">Manage egg production, inventory, sales, and damaged eggs.</p></div><Button size="lg" onClick={() => { setSelectedRecord(null); setModalMode('create'); }}><FiPlus size={18} /> Add Egg Record</Button></div>
        <EggStatsCards stats={stats} />
        <LowStockAlert available={stats.available} threshold={LOW_STOCK_THRESHOLD} />
        <Card><div className="mb-5"><h2 className="text-lg font-bold text-gray-900 dark:text-white">Production Analytics</h2><p className="text-sm text-gray-500 dark:text-gray-400">Egg production trends at a glance.</p></div><div className="grid grid-cols-1 gap-6 lg:grid-cols-3">{Object.entries(analytics).map(([period, data]) => <div key={period}><h3 className="mb-2 text-sm font-semibold capitalize text-gray-700 dark:text-gray-300">{period} production</h3><ResponsiveContainer width="100%" height={190}><BarChart data={data}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} width={40} /><Tooltip /><Bar dataKey="eggs" fill="#10b981" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>)}</div></Card>
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