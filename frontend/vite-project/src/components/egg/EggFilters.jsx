import { FiRefreshCw, FiSearch } from 'react-icons/fi';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';

const EggFilters = ({ filters, onChange, onReset, batches, eggTypes }) => (
  <Card shadow={false} className="border-gray-200 dark:border-gray-700">
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5 xl:items-end">
      <Input label="Search records" placeholder="Batch, egg type, or date" icon={FiSearch} value={filters.search} onChange={(event) => onChange('search', event.target.value)} fullWidth />
      <Input label="From date" type="date" value={filters.fromDate} onChange={(event) => onChange('fromDate', event.target.value)} fullWidth />
      <Input label="To date" type="date" value={filters.toDate} onChange={(event) => onChange('toDate', event.target.value)} fullWidth />
      <Select label="Poultry batch" value={filters.batch} onChange={(event) => onChange('batch', event.target.value)} options={batches.map((batch) => ({ value: batch, label: batch }))} fullWidth />
      <Select label="Egg type / status" value={filters.typeOrStatus} onChange={(event) => onChange('typeOrStatus', event.target.value)} options={[...eggTypes.map((type) => ({ value: type, label: type })), { value: 'Available', label: 'Available' }, { value: 'Low Stock', label: 'Low Stock' }, { value: 'Sold Out', label: 'Sold Out' }]} fullWidth />
    </div>
    <div className="mt-4 flex justify-end">
      <Button variant="ghost" size="sm" onClick={onReset}><FiRefreshCw size={15} /> Reset Filters</Button>
    </div>
  </Card>
);

export default EggFilters;