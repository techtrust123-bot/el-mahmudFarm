# Available vs Sold Animals - UI Separation

## Frontend Updates

### ✅ Poultry Page (`src/pages/PoultryPage.jsx`)
- **Separated State**: `availablePoultry` and `soldPoultry` stored independently
- **Tab Navigation**: Toggle between "Available" and "Sold" tabs
  - Shows count: `Available (15)` and `Sold (3)`
- **Separate Statistics**: Stats dynamically change based on active tab
  - Total Poultry, Mortality, Vaccination Status, Feed Consumption
- **Separate Filtering & Search**: Filter and search within each tab independently
- **Separate API Calls**: 
  - `GET /api/poultry/available` - Available poultry only
  - `GET /api/poultry/sold` - Sold poultry only

### ✅ Livestock Page (`src/pages/LivestockPage.jsx`)
- **Separated State**: `availableLivestock` and `soldLivestock` stored independently
- **Tab Navigation**: Toggle between "Available" and "Sold" tabs
  - Shows count: `Available (25)` and `Sold (8)`
- **Separate Statistics**: Stats dynamically change based on active tab
  - Total Livestock, Total Cost, Avg Feed Consumption, Feed Stages
- **Separate Filtering & Search**: Filter and search within each tab independently
- **Separate API Calls**:
  - `GET /api/livestock/available` - Available livestock only
  - `GET /api/livestock/sold` - Sold livestock only

## UI Features

### Tab Navigation
```
┌─────────────────────────────────────┐
│ Available (15) │ Sold (3)           │
├─────────────────────────────────────┤
│ (Active tab is highlighted in blue) │
└─────────────────────────────────────┘
```

### Statistics Card
- **Available Tab Shows**:
  - Only statistics for available animals
  - Real-time updates when filtering

- **Sold Tab Shows**:
  - Only statistics for sold animals
  - Real-time updates when filtering

### Data Features
- ✅ Each tab maintains its own filtered view
- ✅ Search and filters apply only to active tab
- ✅ Add/Edit/Delete operations refresh both tabs
- ✅ Status field (Available/Sold) visible in table
- ✅ Smooth transitions between tabs

## Backend Support

### New API Endpoints
```
GET /api/poultry/available    - Available poultry batches
GET /api/poultry/sold        - Sold poultry batches
GET /api/livestock/available - Available livestock
GET /api/livestock/sold      - Sold livestock

GET /api/poultry/list        - All poultry (for backward compatibility)
GET /api/livestock/list      - All livestock (for backward compatibility)
```

## Implementation Status
- ✅ Backend: Separate filters in queries (status: { $ne: 'sold' })
- ✅ Frontend: Tab-based UI with separate state management
- ✅ Data: Independent fetching and management
- ✅ Statistics: Tab-aware calculations
- ✅ Sync: Both tabs update on CRUD operations
