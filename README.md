# CloudFarm

CloudFarm is a farm management application with separate backend and frontend components. It is designed to manage livestock, poultry, expenses, feed, sales, staff, and user authentication.

## Project Structure

- `backend/` - Node.js Express API server
  - `controllers/` - Request handlers for domain resources
  - `models/` - Database models and schema definitions
  - `routes/` - API route definitions
  - `middleware/` and `middleweres/` - Request middleware, authentication, validation, and error handling
  - `dbconnection/` - Database configuration
  - `utils/` - Shared utility functions and helpers
  - `nodemailer/` - Mail transporter configuration
  - `scripts/` - Migration and data utilities
  - `jobs/` - Background jobs and scheduled tasks

- `frontend/` - Frontend package configuration
  - `vite-project/` - Vite React application
    - `src/` - Application source files
    - `public/` - Static assets
    - `package.json` - Frontend dependencies and scripts
    - `README.md` - Frontend-specific documentation

## Getting Started

### Backend

1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the backend server:
   ```bash
   npm start
   ```

### Frontend

1. Navigate to the frontend Vite project folder:
   ```bash
   cd frontend/vite-project
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the frontend:
   ```bash
   npm run dev
   ```

## Notes

- `ANIMAL_SEPARATION.md` appears to contain domain-specific notes or requirements.
- Review any local `.env` configuration required by the backend before starting the server.
- The frontend and backend are separate apps, so run them in separate terminals.

## License

This repository does not include a license file by default. Add one if needed for your project.
