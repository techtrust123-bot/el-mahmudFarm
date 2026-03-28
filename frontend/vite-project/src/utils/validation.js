import { z } from 'zod';

/**
 * Validation schemas for form inputs
 */

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const livestockSchema = z.object({
  tagNumber: z.string().min(1, 'Tag number is required'),
  breed: z.string().min(1, 'Breed is required'),
  age: z.number().min(0, 'Age must be positive'),
  weight: z.number().min(0, 'Weight must be positive'),
  healthStatus: z.enum(['healthy', 'sick', 'recovering', 'vaccinated']),
  purchaseDate: z.string().min(1, 'Purchase date is required'),
  type: z.enum(['cow', 'goat', 'sheep', 'pig', 'horse']),
});

export const poultrySchema = z.object({
  batchId: z.string().min(1, 'Batch ID is required'),
  type: z.enum(['broiler', 'layer']),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  vaccinationStatus: z.enum(['vaccinated', 'pending', 'not-vaccinated']),
  feedConsumption: z.number().min(0, 'Feed consumption must be positive'),
  purchaseDate: z.string().min(1, 'Purchase date is required'),
});

export const feedSchema = z.object({
  feedType: z.string().min(1, 'Feed type is required'),
  quantity: z.number().min(0, 'Quantity must be positive'),
  cost: z.number().min(0, 'Cost must be positive'),
  supplier: z.string().min(1, 'Supplier is required'),
  purchaseDate: z.string().min(1, 'Purchase date is required'),
});

export const expenseSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  amount: z.number().min(0, 'Amount must be positive'),
  category: z.enum(['feed', 'medication', 'maintenance', 'staff']),
  date: z.string().min(1, 'Date is required'),
  description: z.string().optional(),
});

export const staffSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  role: z.enum(['manager', 'veterinarian', 'worker', 'supervisor']),
  salary: z.number().min(0, 'Salary must be positive'),
  contact: z.string().min(7, 'Valid contact number required'),
  email: z.string().email('Invalid email address'),
  hireDate: z.string().min(1, 'Hire date is required'),
});

/**
 * Validate form data against schema
 */
export const validateForm = (data, schema) => {
  try {
    const validatedData = schema.parse(data);
    return { isValid: true, data: validatedData, errors: {} };
  } catch (error) {
    const errors = {};
    if (error.errors) {
      error.errors.forEach((err) => {
        errors[err.path[0]] = err.message;
      });
    }
    return { isValid: false, data: null, errors };
  }
};
