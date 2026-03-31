# Anonymous Tales (A.Tales)

A secure social networking platform that enables users to share their stories anonymously while maintaining gender-aware chat capabilities for better social interaction.

## 🚀 Features

### Core Features
- **Anonymous Story Sharing**: Share posts without revealing your identity
- **Gender-Aware Chat**: Know the gender context (♂ Male, ♀ Female, ○ Other, ? Prefer not to say) of anonymous users during conversations
- **Email Verification**: OTP-based secure registration
- **Real-time Chat**: Socket.io powered private messaging
- **Content Moderation**: Report system for inappropriate content
- **Role-based Access**: Admin and staff user roles for moderation

### Security Features
- ✅ **JWT Authentication** with environment-based secrets
- ✅ **Password Hashing** with bcrypt (salt rounds: 12)
- ✅ **Input Validation** using express-validator
- ✅ **Rate Limiting** on all authentication endpoints
- ✅ **Helmet.js Security Headers** (CSP, XSS protection, etc.)
- ✅ **CORS Configuration** for controlled cross-origin access
- ✅ **SQL Injection Prevention** through parameterized queries
- ✅ **XSS Protection** through input sanitization
- ✅ **Soft Delete** for data recovery

### UI/UX Improvements
- Button disabling during form submission
- Loading spinners and states
- Password strength indicator
- Real-time form validation
- Responsive design
- Alert notifications

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL 13+
- npm or yarn

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/anonymoustales.git
cd anonymoustales
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=your_db_username
DB_PASSWORD=your_db_password
DATABASE=anonymoustales_db

# JWT Configuration
JWT_SECRET=your_super_secret_key_here_min_32_chars
JWT_EXPIRES_IN=1h

# Email Configuration (Gmail SMTP)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=Anonymous Tales <your_email@gmail.com>

# Security Configuration
BCRYPT_SALT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**Important**: Generate a secure JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 4. Database Setup

Create the database:
```bash
npx sequelize-cli db:create
```

Run migrations:
```bash
npm run db:migrate
```

### 5. Start the Application

Development mode:
```bash
npm run devStart
```

Production mode:
```bash
npm start
```

The application will be available at `http://localhost:3000`

## 📁 Project Structure

```
anonymoustales/
├── config/                 # Configuration files
│   ├── config.js          # Database configuration
│   └── dbConf.js          # Sequelize instance
├── controllers/           # Route controllers
│   ├── userController.js  # User registration & management
│   ├── socketHandler.js   # Socket.io event handlers
│   └── ...
├── middleware/            # Express middleware
│   ├── authMiddleware.js  # JWT authentication
│   ├── validationMiddleware.js  # Input validation
│   ├── rateLimitMiddleware.js   # Rate limiting
│   └── errorMiddleware.js       # Error handling
├── models/                # Sequelize models
│   ├── userModel.js       # User with gender field
│   ├── otpModel.js        # OTP storage
│   ├── post.js            # User posts
│   └── ...
├── routes/                # Express routes
├── utils/                 # Utility functions
│   └── logger.js          # Winston logging
├── views/                 # Frontend HTML/CSS
│   ├── index.html         # Registration page
│   ├── login.html         # Login page
│   └── ...
├── __tests__/             # Jest test suite
│   ├── userController.test.js
│   ├── auth.test.js
│   └── validation.test.js
├── logs/                  # Application logs
├── .env                   # Environment variables
├── .env.example           # Environment template
├── package.json
└── server.js              # Application entry point
```

## 🔐 API Endpoints

### Authentication
| Method | Endpoint | Description | Rate Limit |
|--------|----------|-------------|------------|
| POST | `/login` | User login | 5/15min |

### Users
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/users` | Register new user (sends OTP) | No |
| POST | `/users/verify` | Verify OTP & create account | No |
| POST | `/users/resend-otp` | Resend OTP | No |
| GET | `/users` | List all users (paginated) | Yes |
| GET | `/users/:id` | Get user by ID | Yes |
| PUT | `/users/:id` | Update user | Yes |
| DELETE | `/users/:id` | Soft delete user | Yes |

### Posts
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/posts` | Create post | Yes |
| GET | `/posts` | List all posts (paginated) | No |
| GET | `/posts/:id` | Get post by ID | No |
| PUT | `/posts/:id` | Update post | Yes |
| DELETE | `/posts/:id` | Delete post | Yes |

## 🧪 Running Tests

Run all tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

Run tests with coverage:
```bash
npm test -- --coverage
```

## 🔒 Security Best Practices Implemented

### 1. Authentication & Authorization
- JWT tokens with secure, environment-based secrets
- Token expiration (1 hour default)
- Role-based access control (RBAC)

### 2. Password Security
- Bcrypt hashing with high cost factor (12 rounds)
- Strong password requirements enforced
- No plaintext password storage

### 3. Input Validation
- Express-validator for all inputs
- XSS attack prevention through sanitization
- SQL injection prevention via parameterized queries

### 4. Rate Limiting
- Authentication: 5 attempts per 15 minutes
- API endpoints: 200 requests per 15 minutes
- Post creation: 10 posts per hour
- Comments: 30 comments per hour

### 5. Security Headers (Helmet)
- Content Security Policy (CSP)
- X-Frame-Options (clickjacking protection)
- X-XSS-Protection
- Strict-Transport-Security

### 6. Email Security
- OTP-based verification
- Hashed OTP storage in database
- OTP expiry (10 minutes)
- Maximum 3 verification attempts

## 📝 Logging

Application logs are stored in the `logs/` directory:
- `combined.log` - All log levels
- `error.log` - Error level only
- `exceptions.log` - Uncaught exceptions
- `rejections.log` - Unhandled promise rejections

Log format includes:
- Timestamp
- Log level
- Message
- Request context (IP, user agent, path)
- Sanitized data (passwords/tokens redacted)

## 🐛 Bug Fixes Applied

### Critical Bugs Fixed
1. ✅ **Hardcoded JWT Secret** - Moved to environment variables
2. ✅ **Password Not Hashed on Update** - Fixed in userController
3. ✅ **In-Memory OTP Storage** - Migrated to database table
4. ✅ **OTP Verification Logic** - Now properly validates OTPs
5. ✅ **Database Force Sync** - Changed to `alter: true` to prevent data loss
6. ✅ **No Input Validation** - Added comprehensive validation middleware
7. ✅ **SQL Injection Risk** - Fixed via parameterized queries

### Major Bugs Fixed
8. ✅ **Missing Gender Field** - Added to User model for anonymous chat
9. ✅ **Duplicate Route Definitions** - Fixed in userRoute.js
10. ✅ **No Rate Limiting** - Added to all authentication endpoints
11. ✅ **No Sequelize Migrations** - Configured migration system
12. ✅ **No Security Headers** - Added Helmet.js
13. ✅ **No CORS Configuration** - Added proper CORS setup

### Minor Bugs Fixed
14. ✅ **Typo in index.html** - Fixed "nmone" to "none"
15. ✅ **No Button Disable on Submit** - Added to all forms
16. ✅ **No Loading States** - Added spinners and disabled states
17. ✅ **No Pagination** - Added to API responses
18. ✅ **Debug console.log** - Replaced with Winston logger

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 🙏 Acknowledgments

- Express.js team for the amazing framework
- Sequelize team for the ORM
- Socket.io team for real-time capabilities

## 📞 Support

For support, email support@anonymoustales.com or create an issue in the repository.

---

**Anonymous Tales** - Share your story. Stay anonymous. Connect with others.
