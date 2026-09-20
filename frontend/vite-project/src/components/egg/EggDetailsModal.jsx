import Modal from '../ui/Modal';
import Badge from '../ui/Badge';

const EggDetailsModal = ({ record, onClose }) => record && (
  <Modal isOpen={Boolean(record)} onClose={onClose} title="Egg Record Details" size="lg">
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {[['Poultry batch', record.batchId], ['Production date', record.productionDate], ['Daily Production', record.quantityProduced.toLocaleString()], ['Quantity sold', record.totalCrateSold.toLocaleString()], ['Broken / damaged', record.damaged.toLocaleString()], ['Available Egg Crates', record.AvailableEggCrates.toLocaleString()], ['Status', <Badge variant={record.status === 'Available' ? 'success' : record.status === 'Low Stock' ? 'warning' : 'default'}>{record.status}</Badge>], ['Created date', record.createdAt], ['Last updated', record.updatedAt]].map(([label, value]) => <div key={label} className="border-b border-gray-100 pb-3 dark:border-gray-700"><dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</dt><dd className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{value}</dd></div>)}
      <div className="sm:col-span-2"><dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Notes</dt><dd className="mt-1 text-sm text-gray-700 dark:text-gray-300">{record.notes || 'No notes added.'}</dd></div>
    </div>
  </Modal>
);

export default EggDetailsModal;