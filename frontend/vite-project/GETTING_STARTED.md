# 🚀 AgroSaaS Frontend - Getting Started Guide

Welcome! This guide will get you up and running in 5 minutes.

---

## **30-Second Setup**

```bash
# Step 1: Install
npm install

# Step 2: Start
npm run dev

# Step 3: Open Browser
# http://localhost:5173

# Step 4: Login
# Any email/password (mock auth)
```

**That's it!** ✅

---

## **What You See After Running `npm run dev`**

```
  VITE v5.0.0  ready in 245 ms

  ➜  Local:   http://localhost:5173/
  ➜  press h + enter to show help
```

Open `http://localhost:5173` in your browser.

---

## **First Login**

You'll land on the login page. Use any credentials:
- Email: `farmer@example.com`
- Password: `password`

(Or any other email/password combination - it's all mock)

---

## **Explore the App**

After login, you'll see:

1. **Sidebar** - Navigation menu with:
   - 🏠 Dashboard
   - 🐄 Livestock
   - 🐔 Poultry
   - 🌾 Inventory
   - 🛒 Marketplace
   - 👨‍⚕️ Vet Booking
   - 💳 Subscription
   - ⚙️ Settings

2. **Navbar** - Top bar with:
   - 🌙 Dark mode toggle
   - 🔔 Notifications
   - 👤 Profile menu

3. **Main Content** - Feature pages with:
   - Charts & statistics
   - Data tables
   - Forms & modals
   - Responsive design

---

## **Key Features to Try**

### **Dashboard**
- View summary statistics
- See revenue/expense charts
- Check mortality trends
- Review recent activities

### **Marketplace**
- Browse animal listings
- Filter by breed
- View seller profiles
- Contact sellers

### **Vet Booking**
- Browse available vets
- See ratings & experience
- Schedule appointments
- View appointment history

### **Inventory**
- Check feed stock levels
- View consumption trends
- Get low-stock alerts
- Export reports

### **Subscription**
- Compare pricing plans
- View billing history
- Download invoices

---

## **Customization**

### **Change App Name**
```javascript
// src/components/layout/Sidebar.jsx
<h1 className="text-2xl font-bold">Your Farm Name</h1>
```

### **Change Theme Color**
```javascript
// tailwind.config.js
theme: {
  colors: {
    primary: '#your-color',
  }
}
```

### **Add New Page**
1. Create `src/pages/feature/PageName.jsx`
2. Add route in `src/routes/index.jsx`
3. Add sidebar link in `src/components/layout/Sidebar.jsx`

---

## **Connect to your Backend**

### **Step 1: Set API URL**
Create `.env` file:
```
VITE_API_URL=http://localhost:5000/api
```

### **Step 2: Update Login Call**
In `src/pages/auth/LoginPage.jsx`, change:
```javascript
// FROM (mock):
const mockToken = `token_${Date.now()}`;
login(mockUser, mockToken);

// TO (real):
const { data } = await authAPI.login(formData.email, formData.password);
login(data.user, data.token);
```

### **Step 3: Use API in Pages**
```javascript
import { livestockAPI } from '../../services/api';

// Fetch data
const { data } = await livestockAPI.getAll();

// Create
await livestockAPI.create(formData);

// Update
await livestockAPI.update(id, formData);

// Delete
await livestockAPI.delete(id);
```

All 50+ endpoints are pre-configured!

---

## **Common Tasks**

### **Add New Component**
```jsx
// src/components/ui/MyComponent.jsx
const MyComponent = ({ prop1, prop2 }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
      Content here
    </div>
  );
};
export default MyComponent;
```

### **Use Authentication Hook**
```javascript
import { useAuth } from '../../hooks/useAuth';

function MyComponent() {
  const { user, isAuthenticated, logout } = useAuth();
  
  if (!isAuthenticated) return null;
  
  return <div>Welcome {user.name}!</div>;
}
```

### **Use Theme Hook**
```javascript
import { useTheme } from '../../hooks/useTheme';

function MyComponent() {
  const { isDark, toggleTheme } = useTheme();
  
  return (
    <button onClick={toggleTheme}>
      {isDark ? '☀️' : '🌙'}
    </button>
  );
}
```

### **Make API Call**
```javascript
import { livestockAPI } from '../../services/api';

const [animals, setAnimals] = useState([]);

useEffect(() => {
  const fetch = async () => {
    const { data } = await livestockAPI.getAll();
    setAnimals(data);
  };
  fetch();
}, []);
```

---

## **Project Structure**

```
src/
├── pages/              # All pages (8+)
│   ├── auth/          
│   ├── dashboard/
│   ├── management/
│   ├── marketplace/
│   ├── vet/
│   ├── subscription/
│   └── admin/
├── components/         # Reusable components
│   ├── ui/            # Button, Card, Input, etc.
│   └── layout/        # Sidebar, Navbar, MainLayout
├── context/           # Global state (Auth, Theme)
├── hooks/             # useAuth, useTheme
├── services/          # API setup
├── routes/            # Routing configuration
├── data/              # Mock data
├── utils/             # Helpers & constants
└── App.jsx            # Main component
```

---

## **Development Workflow**

1. **Make changes** → Code auto-refreshes
2. **Check devtools** → React DevTools extension
3. **Test responsive** → DevTools device toolbar
4. **Test dark mode** → Click moonicon in navbar
5. **Push to git** → Version control

---

## **Building for Production**

```bash
# Build
npm run build

# This creates dist/ folder with optimized files

# Preview production build locally
npm run preview

# Deploy dist/ folder to:
# - Vercel
# - Netlify
# - AWS S3
# - Any static host
```

---

## **Troubleshooting**

**Problem**: Port 5173 in use
```bash
npm run dev -- --port 3000
```

**Problem**: Modules not found
```bash
rm -rf node_modules package-lock.json
npm install
```

**Problem**: Tailwind not applying
```bash
# Restart dev server
npm run dev
```

**Problem**: localStorage is empty
```javascript
// Check in console:
localStorage.getItem('agritech_token');
```

**Problem**: Routes not working
```bash
# Clear browser cache (Ctrl+Shift+Delete)
# Or use incognito mode
```

---

## **File Locations**

| What | Where |
|------|-------|
| Login Page | `src/pages/auth/LoginPage.jsx` |
| Dashboard | `src/pages/dashboard/FarmerDashboard.jsx` |
| Add APIs | `src/services/api.js` |
| Routes | `src/routes/index.jsx` |
| Button Component | `src/components/ui/Button.jsx` |
| Theme Toggle | `src/hooks/useTheme.js` |
| Colors | `tailwind.config.js` |

---

## **Environment Variables**

Create `.env` file in project root:

```
# Backend API
VITE_API_URL=http://localhost:5000/api

# Optional
VITE_APP_NAME=AgroSaaS
VITE_ENABLE_MARKETPLACE=true
```

---

## **Useful Commands**

```bash
# Development
npm run dev

# Build for production
npm run build

# Preview build
npm run preview

# Check for errors
npm run lint

# Format code
npm run format
```

---

## **Next Steps**

1. ✅ Run `npm run dev`
2. ✅ Explore all pages
3. ✅ Read documentation files in project root
4. ✅ Connect to your backend API
5. ✅ Customize colors/name
6. ✅ Deploy to production

---

## **Need Help?**

- 📖 Read `AGRISAAS_README.md` (full docs)
- 📖 Read `QUICKSTART.md` (common tasks)
- 💬 Check component comments (JSDoc)
- 🔍 Inspect browser DevTools
- 🚀 Check React DevTools extension

---

## **You're Ready!**

```bash
npm install && npm run dev
```

Open http://localhost:5173 and explore! 🎉
