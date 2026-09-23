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
    const cleanedInput = raw.replace(/[^0-9.-]/g, '');
    const parsed = parseNumber(cleanedInput);

    setDisplay(cleanedInput === '' ? '' : formatNumber(parsed, { locale, minimumFractionDigits: decimals, maximumFractionDigits: decimals }));

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
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        ref={inputRef}
        name={name}
        value={display}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        inputMode="numeric"
        {...props}
        className={`
          w-full px-4 py-2 text-base rounded-lg border-2 transition-all duration-200
          ${error 
            ? 'border-red-500 bg-red-50 dark:bg-red-900/30' 
            : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
          }
          focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-900
          text-gray-900 dark:text-white dark:placeholder-gray-400
          disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed
        `}
      />
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
};

export default CurrencyInput;