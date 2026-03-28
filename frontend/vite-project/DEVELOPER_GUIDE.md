# CloudFarm - Developer Quick Reference

## 🚀 Quick Start (5 minutes)

```bash
# 1. Navigate to project
cd vite-project

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev

# 4. Open browser to http://localhost:5173
```

---

## 🔑 Demo Credentials

**Email**: admin@farm.com  
**Password**: password123

Or create a new account via the register page.

---

## 📁 Key File Locations

| Task | File |
|------|------|
| Add new page | `src/pages/YourPage.jsx` |
| Create UI component | `src/components/ui/YourComponent.jsx` |
| Add API endpoint | `src/services/api.js` |
| Form validation | `src/utils/validation.js` |
| Application constants | `src/utils/constants.js` |
| Dummy data | `src/data/dummyData.js` |
| Global styles | `src/index.css` |
| Router config | `src/App.jsx` |

---

## 🎯 Common Tasks

### Create a New Page

1. Create file in `src/pages/MyPage.jsx`:
```jsx
import React, { useState } from 'react';
import MainLayout from '../layouts/MainLayout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const MyPage = () => {
  return (
    <MainLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">My Page</h1>
        <Card>
          {/* Your content here */}
        </Card>
      </div>
    </MainLayout>
  );
};

export default MyPage;
```

2. Add route in `src/App.jsx`:
```jsx
<Route path="/my-page" element={<ProtectedRoute><MyPage /></ProtectedRoute>} />
```

### Add Form Validation

1. Define schema in `src/utils/validation.js`:
```javascript
export const mySchema = z.object({
  field1: z.string().min(1, 'Required'),
  field2: z.number().positive(),
});
```

2. Use in component:
```jsx
const { isValid, errors } = validateForm(data, mySchema);
```

### Create Reusable Component

```jsx
import React from 'react';

const MyComponent = ({ children, variant = 'default', ...props }) => {
  return (
    <div className={`variant-${variant}`} {...props}>
      {children}
    </div>
  );
};

export default MyComponent;
```

### Add API Endpoint

In `src/services/api.js`:
```javascript
export const myAPI = {
  getAll: () => apiClient.get('/my-endpoint'),
  getById: (id) => apiClient.get(`/my-endpoint/${id}`),
  create: (data) => apiClient.post('/my-endpoint', data),
  update: (id, data) => apiClient.put(`/my-endpoint/${id}`, data),
  delete: (id) => apiClient.delete(`/my-endpoint/${id}`),
};
```

---

## 🎨 Tailwind CSS Cheat Sheet

### Common Utilities

```jsx
// Spacing
<div className="p-4 m-2 gap-3">

// Colors
<div className="bg-emerald-600 text-white dark:bg-gray-800">

// Flexbox
<div className="flex items-center justify-between">

// Grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">

// Responsive
<div className="hidden md:block">  {/* Show only on medium+ */}

// Dark Mode
<div className="dark:bg-gray-800 dark:text-white">

// Hover/Focus
<button className="hover:bg-gray-200 focus:ring-2">
```

---

## 🔄 Component Props Reference

### Button
```jsx
<Button 
  variant="primary|secondary|danger|outline|ghost"
  size="sm|md|lg"
  fullWidth={true|false}
  disabled={true|false}
  type="button|submit|reset"
/>
```

### Input
```jsx
<Input
  label="Label"
  type="text|email|password|number|date"
  value={value}
  onChange={handler}
  error={errorMessage}
  placeholder="..."
  required={true|false}
  fullWidth={true|false}
/>
```

### Card
```jsx
<Card
  padding="p-4|p-6|p-8"
  shadow={true|false}
  className="custom-class"
/>
```

### Modal
```jsx
<Modal
  isOpen={boolean}
  onClose={handler}
  title="Modal Title"
  size="sm|md|lg|xl"
  footer={<Actions />}
/>
```

### Table
```jsx
<Table
  columns={[{ key: 'name', label: 'Name' }]}
  data={items}
  loading={false}
  actions={(row) => [<Button>Edit</Button>]}
/>
```

---

## 🔐 Authentication Flow

1. User enters credentials on login page
2. Form validates with Zod schema
3. API call (simulated) returns token
4. Token stored in localStorage
5. ProtectedRoute checks for token
6. Redirect to dashboard if authenticated

Logout clears localStorage and redirects to login.

---

## 📊 Working with Charts

```jsx
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

<ResponsiveContainer width="100%" height={300}>
  <LineChart data={data}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="name" />
    <YAxis />
    <Tooltip />
    <Legend />
    <Line type="monotone" dataKey="value" stroke="#10b981" />
  </LineChart>
</ResponsiveContainer>
```

---

## 🎯 State Management Pattern

```jsx
const [formData, setFormData] = useState({
  field1: '',
  field2: '',
});

const [errors, setErrors] = useState({});

const handleChange = (e) => {
  const { name, value } = e.target;
  setFormData(prev => ({ ...prev, [name]: value }));
  if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
};

const handleSubmit = (e) => {
  e.preventDefault();
  const { isValid, errors: validationErrors } = validateForm(formData, schema);
  if (!isValid) {
    setErrors(validationErrors);
    return;
  }
  // Submit logic
};
```

---

## 🌙 Theme Toggle Usage

```jsx
import { useTheme } from '../context/ThemeContext';

const Component = () => {
  const { isDark, toggleTheme } = useTheme();
  
  return (
    <button onClick={toggleTheme}>
      {isDark ? 'Light Mode' : 'Dark Mode'}
    </button>
  );
};
```

---

## 🚨 Common Errors & Solutions

| Error | Solution |
|-------|----------|
| "Cannot find module" | Run `npm install` |
| Styles not loading | Clear cache, restart dev server |
| Route not working | Check path spelling in `src/App.jsx` |
| Form validation failing | Verify field names match schema |
| Dark mode not applying | Ensure `ThemeProvider` wraps app |

---

## 📦 npm Commands

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run preview    # Preview production build
npm run lint       # Run linter
npm install        # Install dependencies
npm update         # Update dependencies
npm list          # List installed packages
```

---

## 🔧 Environment Setup

Create `.env` file:
```env
VITE_API_URL=http://localhost:3000/api
VITE_APP_NAME=CloudFarm
```

Access in code:
```javascript
const apiUrl = import.meta.env.VITE_API_URL;
```

---

## 💾 Data Persistence Pattern

```jsx
// Save to localStorage
localStorage.setItem('key', JSON.stringify(data));

// Load from localStorage
const data = JSON.parse(localStorage.getItem('key'));

// Combine with useEffect
useEffect(() => {
  const saved = localStorage.getItem('theme');
  if (saved) setTheme(saved);
}, []);
```

---

## 🎨 Color Values

```javascript
const colors = {
  primary: '#10b981',      // Emerald
  secondary: '#8b5a3c',    // Brown
  success: '#10b981',      // Green
  error: '#ef4444',        // Red
  warning: '#f59e0b',      // Yellow
  info: '#3b82f6',         // Blue
};
```

---

## 📱 Responsive Breakpoints

| Prefix | Size |
|--------|------|
| sm | 640px |
| md | 768px |
| lg | 1024px |
| xl | 1280px |
| 2xl | 1536px |

Example: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3`

---

## 🧩 Component Naming Convention

- PascalCase for component files: `MyComponent.jsx`
- Export default from component file
- Props interface in JSDoc comments
- Clear prop descriptions

---

## 📝 Important Notes

- Keep components small and focused
- Use reusable UI components
- Validate all form inputs
- Always handle errors gracefully
- Load dummy data from `dummyData.js`
- Use Tailwind for all styling
- Add comments for complex logic

---

## 🎓 Learning Paths

**Frontend Basics**
- React hooks (useState, useEffect, useContext)
- JSX and component structure
- Props and state management

**Styling**
- Tailwind CSS utility classes
- Responsive design patterns
- Dark mode implementation

**Advanced**
- React Router navigation
- Form validation patterns
- API integration

---

## 🔗 Useful Links

- [React Docs](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [React Router](https://reactrouter.com)
- [Zod Validation](https://zod.dev)
- [Recharts](https://recharts.org)

---

## 🎯 Pro Tips

1. ✅ Use `useCallback` for expensive functions
2. ✅ Memoize components with `React.memo` if needed
3. ✅ Always validate user input
4. ✅ Use error boundaries for error handling
5. ✅ Keep API calls in services folder
6. ✅ Use context for global state
7. ✅ Test responsive design on mobile
8. ✅ Check accessibility with screen readers

---

**Happy Coding! 🌾**
