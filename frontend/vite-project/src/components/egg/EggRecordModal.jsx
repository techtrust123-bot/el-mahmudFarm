import { useState } from 'react';
import { FiSave } from 'react-icons/fi';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Textarea from '../ui/Textarea';
import Button from '../ui/Button';

const emptyRecord = { batchId: '', productionDate: '', eggType: '', quantityProduced: '', quantitySold: 0, damaged: 0, notes: '' };
const normalizeRecord = (record) => record ? { ...record, quantityProduced: String(record.quantityProduced), quantitySold: String(record.quantitySold), damaged: String(record.damaged) } : emptyRecord;

const EggRecordModal = ({ isOpen, onClose, onSave, mode, record, batches, eggTypes }) => {
  const [formData, setFormData] = useState(() => normalizeRecord(record));
  const [errors, setErrors] = useState({});

  const updateField = (field, value) => setFormData((current) => ({ ...current, [field]: value }));

  const validate = () => {
    const nextErrors = {};
    const produced = Number(formData.quantityProduced);
    const sold = Number(formData.quantitySold || 0);
    const damaged = Number(formData.damaged || 0);
    if (!formData.batchId) nextErrors.batchId = 'Poultry batch is required.';
    if (!formData.productionDate || Number.isNaN(new Date(formData.productionDate).getTime())) nextErrors.productionDate = 'Enter a valid production date.';
    if (!formData.eggType) nextErrors.eggType = 'Egg type or size is required.';
    if (!Number.isFinite(produced) || produced <= 0) nextErrors.quantityProduced = 'Quantity must be a positive number.';
    if (!Number.isFinite(sold) || sold < 0) nextErrors.quantitySold = 'Sold quantity cannot be negative.';
    if (!Number.isFinite(damaged) || damaged < 0) nextErrors.damaged = 'Damaged quantity cannot be negative.';
    if (sold + damaged > produced) nextErrors.quantitySold = 'Sold and damaged eggs cannot exceed quantity produced.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (validate()) onSave({ ...formData, quantityProduced: Number(formData.quantityProduced), quantitySold: Number(formData.quantitySold || 0), damaged: Number(formData.damaged || 0) });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={mode === 'edit' ? 'Edit Egg Record' : 'Add Egg Record'} size="lg" footer={<div className="flex justify-end gap-3"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="egg-record-form"><FiSave size={16} /> Save Egg Record</Button></div>}>
      <form id="egg-record-form" onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select label="Poultry batch" required value={formData.batchId} error={errors.batchId} onChange={(event) => updateField('batchId', event.target.value)} options={batches.map((batch) => ({ value: batch, label: batch }))} />
        <Input label="Production date" type="date" required value={formData.productionDate} error={errors.productionDate} onChange={(event) => updateField('productionDate', event.target.value)} />
        <Select label="Egg type / size" required value={formData.eggType} error={errors.eggType} onChange={(event) => updateField('eggType', event.target.value)} options={eggTypes.map((type) => ({ value: type, label: type }))} />
        <Input label="Quantity produced" type="number" min="1" required value={formData.quantityProduced} error={errors.quantityProduced} onChange={(event) => updateField('quantityProduced', event.target.value)} />
        <Input label="Eggs sold" type="number" min="0" value={formData.quantitySold} error={errors.quantitySold} onChange={(event) => updateField('quantitySold', event.target.value)} />
        <Input label="Broken / damaged eggs" type="number" min="0" value={formData.damaged} error={errors.damaged} onChange={(event) => updateField('damaged', event.target.value)} />
        <div className="sm:col-span-2"><Textarea label="Notes" placeholder="Optional production notes" value={formData.notes} onChange={(event) => updateField('notes', event.target.value)} /></div>
      </form>
    </Modal>
  );
};

export default EggRecordModal;