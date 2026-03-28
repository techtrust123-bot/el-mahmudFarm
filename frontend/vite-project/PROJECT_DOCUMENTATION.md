# Project Documentation

## CloudFarm - Livestock & Poultry Farm Management System

This is a production-ready frontend application built with React and Tailwind CSS.

### Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

3. Open browser to http://localhost:5173

### Project Structure

- **src/components/ui** - Reusable UI components (buttons, cards, inputs, modals, tables)
- **src/components/common** - Layout components (Sidebar, Navbar)
- **src/pages** - Page components (Dashboard, Livestock, Poultry, etc.)
- **src/layouts** - Layout wrappers
- **src/context** - React Context providers (Theme)
- **src/services** - API service layer
- **src/utils** - Utilities for validation and constants
- **src/data** - Dummy data for development

### Key Features

✅ Responsive design (mobile, tablet, desktop)
✅ Dark/Light theme toggle
✅ Form validation with Zod
✅ Authentication system
✅ CRUD operations for all resources
✅ Charts and analytics with Recharts
✅ Modern UI with Tailwind CSS
✅ Smooth animations and transitions
✅ Accessibility compliant
✅ Production-ready code

### Available Routes

**Public Routes:**
- `/login` - Login page
- `/register` - Registration page
- `/forgot-password` - Password reset

**Protected Routes:**
- `/dashboard` - Main dashboard
- `/livestock` - Livestock management
- `/poultry` - Poultry management
- `/feed` - Feed management
- `/sales` - Sales & revenue
- `/expenses` - Expense tracking
- `/staff` - Staff management
- `/settings` - Settings page

### Testing

Use the following credentials for demo:
- Email: admin@farm.com
- Password: password123

Or create a new account via the register page.

### API Integration

To connect to your backend:
1. Create a `.env` file based on `.env.example`
2. Set `VITE_API_URL` to your backend URL
3. Update API endpoints in `src/services/api.js`

### Components Documentation

All components are fully documented with JSDoc comments. Key components:

- **Button**: Multiple variants and sizes
- **Card**: Flexible container with shadow and padding
- **Input**: Text input with error handling
- **Select**: Dropdown with custom options
- **Table**: Data table with sorting and actions
- **Modal**: Dialog component
- **Badge**: Status indicators
- **Alert**: Toast notifications
- **StatCard**: Dashboard statistics card

### Styling

The project uses Tailwind CSS with:
- Responsive grid system
- Dark mode support
- Custom color scheme (emerald green, brown)
- Consistent spacing (4px base unit)
- Professional shadows and rounded corners

### Performance Optimizations

- Code splitting with React Router
- Lazy component loading
- Memoization of expensive components
- Optimized re-renders
- Image optimization ready

### Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

### Contributing

When adding new features:
1. Create reusable components in `src/components`
2. Add proper TypeScript/JSDoc comments
3. Follow the existing code style
4. Keep components small and focused
5. Add tests for critical functionality

### Troubleshooting

**Issue: Styles not loading**
- Clear browser cache
- Restart dev server: `npm run dev`

**Issue: Routes not working**
- Check React Router version compatibility
- Verify route paths in App.jsx

**Issue: Form validation not working**
- Check Zod schema definitions
- Verify form field names match schema

### Additional Resources

- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [React Router](https://reactrouter.com)
- [Recharts](https://recharts.org)
- [Zod Validation](https://zod.dev)

---

Built with ❤️ for modern farm management.
