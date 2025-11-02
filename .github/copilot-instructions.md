# Ekuinox Backend - Copilot Instructions

## Project Overview
- [x] **Verify that the copilot-instructions.md file in the .github directory is created** ✅ Created
- [x] **Clarify Project Requirements** ✅ Node.js Express MongoDB backend API for Ekuinox project  
- [x] **Scaffold the Project** ✅ Created folder structure, models, controllers, middleware, and configuration files
- [x] **Customize the Project** ✅ Comprehensive API with authentication, validation, and admin features
- [x] **Install Required Extensions** ✅ No specific extensions required for this Node.js project
- [x] **Compile the Project** ✅ Dependencies installed, server configuration completed
- [x] **Create and Run Task** ✅ Development server task created and configured  
- [x] **Launch the Project** ✅ Server successfully running on http://localhost:5000
- [x] **Ensure Documentation is Complete** ✅ README.md and documentation completed

## Architecture & Tech Stack
This is a Node.js Express.js REST API backend for the Ekuinox project with the following tech stack:

- **Runtime**: Node.js (>=18.0.0)
- **Framework**: Express.js with RESTful architecture
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens) with bcryptjs
- **Security**: Helmet, CORS, Rate Limiting, Input Validation
- **Development**: Nodemon, ESLint for development workflow

## Key Features Implemented
- **Authentication & Authorization**: Complete user management with role-based access
- **Product Management**: CRUD operations for product catalog with categories and variants
- **Location Services**: Countries and cities management system
- **Admin Dashboard**: Statistics, user management, and system monitoring
- **Security Features**: Comprehensive security middleware and validation
- **API Documentation**: Well-structured RESTful endpoints with consistent responses

## Development Guidelines
When working on this codebase:

1. **Follow RESTful Conventions**: All API endpoints follow REST principles
2. **Use Middleware**: Authentication, validation, and error handling are middleware-based
3. **Consistent Responses**: All API responses follow the standard success/error format
4. **Input Validation**: Use express-validator for all user inputs
5. **Security First**: Always implement proper authentication and authorization
6. **Environment Variables**: Use .env for all configuration (never hardcode secrets)

## File Structure
```
src/
├── config/         # Database and app configuration
├── controllers/    # Business logic for each entity
├── middleware/     # Authentication, validation, error handling
├── models/         # Mongoose schemas and models
├── routes/         # API endpoint definitions
├── utils/          # Helper functions and utilities
└── server.js       # Main application entry point
```

## Database Schema
- **Users**: Authentication, profiles, roles (user/admin)
- **Products**: Catalog with categories, pricing, variants, media
- **Countries/Cities**: Location data for shipping/billing
- **Audit Fields**: All models include createdAt, updatedAt, isActive

## API Endpoints Overview
- `/api/auth/*` - Authentication (register, login, profile management)
- `/api/users/*` - User management (admin only)
- `/api/products/*` - Product catalog management
- `/api/countries/*` - Country data management  
- `/api/cities/*` - City data management
- `/api/admin/*` - Admin dashboard and statistics

## Development Workflow
1. **Local Development**: `npm run dev` (uses nodemon for auto-restart)
2. **Testing**: Server runs on http://localhost:5000
3. **Database**: Requires MongoDB running locally or MongoDB Atlas connection
4. **Environment**: Copy `.env.example` to `.env` and configure
5. **Admin Setup**: Use POST `/api/admin/init` to create initial admin user

## Production Considerations
- Set strong JWT_SECRET in production
- Configure MongoDB Atlas for cloud database
- Enable proper CORS settings for production frontend
- Set up proper logging and monitoring
- Configure rate limiting and security headers
- Use HTTPS in production environment