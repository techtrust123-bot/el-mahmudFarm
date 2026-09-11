import { FiEdit2, FiEye, FiMoreVertical, FiTrash2 } from 'react-icons/fi';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Table from '../ui/Table';

const statusVariant = { Available: 'success', 'Low Stock': 'warning', 'Sold Out': 'default' };

const EggInventoryTable = ({ records, loading, onView, onEdit, onDelete }) => (
  <Table
    data={records}
    loading={loading}
    columns={[
      { key: 'productionDate', label: 'Date', sortable: true },
      { key: 'batchId', label: 'Poultry Batch', sortable: true },
      { key: 'eggType', label: 'Egg Type / Size' },
      { key: 'quantityProduced', label: 'Produced', sortable: true, render: (value) => value.toLocaleString() },
      { key: 'quantitySold', label: 'Sold', render: (value) => value.toLocaleString() },
      { key: 'damaged', label: 'Damaged', render: (value) => value.toLocaleString() },
      { key: 'available', label: 'Available', sortable: true, render: (value) => <span className="font-semibold">{value.toLocaleString()}</span> },
      { key: 'status', label: 'Status', render: (value) => <Badge variant={statusVariant[value] || 'default'}>{value}</Badge> },
    ]}
    actions={(record) => [
      <Button key="view" variant="ghost" size="sm" title="View egg record" onClick={() => onView(record)}><FiEye size={16} /></Button>,
      <Button key="edit" variant="ghost" size="sm" title="Edit egg record" onClick={() => onEdit(record)}><FiEdit2 size={16} /></Button>,
      <Button key="delete" variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" title="Delete egg record" onClick={() => onDelete(record)}><FiTrash2 size={16} /></Button>,
    ]}
  />
);

export default EggInventoryTable;