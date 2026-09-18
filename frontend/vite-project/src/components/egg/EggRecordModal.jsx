import { useEffect, useState } from 'react';
import { FiSave } from 'react-icons/fi';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';

const emptyRecord = { id: '', batchId: '', poultryType: 'layer', totalDailyEgg: '', salePrice: '', damageEggs: '', AvailableEggCrates: '', date: ''};

const EggRecordModal = ({ isOpen, onClose, onSave, mode, record, batches, eggTypes }) => {
  const [formData, setFormData] = useState(emptyRecord);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setFormData(mode === 'edit' && record ? {
      id: record.id,
      batchId: record.batchId || '',
      poultryType: record.eggType || 'layer',
      totalDailyEgg: Number(record.quantityProduced || ''),
      salePrice: Number(record.salePrice || ''),
      damageEggs: Number(record.damaged || ''),
      AvailableEggCrates: Number(record.AvailableEggCrates || ''),
      date: record.date || '',
    } : emptyRecord);
    setErrors({});
  }, [mode, record, isOpen]);

  const updateField = (field, value) => setFormData((current) => ({ ...current, [field]: value }));

  const validate = () => {
    const nextErrors = {};
    const produced = Number(formData.totalDailyEgg || 0);
    const damaged = Number(formData.damageEggs || 0);
    if (!formData.batchId) nextErrors.batchId = 'Poultry batch is required.';
    
    // if (!formData.eggType) nextErrors.eggType = 'Egg type or size is required.';
    if (!Number.isFinite(produced) || produced <= 0) nextErrors.totalDailyEgg = 'Quantity must be a positive number.';
    // if (!Number.isFinite(sold) || sold < 0) nextErrors.quantitySold = 'Sold quantity cannot be negative.';
    if (!Number.isFinite(damaged) || damaged < 0) nextErrors.damageEggs = 'Damaged quantity cannot be negative.';
    // if (sold + damaged > produced) nextErrors.quantitySold = 'Sold and damaged eggs cannot exceed quantity produced.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async(e) => {
    e.preventDefault();
    if (!validate()) return;

    try{
      onSave({
        ...formData,
        totalDailyEgg: Number(formData.totalDailyEgg),
        salePrice: Number(formData.salePrice || 0),
        damageEggs: Number(formData.damageEggs || 0),
        AvailableEggCrates: Number(formData.AvailableEggCrates || 0),
      });
    } catch (error) {
      setErrors({ form: error.message });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={mode === 'edit' ? 'Edit Egg Record' : 'Add Egg Record'} size="lg" footer={<div className="flex justify-end gap-3"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="egg-record-form"><FiSave size={16} /> Save Egg Record</Button></div>}>
      <form id="egg-record-form" onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Poultry batch" required value={formData.batchId} error={errors.batchId} onChange={(event) => updateField('batchId', event.target.value)} options={batches.map((batch) => ({ value: batch, label: batch }))} />
        <Input label="Poultry Type" type="text" required value={formData.poultryType} error={errors.poultryType} onChange={(event) => updateField('poultryType', event.target.value)} />
        <Input label="Sale Price" type="number" min="0" required value={formData.salePrice} error={errors.salePrice} onChange={(event) => updateField('salePrice', event.target.value)} />
        <Input label="Daily Production" type="number" min="1" required value={formData.totalDailyEgg} error={errors.totalDailyEgg} onChange={(event) => updateField('totalDailyEgg', event.target.value)} />
        <Input label="Broken / damaged eggs" type="number" min="0" value={formData.damageEggs} error={errors.damageEggs} onChange={(event) => updateField('damageEggs', event.target.value)} />
        <Input label="Available Egg Crates" type="number" min="0" value={formData.AvailableEggCrates} error={errors.AvailableEggCrates} onChange={(event) => updateField('AvailableEggCrates', event.target.value)} />
        <Input label="Date" type="date" required value={formData.date} error={errors.date} onChange={(event) => updateField('date', event.target.value)} />
        {errors.form && <p className="col-span-full text-sm text-red-600">{errors.form}</p>}
      </form>
    </Modal>
  );
}


export default EggRecordModal;