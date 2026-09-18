import { FiAlertTriangle, FiCheckCircle, FiShoppingCart, FiTrello } from 'react-icons/fi';
import StatCard from '../ui/StatCard';

const EggStatsCards = ({ stats }) => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
    <StatCard icon={FiTrello} label="Total Eggs Produced" value={stats.totalProduced.toLocaleString()} className="border-l-4 border-l-emerald-500" />
    <StatCard icon={FiCheckCircle} label="Available Eggs" value={stats.available.toLocaleString()} className="border-l-4 border-l-blue-500" />
    {/* <StatCard icon={FiShoppingCart} label="Total Crates Sold" value={stats.totalCrateSold.toLocaleString()} className="border-l-4 border-l-amber-500" /> */}
    <StatCard icon={FiAlertTriangle} label="Broken / Damaged" value={stats.damaged.toLocaleString()} className="border-l-4 border-l-red-500" />
  </div>
);

export default EggStatsCards;