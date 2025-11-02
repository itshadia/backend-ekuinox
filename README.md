# Ekuinox Backend API

A robust Node.js backend API for the Ekuinox project built with Express.js and MongoDB.

## 🚀 Features

- **Authentication & Authorization**: JWT-based authentication with role-based access control
- **User Management**: Complete user CRUD operations with admin controls
- **Product Management**: Full product catalog with categories, variants, and media support
- **Location Management**: Countries and cities management system
- **Admin Dashboard**: Comprehensive statistics and system monitoring
- **Security**: Rate limiting, helmet security headers, CORS protection
- **Validation**: Input validation using express-validator
- **Error Handling**: Centralized error handling with detailed logging
- **API Documentation**: RESTful API with consistent response format

## 🛠 Tech Stack

- **Runtime**: Node.js (>=18.0.0)
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JSON Web Tokens (JWT)
- **Validation**: express-validator
- **Security**: Helmet, CORS, Rate Limiting
- **Development**: Nodemon, ESLint

## 📁 Project Structure

```
src/
├── config/
│   └── database.js          # MongoDB connection configuration
├── controllers/
│   ├── authController.js    # Authentication logic
│   ├── userController.js    # User management
│   ├── productController.js # Product operations
│   ├── countryController.js # Country management
│   ├── cityController.js    # City management
│   └── adminController.js   # Admin dashboard & stats
├── middleware/
│   ├── auth.js             # Authentication & authorization
│   └── errorHandler.js     # Global error handling
├── models/
│   ├── User.js             # User schema
│   ├── Product.js          # Product schema
│   ├── Country.js          # Country schema
│   └── City.js             # City schema
├── routes/
│   ├── authRoutes.js       # Authentication endpoints
│   ├── userRoutes.js       # User management endpoints
│   ├── productRoutes.js    # Product endpoints
│   ├── countryRoutes.js    # Country endpoints
│   ├── cityRoutes.js       # City endpoints
│   └── adminRoutes.js      # Admin endpoints
├── utils/
│   └── helpers.js          # Utility functions
└── server.js               # Main application file
```

## 🚦 Getting Started

### Prerequisites

- Node.js (version 18 or higher)
- MongoDB (local installation or MongoDB Atlas)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ekuinox-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   
   Update the `.env` file with your configuration:
   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/ekuinox
   JWT_SECRET=your-super-secret-jwt-key
   JWT_EXPIRE=30d
   FRONTEND_URL=http://localhost:3000
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Initialize Admin User** (One-time setup)
   ```bash
   curl -X POST http://localhost:5000/api/admin/init
   ```

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication Endpoints
- `POST /auth/register` - Register new user
- `POST /auth/login` - User login
- `GET /auth/me` - Get current user
- `PUT /auth/updatedetails` - Update user details
- `PUT /auth/updatepassword` - Update password
- `GET /auth/logout` - Logout user

### Product Endpoints
- `GET /products` - Get all products (with filtering & pagination)
- `GET /products/:id` - Get single product
- `POST /products` - Create product (Admin only)
- `PUT /products/:id` - Update product (Admin only)
- `DELETE /products/:id` - Delete product (Admin only)
- `GET /products/featured` - Get featured products
- `GET /products/popular` - Get popular products
- `GET /products/latest` - Get latest product
- `GET /products/category/:category` - Get products by category

### User Management (Admin only)
- `GET /users` - Get all users
- `GET /users/:id` - Get single user
- `POST /users` - Create user
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Delete user
- `PATCH /users/:id/status` - Toggle user status

### Location Endpoints
- `GET /countries` - Get all countries
- `GET /countries/:id` - Get single country
- `POST /countries` - Create country (Admin only)
- `PUT /countries/:id` - Update country (Admin only)
- `DELETE /countries/:id` - Delete country (Admin only)

- `GET /cities` - Get all cities
- `GET /cities/:id` - Get single city
- `GET /cities/country/:countryId` - Get cities by country
- `POST /cities` - Create city (Admin only)
- `PUT /cities/:id` - Update city (Admin only)
- `DELETE /cities/:id` - Delete city (Admin only)

### Admin Endpoints
- `POST /admin/init` - Initialize admin user (one-time)
- `GET /admin/dashboard` - Get dashboard statistics
- `GET /admin/system` - Get system information

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in requests using either:

**Header Method:**
```
Authorization: Bearer <your-jwt-token>
```

**Custom Header Method:**
```
x-auth-token: <your-jwt-token>
```

## 📝 Request/Response Format

### Success Response
```json
{
  "success": true,
  "data": {...},
  "message": "Success message"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "errors": [...] // Optional validation errors
}
```

### Pagination Response
```json
{
  "success": true,
  "count": 10,
  "total": 100,
  "pagination": {
    "currentPage": 1,
    "totalPages": 10,
    "hasNext": true,
    "hasPrev": false
  },
  "data": [...]
}
```

## 🔍 Query Parameters

### Filtering
- `search` - Text search across searchable fields
- `category` - Filter by category
- `status` - Filter by status (Active/Inactive)
- `role` - Filter by user role
- `isActive` - Filter by active status (true/false)

### Sorting
- `sort` - Sort by field (prefix with `-` for descending)
  - Examples: `sort=name`, `sort=-createdAt`

### Pagination
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)

## 🛡 Security Features

- **Rate Limiting**: 100 requests per 15 minutes per IP
- **CORS Protection**: Configured for frontend domain
- **Helmet**: Security headers
- **Input Validation**: Comprehensive validation on all inputs
- **Password Hashing**: bcrypt with configurable rounds
- **JWT Security**: Secure token generation and validation

## 🧪 Testing

Run tests with:
```bash
npm test
```

## 📊 Development Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues

## 📈 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | development |
| `PORT` | Server port | 5000 |
| `MONGODB_URI` | MongoDB connection string | mongodb://localhost:27017/ekuinox |
| `JWT_SECRET` | JWT signing secret | Required |
| `JWT_EXPIRE` | JWT expiration time | 30d |
| `FRONTEND_URL` | Frontend URL for CORS | http://localhost:3000 |
| `BCRYPT_ROUNDS` | Password hashing rounds | 12 |

## 🚀 Deployment

1. Set environment variables for production
2. Build and start the application:
   ```bash
   npm start
   ```

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📞 Support

For support and questions, please contact the development team.