/**
 * Custom Hook: useForm
 * Handles form state, validation, and submission
 * Usage: const { formData, errors, handleChange, handleSubmit } = useForm(initialData, onSubmit)
 */

import { useState, useCallback } from 'react';

export const useForm = (initialData, onSubmit, validators = {}) => {
  const [formData, setFormData] = useState(initialData);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateField = useCallback((name, value) => {
    if (!validators[name]) {
      return null;
    }

    const validator = validators[name];
    if (typeof validator === 'function') {
      return validator(value);
    }

    return null;
  }, [validators]);

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    const fieldValue = type === 'checkbox' ? checked : value;

    setFormData((prev) => ({
      ...prev,
      [name]: fieldValue
    }));

    // Validate on change if field was touched
    if (touched[name]) {
      const error = validateField(name, fieldValue);
      setErrors((prev) => ({
        ...prev,
        [name]: error
      }));
    }
  }, [touched, validateField]);

  const handleBlur = useCallback((e) => {
    const { name, value } = e.target;

    setTouched((prev) => ({
      ...prev,
      [name]: true
    }));

    const error = validateField(name, value);
    setErrors((prev) => ({
      ...prev,
      [name]: error
    }));
  }, [validateField]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();

    // Validate all fields
    const newErrors = {};
    Object.keys(initialData).forEach((name) => {
      const error = validateField(name, formData[name]);
      if (error) {
        newErrors[name] = error;
      }
    });

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, initialData, onSubmit, validateField]);

  const reset = useCallback(() => {
    setFormData(initialData);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialData]);

  const setFieldValue = useCallback((name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  }, []);

  const setFieldError = useCallback((name, error) => {
    setErrors((prev) => ({
      ...prev,
      [name]: error
    }));
  }, []);

  return {
    formData,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
    setFieldValue,
    setFieldError
  };
};

export default useForm;
