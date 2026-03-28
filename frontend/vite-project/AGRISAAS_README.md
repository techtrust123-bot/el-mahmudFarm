# AgroSaaS - Production-Ready AgriTech SaaS Frontend

A complete, scalable agricultural technology SaaS platform built with React, Tailwind CSS, and modern best practices.

## 🚀 Features

### 1. **Authentication System**
- User login/registration pages
- Password validation
- JWT token management via Context
- Mock authentication flow
- Protected routes with role-based access

### 2. **Dashboard**
- Farmer dashboard with analytics
- Summary statistics cards
- Revenue vs expenses charts
- Mortality trend analysis
- Weekly feed usage tracking
- Recent activities feed

### 3. **Livestock Management**
- Add/edit/delete livestock
- Track animal health status
- Search and filter by breed/type
- Veterinary checkup scheduling

### 4. **Poultry Management**
- Batch tracking
- Mortality rate monitoring
- Vaccination status tracking
- Feed consumption monitoring

### 5. **Marketplace**
- Browse and list animals for sale
- Filter by breed, price, location
- Seller profile information
- Contact seller functionality
- Admin approval system

### 6. **Veterinary Booking**
- Browse available veterinarians
- View vet profiles and ratings
- Schedule appointments
- Track appointment status
- Consultation fee information

### 7. **Feed & Inventory Management**
- Track feed stock levels
- Monitor consumption trends
- Low stock alerts
- Supplier information
- Reorder suggestions
- Export inventory reports

### 8. **Subscription & Billing**
- Multiple pricing plans (Basic, Pro, Enterprise)
- Recommended plan highlighting
- Billing history
- Payment method management
- Plan upgrade/downgrade

### 9. **Admin Dashboard**
- Platform overview and analytics
- User management
- Marketplace moderation
- Revenue tracking
- System health monitoring

## 📁 Project Structure

```
src/
├── components/
│   ├── ui/              # Reusable UI components
│   │   ├── Button.jsx
│   │   ├── Card.jsx
│   │   ├── Input.jsx
│   │   ├── Badge.jsx
│   │   ├── Modal.jsx
│   │   ├── Table.jsx
│   │   └── StatCard.jsx
│   ├── charts/          # Chart components (Recharts)
│   └── layout/          # Layout components
│       ├── Sidebar.jsx
│       ├── Navbar.jsx
│       └── MainLayout.jsx
├── pages/
│   ├── auth/            # Authentication pages
│   │   ├── LoginPage.jsx
│   │   └── RegisterPage.jsx
│   ├── dashboard/       # Dashboard pages
│   │   └── FarmerDashboard.jsx
│   ├── management/      # Management pages
│   │   └── InventoryPage.jsx
│   ├── marketplace/     # Marketplace pages
│   │   └── MarketplacePage.jsx
│   ├── vet/            # Veterinary pages
│   │   └── VetBookingPage.jsx
│   ├── subscription/    # Subscription pages
│   │   └── SubscriptionPage.jsx
│   └── admin/          # Admin pages
│       └── AdminDashboard.jsx
├── context/            # Global state management
│   ├── AuthContext.jsx
│   └── ThemeContext.jsx
├── hooks/              # Custom React hooks
│   ├── useAuth.js
│   └── useTheme.js
├── services/           # API services
│   └── api.js         # Axios configuration
├── routes/             # Routing configuration
│   ├── ProtectedRoute.jsx
│   └── index.jsx
├── data/               # Mock data
│   └── mockData.js
├── utils/              # Utility functions
└── App.jsx             # Main app component
```

## 🛠 Tech Stack

- **Frontend Framework**: React 19.x
- **Build Tool**: Vite
- **Styling**: Tailwind CSS 3
- **Routing**: React Router v6
- **State Management**: React Context API
- **HTTP Client**: Axios
- **Charts**: Recharts
- **Icons**: React Icons
- **Dark Mode**: CSS Classes + Context

## 🎨 Design System

### Color Palette (Green Theme)
- **Primary**: `#15803d` (Green-600)
- **Light BG**: `#f9fafb` (Gray-50)
- **Dark BG**: `#111827` (Gray-900)
- **Accent**: Blues, Purples, Oranges

### Responsive Breakpoints
- **Mobile**: 320px and up
- **Tablet**: 768px (md)
- **Desktop**: 1024px (lg)
- **XL Desktop**: 1280px (xl)

## 📦 Dependencies

```json
{
  "dependencies": {
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "react-router-dom": "^6.22.0",
    "axios": "^1.6.0",
    "recharts": "^2.10.0",
    "react-icons": "^5.0.0",
    "tailwindcss": "^3.4.0"
  }
}
```

## 🚀 Getting Started

### 1. Installation
```bash
npm install
```

### 2. Development Server
```bash
npm run dev
```

### 3. Build for Production
```bash
npm run build
```

### 4. Preview Production Build
```bash
npm run preview
```

## 🔐 Authentication Flow

1. User registers/logs in → Mock JWT token generated
2. Token stored in `localStorage` and `AuthContext`
3. Protected routes check `useAuth()` hook
4. Sidebar/Navbar rendered based on user role
5. Logout clears token and redirects to login

## 🌐 API Structure (Ready for Backend)

All API calls are configured in `src/services/api.js`:

```javascript
// Example usage
import { livestockAPI } from './services/api';

// Create request
const response = await livestockAPI.create(data);

// Update request
await livestockAPI.update(id, data);

// Delete request
await livestockAPI.delete(id);
```

### Endpoint Structure
```
/api/auth/login
/api/auth/register
/api/dashboard/stats
/api/livestock
/api/poultry
/api/marketplace/listings
/api/vets
/api/subscriptions/plans
/api/admin/stats
```

## 🎯 Key Features Implementation

### Role-Based Access
- **Farmers**: Dashboard, Livestock, Marketplace, Vet Booking, Subscription
- **Vets**: Appointments, profile
- **Admins**: Dashboard, Users, Marketplace moderation

### Dark Mode
- Toggle in navbar
- Persisted to localStorage
- Applies via `dark:` Tailwind classes

### Responsive Design
- Mobile-first approach
- FlexBox and Grid layouts
- Breakpoint-specific visibility
- Touch-friendly buttons

### Form Validation
- Real-time error messages
- Required field indicators
- Email format validation
- Password confirmation matching

## 🔌 Connecting to Backend

1. Update `VITE_API_URL` in `.env`:
   ```
   VITE_API_URL=http://localhost:5000/api
   ```

2. Replace mock functions with real API calls:
   ```javascript
   // Before (Mock)
   const mockToken = `token_${Date.now()}`;
   login(mockUser, mockToken);

   // After (Real API)
   const { data } = await authAPI.login(email, password);
   login(data.user, data.token);
   ```

3. Remove mock data usage and fetch from endpoints

## 📱 Mobile Responsiveness

- **Sidebar**: Collapses to hamburger menu on mobile
- **Tables**: Horizontal scroll with flex-wrap
- **Grids**: Single column on mobile, 2-3 on tablet, 4-5 on desktop
- **Forms**: Full-width on mobile, grid layout on desktop

## 🎭 State Management

### AuthContext
```javascript
{
  user: { id, email, name, role, farm },
  token: string,
  isAuthenticated: boolean,
  login(userData, token),
  logout(),
  setLoading(boolean)
}
```

### ThemeContext
```javascript
{
  isDark: boolean,
  toggleTheme() → void
}
```

## 🔄 Data Flow

```
User Input → Component State → Context/API → Render Update
```

## 📊 Charts & Visualization

- **Line Charts**: Revenue trends, feed consumption
- **Bar Charts**: Mortality by type, monthly expenses
- **Area Charts**: Revenue vs expenses stacked
- **Pie Charts**: Expense by category

## 🎨 UI Components

All components are fully reusable and accept props for customization:

```jsx
<Button variant="primary" size="lg" fullWidth>Submit</Button>
<Card shadow="lg" padding="p-6">Content</Card>
<Badge variant="success">Approved</Badge>
<StatCard icon={FiHome} label="Total" value="256" color="green" />
<Table columns={[...]} data={[...]} actions={(row) => [...]} />
<Modal isOpen={true} title="Form" onClose={...}>Body</Modal>
```

## 🧪 Testing Notes

- Mock data is hardcoded in pages
- API responses are simulated with `setTimeout`
- Real backend endpoints need to be connected
- Authentication persists via localStorage

## 📝 Best Practices Implemented

- ✅ Component composition and reusability
- ✅ Custom hooks for logic extraction
- ✅ Context API for global state
- ✅ Protected routes with role-based access
- ✅ Responsive design patterns
- ✅ Error boundary ready
- ✅ Performance optimized with lazy loading patterns
- ✅ Clean code structure and naming conventions
- ✅ Comprehensive documentation
- ✅ Accessibility considerations

## 🚀 Deployment

### Vercel
```bash
npm run build
# Deploy dist/ folder
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

## 📞 Support & Documentation

- Comprehensive JSDoc comments in all files
- API structure ready for integration
- Mock data demonstrates expected data shapes
- Component props are self-documented

## 📄 License

MIT License - Feel free to use for commercial projects
