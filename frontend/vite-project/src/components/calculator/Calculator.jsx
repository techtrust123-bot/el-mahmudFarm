import React, { useMemo, useState } from 'react';

const DIGITS = ['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '-', '0', '.', '%', '+'];

const Calculator = () => {
  const [display, setDisplay] = useState('0');
  const [storedValue, setStoredValue] = useState(null);
  const [operator, setOperator] = useState(null);
  const [waitingForNewValue, setWaitingForNewValue] = useState(false);

  const safeNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const updateDisplayValue = (value) => {
    const nextValue = String(value);
    setDisplay(nextValue.length > 14 ? nextValue.slice(0, 14) : nextValue);
  };

  const getCurrentOperand = () => {
    if (!display || display === '0') return 0;

    if (operator && display.includes(operator)) {
      const tokens = display.split(operator);
      const lastToken = tokens[tokens.length - 1]?.trim();
      if (lastToken && lastToken !== '') {
        return safeNumber(lastToken);
      }
    }

    return safeNumber(display);
  };

  const inputDigit = (digit) => {
    if (waitingForNewValue) {
      if (operator && storedValue !== null) {
        const nextValue = `${storedValue} ${operator} ${digit}`;
        setDisplay(nextValue);
      } else {
        setDisplay(String(digit));
      }
      setWaitingForNewValue(false);
      return;
    }

    setDisplay((current) => {
      if (current === '0' && digit !== '.') return String(digit);
      if (digit === '.' && current.includes('.')) return current;
      return `${current}${digit}`;
    });
  };

  const clearCalculator = () => {
    setDisplay('0');
    setStoredValue(null);
    setOperator(null);
    setWaitingForNewValue(false);
  };

  const deleteLast = () => {
    if (waitingForNewValue) return;

    setDisplay((current) => {
      if (current.length <= 1 || current === '-0') return '0';
      const next = current.slice(0, -1);
      return next || '0';
    });
  };

  const handleOperation = (nextOperator) => {
    const inputValue = getCurrentOperand();
    if (inputValue === null) return;

    if (storedValue !== null && operator && !waitingForNewValue) {
      const result = performCalculation(storedValue, inputValue, operator);
      if (result === 'Error') {
        clearCalculator();
        setDisplay('Cannot divide by zero');
        return;
      }

      setStoredValue(result);
      setDisplay(`${result} ${nextOperator}`);
    } else {
      setStoredValue(inputValue);
      setDisplay(`${inputValue} ${nextOperator}`);
    }

    setWaitingForNewValue(true);
    setOperator(nextOperator);
  };

  const performCalculation = (first, second, currentOperator) => {
    if (currentOperator === '÷') {
      if (second === 0) return 'Error';
      return first / second;
    }

    if (currentOperator === '×') return first * second;
    if (currentOperator === '-') return first - second;
    if (currentOperator === '+') return first + second;

    if (currentOperator === '%') {
      return (first * second) / 100;
    }

    return second;
  };

  const computePercentage = () => {
    const currentValue = safeNumber(display);
    if (currentValue === null) return;

    const nextValue = currentValue / 100;
    setDisplay(String(nextValue));
    setStoredValue(nextValue);
    setWaitingForNewValue(true);
    setOperator(null);
  };

  const handleEquals = () => {
    if (storedValue === null || !operator) return;

    const inputValue = getCurrentOperand();
    if (inputValue === null) return;

    const result = performCalculation(storedValue, inputValue, operator);

    if (result === 'Error') {
      clearCalculator();
      setDisplay('Cannot divide by zero');
      return;
    }

    const normalized = Number.isInteger(result) ? String(result) : String(Number(result.toFixed(10)));
    setDisplay(normalized);
    setStoredValue(null);
    setOperator(null);
    setWaitingForNewValue(false);
  };

  const handleKeyboardInput = (event) => {
    const key = event.key;

    if (/^[0-9]$/.test(key)) {
      inputDigit(key);
    } else if (key === '.') {
      inputDigit('.');
    } else if (key === '+') {
      handleOperation('+');
    } else if (key === '-') {
      handleOperation('-');
    } else if (key === '*') {
      handleOperation('×');
    } else if (key === '/') {
      handleOperation('÷');
    } else if (key === '%') {
      computePercentage();
    } else if (key === 'Enter' || key === '=') {
      handleEquals();
    } else if (key === 'Backspace') {
      deleteLast();
    } else if (key === 'Escape') {
      clearCalculator();
    }
  };

  useMemo(() => {
    window.addEventListener('keydown', handleKeyboardInput);
    return () => window.removeEventListener('keydown', handleKeyboardInput);
  }, [display, storedValue, operator, waitingForNewValue]);

  return (
    <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-4 overflow-hidden rounded-xl bg-gray-100 p-4 text-right dark:bg-gray-900">
        <div className="min-h-[3rem] text-2xl font-semibold text-gray-900 break-words dark:text-white">
          {display}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <button
          type="button"
          onClick={clearCalculator}
          className="rounded-xl bg-red-100 px-3 py-3 text-base font-semibold text-red-600 transition hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50"
        >
          C
        </button>
        <button
          type="button"
          onClick={deleteLast}
          className="rounded-xl bg-gray-200 px-3 py-3 text-base font-semibold text-gray-700 transition hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
        >
          ⌫
        </button>
        <button
          type="button"
          onClick={computePercentage}
          className="rounded-xl bg-gray-200 px-3 py-3 text-base font-semibold text-gray-700 transition hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
        >
          %
        </button>
        <button
          type="button"
          onClick={() => handleOperation('÷')}
          className="rounded-xl bg-emerald-600 px-3 py-3 text-base font-semibold text-white transition hover:bg-emerald-700"
        >
          ÷
        </button>

        {DIGITS.map((digit) => {
          const isOperator = ['÷', '×', '-', '+', '%'].includes(digit);

          return (
            <button
              key={digit}
              type="button"
              onClick={() => {
                if (isOperator) {
                  handleOperation(digit);
                  return;
                }

                if (digit === '.') {
                  inputDigit('.');
                  return;
                }

                inputDigit(digit);
              }}
              className={`rounded-xl px-3 py-3 text-base font-semibold transition ${
                isOperator
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600'
              }`}
            >
              {digit}
            </button>
          );
        })}

        <button
          type="button"
          onClick={handleEquals}
          className="col-span-2 rounded-xl bg-emerald-600 px-3 py-3 text-base font-semibold text-white transition hover:bg-emerald-700"
        >
          =
        </button>
      </div>
    </div>
  );
};

export default Calculator;
