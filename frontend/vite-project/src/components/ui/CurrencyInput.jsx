import React, { useState, useEffect, useRef } from 'react';
import { formatNumber, parseNumber } from '../../utils/numberFormatter';

const CurrencyInput = ({
  name,
  value,
  onChange,
  placeholder = '',
  className = '',
  error = null,
  label = null,
  locale = 'en-NG',
  decimals = 0,
  currency = null,
  showCurrency = false,
  ...props
}) => {
  const [display, setDisplay] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    setDisplay(
      value === '' || value === null || value === undefined
        ? ''
        : formatNumber(value, { locale, minimumFractionDigits: decimals, maximumFractionDigits: decimals, currency, showCurrency })
    );
  }, [value, locale, decimals, currency, showCurrency]);

  const handleChange = (e) => {
    const raw = e.target.value;
    // allow digits, commas, dot and minus
    const cleanedInput = raw.replace(/[^0-9.-]/g, '');
    const parsed = parseNumber(cleanedInput);

    setDisplay(cleanedInput === '' ? '' : formatNumber(parsed, { locale, minimumFractionDigits: decimals, maximumFractionDigits: decimals }));

    // emit synthetic event compatible with existing handlers
    if (typeof onChange === 'function') {
      onChange({ target: { name, value: parsed === '' ? '' : parsed } });
    }
  };

  const handleBlur = () => {
    const parsed = parseNumber(display);
    setDisplay(
      parsed === ''
        ? ''
        : formatNumber(parsed, { locale, minimumFractionDigits: decimals, maximumFractionDigits: decimals, currency, showCurrency })
    );
  };

  return (
    <div className={`currency-input ${className}`}>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <input
        ref={inputRef}
        name={name}
        value={display}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        inputMode="numeric"
        {...props}
        className={`w-full px-3 py-2 border rounded ${error ? 'border-red-500' : 'border-gray-300'}`}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
};

export default CurrencyInput;
