import React from 'react';
import Modal from '../ui/Modal';
import Calculator from './Calculator';

const CalculatorModal = ({ isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Calculator" size="sm">
      <div className="flex justify-center">
        <Calculator />
      </div>
    </Modal>
  );
};

export default CalculatorModal;
