/**
 * Dummy data for the application
 * This data is used for development and testing
 */

export const livestockData = [
  {
    id: 1,
    tagNumber: 'COW-001',
    type: 'cow',
    breed: 'Holstein',
    age: 3,
    weight: 650,
    healthStatus: 'healthy',
    purchaseDate: '2023-06-15',
    lastCheckup: '2024-02-20',
  },
  {
    id: 2,
    tagNumber: 'COW-002',
    type: 'cow',
    breed: 'Jersey',
    age: 2,
    weight: 580,
    healthStatus: 'vaccinated',
    purchaseDate: '2023-08-10',
    lastCheckup: '2024-02-18',
  },
  {
    id: 3,
    tagNumber: 'GOAT-001',
    type: 'goat',
    breed: 'Alpine',
    age: 1,
    weight: 72,
    healthStatus: 'healthy',
    purchaseDate: '2024-01-05',
    lastCheckup: '2024-02-19',
  },
  {
    id: 4,
    tagNumber: 'SHEEP-001',
    type: 'sheep',
    breed: 'Merino',
    age: 2,
    weight: 95,
    healthStatus: 'healthy',
    purchaseDate: '2023-09-20',
    lastCheckup: '2024-02-17',
  },
];

export const poultryData = [
  {
    id: 1,
    batchId: 'BROILER-2024-001',
    type: 'broiler',
    quantity: 500,
    mortality: 8,
    vaccinationStatus: 'vaccinated',
    feedConsumption: 1250,
    purchaseDate: '2024-01-10',
    expectedMatureDate: '2024-03-10',
  },
  {
    id: 2,
    batchId: 'LAYER-2024-001',
    type: 'layer',
    quantity: 300,
    mortality: 2,
    vaccinationStatus: 'vaccinated',
    feedConsumption: 450,
    purchaseDate: '2023-11-01',
    eggProduction: 290,
  },
  {
    id: 3,
    batchId: 'BROILER-2024-002',
    type: 'broiler',
    quantity: 400,
    mortality: 3,
    vaccinationStatus: 'pending',
    feedConsumption: 980,
    purchaseDate: '2024-02-01',
    expectedMatureDate: '2024-04-01',
  },
];

export const feedData = [
  {
    id: 1,
    feedType: 'Poultry Starter',
    quantity: 500,
    unit: 'kg',
    cost: 5000,
    supplier: 'Green Valley Feeds',
    purchaseDate: '2024-02-01',
    consumption: 350,
  },
  {
    id: 2,
    feedType: 'Cattle Feed',
    quantity: 1000,
    unit: 'kg',
    cost: 12000,
    supplier: 'Agriculture Supplies Ltd',
    purchaseDate: '2024-02-05',
    consumption: 800,
  },
  {
    id: 3,
    feedType: 'Layer Pellets',
    quantity: 300,
    unit: 'kg',
    cost: 4500,
    supplier: 'Green Valley Feeds',
    purchaseDate: '2024-02-10',
    consumption: 200,
  },
];

export const expenseData = [
  {
    id: 1,
    title: 'Feed Purchase',
    amount: 5000,
    category: 'feed',
    date: '2024-02-20',
    description: 'Poultry starter feed',
  },
  {
    id: 2,
    title: 'Veterinary Services',
    amount: 2000,
    category: 'medication',
    date: '2024-02-18',
    description: 'Health checkup for cattle',
  },
  {
    id: 3,
    title: 'Farm Equipment Maintenance',
    amount: 3500,
    category: 'maintenance',
    date: '2024-02-15',
    description: 'Fence repair',
  },
  {
    id: 4,
    title: 'Monthly Salary',
    amount: 8000,
    category: 'staff',
    date: '2024-02-01',
    description: 'Staff salaries',
  },
];

export const salesData = [
  {
    id: 1,
    invoiceId: 'INV-2024-001',
    date: '2024-02-15',
    product: 'Milk (100L)',
    quantity: 100,
    unitPrice: 50,
    totalAmount: 5000,
    customer: 'Fresh Dairy Ltd',
    status: 'completed',
  },
  {
    id: 2,
    invoiceId: 'INV-2024-002',
    date: '2024-02-18',
    product: 'Eggs (50 trays)',
    quantity: 50,
    unitPrice: 150,
    totalAmount: 7500,
    customer: 'Bakery Supply Co',
    status: 'completed',
  },
  {
    id: 3,
    invoiceId: 'INV-2024-003',
    date: '2024-02-20',
    product: 'Live Broilers (50kg)',
    quantity: 50,
    unitPrice: 400,
    totalAmount: 20000,
    customer: 'Chicken Processors',
    status: 'pending',
  },
];

export const staffData = [
  {
    id: 1,
    name: 'John Smith',
    role: 'manager',
    salary: 25000,
    contact: '0712345678',
    email: 'john.smith@farm.com',
    hireDate: '2022-01-15',
    status: 'active',
  },
  {
    id: 2,
    name: 'Dr. Jane Doe',
    role: 'veterinarian',
    salary: 20000,
    contact: '0712345679',
    email: 'jane.doe@farm.com',
    hireDate: '2022-06-10',
    status: 'active',
  },
  {
    id: 3,
    name: 'Peter Kipchoge',
    role: 'supervisor',
    salary: 12000,
    contact: '0712345680',
    email: 'peter.kipchoge@farm.com',
    hireDate: '2023-03-01',
    status: 'active',
  },
];

export const dashboardStats = {
  totalAnimals: 12,
  totalPoultry: 1200,
  totalRevenue: 32500,
  totalExpenses: 18500,
  mortalityRate: 0.8,
};

export const monthlyChartData = [
  { month: 'Jan', sales: 4000, expenses: 2400, revenue: 1600 },
  { month: 'Feb', sales: 3000, expenses: 1398, revenue: 1602 },
  { month: 'Mar', sales: 2000, expenses: 9800, revenue: 2200 },
  { month: 'Apr', sales: 2780, expenses: 3908, revenue: 2100 },
  { month: 'May', sales: 1890, expenses: 4800, revenue: 2200 },
  { month: 'Jun', sales: 2390, expenses: 3800, revenue: 2500 },
];

export const feedConsumptionData = [
  { date: 'Mon', consumption: 120 },
  { date: 'Tue', consumption: 132 },
  { date: 'Wed', consumption: 101 },
  { date: 'Thu', consumption: 134 },
  { date: 'Fri', consumption: 90 },
  { date: 'Sat', consumption: 130 },
  { date: 'Sun', consumption: 110 },
];

export const mortalityTrendData = [
  { week: 'Week 1', poultry: 5, livestock: 0 },
  { week: 'Week 2', poultry: 8, livestock: 1 },
  { week: 'Week 3', poultry: 3, livestock: 0 },
  { week: 'Week 4', poultry: 6, livestock: 0 },
];

export const recentActivity = [
  {
    id: 1,
    type: 'livestock_added',
    title: 'New Livestock Added',
    description: 'Cow COW-002 added to inventory',
    timestamp: '2024-02-20 10:30 AM',
    icon: 'livestock',
  },
  {
    id: 2,
    type: 'sale_completed',
    title: 'Sale Completed',
    description: 'Invoice INV-2024-003 generated for 50kg broilers',
    timestamp: '2024-02-20 09:15 AM',
    icon: 'sale',
  },
  {
    id: 3,
    type: 'vaccine_given',
    title: 'Vaccination',
    description: 'Batch BROILER-2024-001 vaccinated',
    timestamp: '2024-02-19 02:45 PM',
    icon: 'vaccine',
  },
  {
    id: 4,
    type: 'expense_recorded',
    title: 'Expense Recorded',
    description: 'Feed purchase expense recorded - 5000',
    timestamp: '2024-02-19 11:20 AM',
    icon: 'expense',
  },
];
