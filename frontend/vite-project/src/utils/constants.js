/**
 * Application constants
 */

export const LIVESTOCK_TYPES = [
  { value: 'cow', label: 'cow' },
  { value: 'bool', label: 'bool' },
  { value: 'goat', label: 'goat' },
  { value: 'sheep', label: 'sheep' },
  { value: 'ram', label: 'ram' },
  { value: 'cattle', label: 'cattle' },
  { value: 'horse', label: 'horse' },
];
export const ANIMAL_TYPES = [
  { value: 'Poultry', label: 'Poultry' },
  { value: 'Livestock', label: 'Livestock' },
  { value: 'Egg', label: 'Egg' },
]
// export const BREED = [
//   { value: 'Poultry', label: 'Poultry' },
//   { value: 'Livestock', label: 'Livestock' },
//   { value: 'Egg', label: 'Egg' },
// ]

export const HEALTH_STATUS = [
  { value: 'healthy', label: 'Healthy', color: 'bg-green-100 text-green-800' },
  { value: 'sick', label: 'Sick', color: 'bg-red-100 text-red-800' },
  { value: 'recovering', label: 'Recovering', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'vaccinated', label: 'Vaccinated', color: 'bg-blue-100 text-blue-800' },
];

export const POULTRY_TYPES = [
  { value: 'broiler', label: 'broiler' },
  { value: 'layer', label: 'layer' },
  { value: 'egg', label: 'egg' },
];

export const VACCINATION_STATUS = [
  { value: 'vaccinated', label: 'Vaccinated', color: 'bg-green-100 text-green-800' },
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'not-vaccinated', label: 'Not Vaccinated', color: 'bg-red-100 text-red-800' },
];

export const EXPENSE_CATEGORIES = [
  { value: 'feed', label: 'Feed' },
  { value: 'medication', label: 'Medication' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'staff', label: 'Staff' },
];

export const STAFF_ROLES = [
  { value: 'manager', label: 'Manager' },
  { value: 'veterinarian', label: 'Veterinarian' },
  { value: 'worker', label: 'Worker' },
  { value: 'supervisor', label: 'Supervisor' },
];
export const FEED_TYPE =[
  { value: 'broiler(super starter)', label: 'broiler(super starter)' },
  { value: 'broiler(starter)', label: 'broiler(starter)' },
  { value: 'broiler(finisher)', label: 'broiler(finisher)' },
  { value: 'layer(chick mash)', label: 'layer(chick mash)' },
  { value: 'layer(grower mash)', label: 'layer(grower mash)' },
  { value: 'layer(layer mash)', label: 'layer(layer mash)' },
  { value: 'cow', label: 'cow' },
  { value: 'goat', label: 'goat' },
  { value: 'sheep', label: 'sheep' },
  { value: 'cattle', label: 'cattle' },
  { value: 'horse', label: 'horse' },
]

export const FEED_CATEGORY = [
  { value: 'Starter', label: 'Starter' },
  { value: 'Grower', label: 'Grower' },
  { value: 'Finisher', label: 'Finisher' },
]

export const COLORS = {
  primary: '#10b981', // Emerald green
  secondary: '#8b5a3c', // Brown
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
};

export const THEME = {
  light: 'light',
  dark: 'dark',
};
