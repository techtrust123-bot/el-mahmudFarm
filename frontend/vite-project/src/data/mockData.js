/**
 * Mock Data - For frontend development without backend
 */

export const mockStats = {
  totalAnimals: 256,
  totalPoultry: 1200,
  totalRevenue: 45600,
  totalExpenses: 12400,
  mortalityRate: 2.3,
};

export const mockChartData = [
  { month: 'Jan', sales: 4000, expenses: 2400 },
  { month: 'Feb', sales: 3000, expenses: 1398 },
  { month: 'Mar', sales: 2000, expenses: 9800 },
  { month: 'Apr', sales: 2780, expenses: 3908 },
  { month: 'May', sales: 1890, expenses: 4800 },
  { month: 'Jun', sales: 2390, expenses: 3800 },
];

export const mockLivestock = [
  { id: 1, tagNumber: 'L001', breed: 'Jersey', type: 'cow', age: 3, weight: 450, healthStatus: 'healthy', lastCheckup: '2024-02-20' },
  { id: 2, tagNumber: 'L002', breed: 'Holstein', type: 'cow', age: 2, weight: 480, healthStatus: 'healthy', lastCheckup: '2024-02-18' },
  { id: 3, tagNumber: 'L003', breed: 'Brahman', type: 'bull', age: 4, weight: 650, healthStatus: 'monitoring', lastCheckup: '2024-02-15' },
];

export const mockPoultry = [
  { id: 1, batchId: 'P001', type: 'chicken', breed: 'Leghorn', quantity: 500, mortality: 3, vaccinationStatus: 'vaccinated', feedConsumption: 45 },
  { id: 2, batchId: 'P002', type: 'duck', breed: 'Pekin', quantity: 200, mortality: 1, vaccinationStatus: 'pending', feedConsumption: 20 },
];

export const mockUsers = [
  { id: 1, name: 'Ahmed Hassan', email: 'ahmed@farm.com', role: 'farmer', status: 'active' },
  { id: 2, name: 'Nneka Okafor', email: 'nneka@poultry.com', role: 'farmer', status: 'active' },
  { id: 3, name: 'Dr. Sarah', email: 'sarah@vet.com', role: 'veterinarian', status: 'active' },
];

export const mockPlans = [
  { id: 'basic', name: 'Basic', price: 29, features: ['100 animals', 'Basic support'] },
  { id: 'pro', name: 'Professional', price: 79, features: ['Unlimited animals', 'Priority support', 'Marketplace access'] },
  { id: 'enterprise', name: 'Enterprise', price: 0, features: ['Everything', 'Custom integration', '24/7 support'] },
];

export default {
  mockStats,
  mockChartData,
  mockLivestock,
  mockPoultry,
  mockUsers,
  mockPlans,
};
