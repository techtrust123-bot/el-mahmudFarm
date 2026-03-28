# CloudFarm - Livestock & Poultry Farm Management System

A comprehensive, production-ready web application for managing livestock and poultry farms. Built with React, Tailwind CSS, and modern web technologies.

## 🌾 Features

### Authentication System
- **Login/Register** with email validation
- **Forgot Password** functionality
- Protected routes with JWT token management
- Session management with localStorage

### Dashboard
- Summary statistics (Total Animals, Poultry, Revenue, Expenses, Mortality Rate)
- Interactive charts for:
  - Monthly revenue and expenses analysis
  - Weekly feed consumption trends
  - Mortality trends
- Recent activity feed
- Responsive grid layout

### Livestock Management
- Add, edit, delete livestock records
- Track: Tag number, breed, age, weight, health status, purchase date
- Search and filter by type and health status
- Table view with sorting and actions
- Different livestock types: Cow, Goat, Sheep, Pig, Horse

### Poultry Management
- Batch management for poultry
- Track: Batch ID, type (Broiler/Layer), quantity, mortality, vaccination status
- Feed consumption tracking
- Statistics summary
- Vaccination status monitoring

### Feed Management
- Add feed stock with supplier information
- Track consumption vs. available stock
- Low stock alert system
- Feed consumption charts
- Cost tracking

### Sales & Revenue
- Record sales transactions
- Invoice generation
- Customer tracking
- Revenue analytics
- Completed/Pending status tracking

### Expense Management
- Record farm expenses with categorization
- Categories: Feed, Medication, Maintenance, Staff
- Expense charts and analysis
- Monthly spending overview
- Pie chart by category

### Staff Management
- Add staff members with roles
- Track salary and contact information
- Roles: Manager, Veterinarian, Worker, Supervisor
- Payroll summary
- Hire date tracking

### Settings
- Farm details configuration
- Profile management
- Theme toggle (Dark/Light mode)
- Notification preferences

## 📁 Project Structure

```
src/
├── components/
│   ├── ui/                 # Reusable UI components
│   │   ├── Button.jsx
│   │   ├── Card.jsx
│   │   ├── Input.jsx
│   │   ├── Select.jsx
│   │   ├── Textarea.jsx
│   │   ├── Modal.jsx
│   │   ├── Badge.jsx
│   │   ├── Table.jsx
│   │   ├── Alert.jsx
│   │   └── StatCard.jsx
│   └── common/             # Common layout components
│       ├── Sidebar.jsx
│       ├── Navbar.jsx
│       └── LoadingSpinner.jsx
├── pages/                  # Page components
│   ├── LoginPage.jsx
│   ├── RegisterPage.jsx
│   ├── ForgotPasswordPage.jsx
│   ├── DashboardPage.jsx
│   ├── LivestockPage.jsx
│   ├── PoultryPage.jsx
│   ├── FeedPage.jsx
│   ├── SalesPage.jsx
│   ├── ExpensePage.jsx
│   ├── StaffPage.jsx
│   └── SettingsPage.jsx
├── layouts/                # Layout wrappers
│   └── MainLayout.jsx
├── context/                # React Context
│   └── ThemeContext.jsx
├── services/               # API services
│   └── api.js
├── utils/                  # Utilities
│   ├── validation.js       # Form validation
│   └── constants.js
├── data/                   # Dummy data
│   └── dummyData.js
├── styles/                 # Global styles
│   └── (index.css, App.css)
├── App.jsx                 # Main app component with routing
├── main.jsx                # React DOM render
└── index.css              # Tailwind + global styles
```

## 🛠️ Technologies

- **Frontend Framework**: React 19 (Functional Components + Hooks)
- **Styling**: Tailwind CSS 4
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Icons**: React Icons
- **Charts**: Recharts
- **Form Validation**: Zod
- **Dark Mode**: Custom Context API
- **Build Tool**: Vite

## 🚀 Getting Started

### Prerequisites
- Node.js (v16+)
- npm or yarn

### Installation

1. Install dependencies:
```bash
cd vite-project
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

4. Preview production build:
```bash
npm run preview
```

## 📝 Usage

### Authentication
- Default credentials (for demo):
  - Email: admin@farm.com
  - Password: password123
- Use the register page to create new accounts
- Protected routes automatically redirect unauthenticated users to login

### Navigation
- **Sidebar**: Main navigation menu (collapses on mobile)
- **Navbar**: Top navigation with theme toggle, notifications, and profile menu
- **Responsive**: Fully responsive design for mobile, tablet, and desktop

### Forms
- All forms include validation with helpful error messages
- Full support for keyboard navigation
- Auto-clear form on successful submission

### Data Management
- Add, Edit, Delete operations for all resources
- Search and filter capabilities
- Table with sorting and actions
- Modal dialogs for adding/editing records

## 🎨 Design Features

- **Professional Agricultural Theme**: Green and brown color scheme
- **Consistent Spacing**: 4px base unit system
- **Soft Shadows**: Subtle depth and elevation
- **Rounded Corners**: Modern card-based design
- **Dark Mode Support**: Full dark mode implementation
- **Accessibility**: WCAG compliant components
- **Responsive Grid**: Mobile-first design approach

## 📊 Component Features

### Cards
- Multiple variants (default, shadow, etc.)
- Customizable padding
- Hover effects

### Buttons
- Variants: Primary, Secondary, Danger, Outline, Ghost
- Sizes: Small, Medium, Large
- Full width support
- Disabled state handling

### Forms
- Input, Select, Textarea components
- Form validation with Zod
- Error message display
- Helper text support
- Required field indicators

### Tables
- Responsive design
- Custom column rendering
- Action buttons
- Loading state
- Empty state handling

### Charts
- Line charts for trends
- Bar charts for comparisons
- Pie charts for categories
- Interactive tooltips

## 🔐 Authentication

The app uses JWT tokens stored in localStorage for authentication. 

To implement backend authentication:
1. Update API endpoints in `src/services/api.js`
2. Modify authentication logic in pages/LoginPage.jsx
3. Add your backend API URL to environment variables

## 🎯 Future Enhancements

- [ ] Advanced reporting and PDF export
- [ ] Email notifications
- [ ] Mobile app version
- [ ] Real-time data synchronization
- [ ] Multi-language support
- [ ] Role-based access control (RBAC)
- [ ] Backup and recovery
- [ ] API integration with actual backend
- [ ] Advanced analytics and predictions
- [ ] Inventory management system

## 📄 License

This project is licensed under the MIT License.

## 👨‍💻 Support

For support, issues, or feature requests, please create an issue in the repository.

## 🙏 Credits

Built with modern React patterns and best practices. Designed for production-grade farm management systems.
