import { FiActivity, FiPackage, FiShoppingCart } from 'react-icons/fi';
import Card from '../ui/Card';

const icons = { production: FiPackage, sale: FiShoppingCart, damage: FiActivity, edit: FiActivity };

const EggInventoryHistory = ({ history }) => (
  <Card>
    <div className="mb-5"><h2 className="text-lg font-bold text-gray-900 dark:text-white">Inventory History</h2><p className="text-sm text-gray-500 dark:text-gray-400">Recent changes across your egg inventory.</p></div>
    <div className="space-y-5">
      {history.map((item) => { const Icon = icons[item.kind] || FiActivity; return <div key={item.id} className="flex gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"><Icon size={17} /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1"><p className="text-sm font-medium text-gray-900 dark:text-white">{item.description}</p><span className="text-xs text-gray-500">{item.date}</span></div><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{item.quantity ? `${item.quantity.toLocaleString()} eggs` : ''} {item.batch ? `• ${item.batch}` : ''}</p></div></div>; })}
    </div>
  </Card>
);

export default EggInventoryHistory;