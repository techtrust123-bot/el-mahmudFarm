import { useContext, useEffect, useState } from 'react';
import { FiAlertTriangle, FiTrendingDown } from 'react-icons/fi';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { AuthContext } from '../../context/AuthContext';
import MainLayout from '../../components/layout/MainLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StatCard from '../../components/ui/StatCard';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';

/**
 * Inventory & Feed Management Page
 */
const InventoryPage = () => {
  const [feedStock, setFeedStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const { axiosInstance } = useContext(AuthContext);
  const navigate = useNavigate();

  const consumptionData = [
    { date: 'Mon', maize: 120, pellets: 85, supplements: 45 },
    { date: 'Tue', maize: 135, pellets: 90, supplements: 48 },
    { date: 'Wed', maize: 128, pellets: 88, supplements: 46 },
    { date: 'Thu', maize: 142, pellets: 95, supplements: 52 },
    { date: 'Fri', maize: 150, pellets: 100, supplements: 55 },
    { date: 'Sat', maize: 110, pellets: 75, supplements: 40 },
    { date: 'Sun', maize: 95, pellets: 65, supplements: 35 },
  ];

  useEffect(() => {
    const fetchFeedStock = async () => {
      try {
        const response = await axiosInstance.get('/api/feed/feed');
        setFeedStock((response.data.data || []).map((feed) => ({
          ...feed,
          id: feed._id,
          type: feed.feedName || feed.feedType,
          quantityKg: Number(feed.quantityKg ?? feed.quantity) || 0,
          reorderLevel: 100,
          lastRestocked: feed.purchaseDate,
        })));
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to fetch feed inventory');
      } finally {
        setLoading(false);
      }
    };
    fetchFeedStock();
  }, [axiosInstance]);

  const lowStockItems = feedStock.filter(item => item.quantityKg <= item.reorderLevel * 1.5);
  const totalFeedKg = feedStock.reduce((sum, item) => sum + item.quantityKg, 0);
  const dailyConsumptionKg = feedStock.reduce((sum, item) => sum + Number(item.totalDailyConsumption || 0), 0);
  const daysSupply = dailyConsumptionKg > 0 ? totalFeedKg / dailyConsumptionKg : 0;
  const formatQuantity = (value) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(Number(value) || 0);
  const formatStock = (item) => {
    if (item.unit === 'bag' && Number(item.bagWeightKg) > 0) {
      const remainingBags = item.quantityKg / Number(item.bagWeightKg);
      return `${formatQuantity(remainingBags)} ${remainingBags === 1 ? 'bag' : 'bags'} (${formatQuantity(item.quantityKg)} kg)`;
    }
    return `${formatQuantity(item.quantityKg)} kg`;
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Feed & Inventory</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Track feed stock and consumption</p>
          </div>
          <Button variant="primary" size="lg" onClick={() => navigate('/feed')}>+ Add Stock</Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Feed (kg)" value={formatQuantity(totalFeedKg)} color="green" />
          <StatCard label="Weekly Consumption" value={`${formatQuantity(dailyConsumptionKg * 7)} kg`} color="blue" />
          <StatCard label="Low Stock Items" value={lowStockItems.length} color="orange" />
          <StatCard label="Est. Days Supply" value={`${formatQuantity(daysSupply)} days`} color="purple" />
        </div>

        {/* Low Stock Alert */}
        {lowStockItems.length > 0 && (
          <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 border-2">
            <div className="flex items-start gap-3">
              <FiAlertTriangle className="text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" size={24} />
              <div className="flex-1">
                <h3 className="font-bold text-yellow-900 dark:text-yellow-100">Low Stock Alert</h3>
                <p className="text-yellow-800 dark:text-yellow-200 text-sm mt-1">
                  {lowStockItems.length} item(s) running low. Reorder soon to avoid shortages.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {lowStockItems.map(item => (
                    <Badge key={item.id} variant="warning">{item.type}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Consumption Chart */}
        <Card>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Weekly Feed Consumption</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={consumptionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="maize" stroke="#10b981" name="Maize" />
              <Line type="monotone" dataKey="pellets" stroke="#f59e0b" name="Pellets" />
              <Line type="monotone" dataKey="supplements" stroke="#8b5cf6" name="Supplements" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Stock Table */}
        <Card>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Current Stock</h3>
            <Button variant="outline" size="sm">📊 Export CSV</Button>
          </div>

          <Table
            columns={[
              { key: 'type', label: 'Feed Type' },
              { key: 'quantityKg', label: 'Available Feed', render: (_, row) => formatStock(row) },
              { key: 'reorderLevel', label: 'Reorder Level (kg)' },
              {
                key: 'quantityKg',
                label: 'Status',
                render: (val, row) => {
                  const status = val <= row.reorderLevel ? 'low' : val <= row.reorderLevel * 1.5 ? 'medium' : 'good';
                  return <Badge variant={status === 'low' ? 'error' : status === 'medium' ? 'warning' : 'success'}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Badge>;
                },
              },
              { key: 'supplier', label: 'Supplier' },
              { key: 'lastRestocked', label: 'Last Restocked' },
            ]}
            data={feedStock}
            loading={loading}
            actions={(row) => [
              <Button key="restock" variant="outline" size="sm" onClick={() => navigate('/feed')}>Restock</Button>,
              <Button key="history" variant="ghost" size="sm">History</Button>,
            ]}
          />
        </Card>

        {/* Reorder Suggestions */}
        <Card>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Suggested Reorders</h3>
          <div className="space-y-3">
            {lowStockItems.map(item => (
              <div key={item.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{item.type}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Current: {formatStock(item)} | Supplier: {item.supplier}
                  </p>
                </div>
                <Button variant="primary" size="sm">Place Order</Button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </MainLayout>
  );
};

export default InventoryPage;
