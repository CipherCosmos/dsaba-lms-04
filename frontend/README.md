# DSABA LMS - Frontend

React + TypeScript frontend application for the DSABA Learning Management System.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Edit .env with your API URL

# Start development server
npm run dev
```

The application will be available at http://localhost:3000

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/        # Reusable components
│   │   ├── Auth/         # Authentication components
│   │   ├── Dashboard/    # Dashboard components
│   │   └── Layout/       # Layout components
│   ├── pages/            # Page components
│   │   ├── Admin/        # Admin pages
│   │   ├── HOD/          # HOD pages
│   │   ├── Teacher/      # Teacher pages
│   │   └── Student/      # Student pages
│   ├── modules/          # Feature modules
│   │   ├── admin/        # Admin module
│   │   ├── hod/          # HOD module
│   │   ├── teacher/      # Teacher module
│   │   └── student/      # Student module
│   ├── store/            # Redux store
│   │   └── slices/       # Redux slices
│   ├── services/         # API services
│   ├── config/           # Configuration
│   └── core/             # Core utilities
│       ├── hooks/        # Custom hooks
│       ├── guards/       # Route guards
│       └── utils/        # Utilities
├── public/               # Static assets
└── dist/                 # Build output
```

## 🛠️ Available Scripts

```bash
# Development
npm run dev          # Start development server

# Build
npm run build        # Build for production

# Linting
npm run lint         # Run ESLint

# Preview
npm run preview      # Preview production build
```

## 🔧 Configuration

### Environment Variables

Create `.env` file (see `.env.example`):

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_API_VERSION=v1
VITE_ENVIRONMENT=development
```

**Note**: All `VITE_` prefixed variables are exposed to client-side code. Do not put sensitive information here.

## 🏗️ Tech Stack

- **React 18**: UI library
- **TypeScript**: Type safety
- **Vite**: Build tool
- **Redux Toolkit**: State management
- **React Query**: Data fetching
- **React Router**: Routing
- **Tailwind CSS**: Styling
- **Axios**: HTTP client

## 🐳 Docker

```bash
# Build image
docker build -t dsaba-lms-frontend .

# Run container
docker run -p 3000:80 dsaba-lms-frontend
```

## 📦 Production Build

```bash
# Build
npm run build

# Output will be in dist/
# Serve with any static file server or Nginx
```

## 🔐 Authentication

The frontend uses JWT tokens stored in localStorage. Tokens are automatically included in API requests.

## 🎨 Styling

- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library
- **Custom Components**: Reusable UI components

## 📱 Features

- ✅ Role-based routing
- ✅ Protected routes
- ✅ JWT authentication
- ✅ Redux state management
- ✅ React Query for data fetching
- ✅ Responsive design
- ✅ PWA support

## 🧪 Testing

```bash
# Run tests (if configured)
npm test

# Run linting
npm run lint
```

## 📖 Documentation

See main `README.md` and `docs/` directory for comprehensive documentation.

