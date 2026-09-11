import { FiAlertTriangle } from 'react-icons/fi';
import Card from '../ui/Card';

const LowStockAlert = ({ available, threshold }) => available <= threshold && (
  <Card shadow={false} className="border-2 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
    <div className="flex items-start gap-3"><FiAlertTriangle className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" size={22} /><div><h2 className="font-bold text-amber-900 dark:text-amber-100">Low Egg Stock</h2><p className="mt-1 text-sm text-amber-800 dark:text-amber-200">Only {available.toLocaleString()} eggs remaining. Consider reviewing production or upcoming sales.</p></div></div>
  </Card>
);

export default LowStockAlert;