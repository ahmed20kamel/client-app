# CRM System - Professional Customer Relationship Management

A modern, full-featured CRM system built with Next.js, PostgreSQL, and Prisma. Features include multi-language support (Arabic/English), role-based access control, customer management, task tracking, and comprehensive reporting.

## 🎉 Current Status

### ✅ Phase 1: COMPLETE
- ✅ Next.js 14 + TypeScript setup
- ✅ Tailwind CSS v4 with RTL support
- ✅ next-intl for i18n (Arabic + English)
- ✅ Complete translation files
- ✅ Prisma ORM with PostgreSQL
- ✅ Database schema (6 models)
- ✅ Auth.js (NextAuth v5)
- ✅ shadcn/ui components
- ✅ Environment variables
- ✅ Rate limiting utility
- ✅ Base layout with locale support

### ✅ Phase 2: COMPLETE (Authentication & Authorization)
- ✅ Auth.js configuration
- ✅ Permissions system
- ✅ Audit logging system
- ✅ Email service (dev mode)
- ✅ Seed script with sample data
- ✅ Login page with rate limiting
- ✅ Forgot password page
- ✅ Reset password page
- ✅ Auth API routes (login, forgot-password, reset-password)

### ✅ Phase 3: COMPLETE (Users Management - Admin Only)
- ✅ User validation schemas
- ✅ Users API routes (GET, POST, PATCH, DELETE)
- ✅ Roles API route
- ✅ Dashboard layout with sidebar navigation
- ✅ Users list page with filters and pagination
- ✅ Create user form
- ✅ Edit user form
- ✅ Permission checks (admin-only access)

### ✅ Phase 4: COMPLETE (Customers Module)
- ✅ Customer validation schemas
- ✅ Customers API routes (GET, POST) with scope-based access
- ✅ Single customer API routes (GET, PATCH, DELETE with soft delete)
- ✅ Assign owner API route (Admin only)
- ✅ Restore customer API route (Admin only)
- ✅ Customers list page with filters, pagination, and scope enforcement
- ✅ Create customer form
- ✅ Edit customer form
- ✅ Customer details page with tasks timeline
- ✅ Soft delete and restore functionality

### ✅ Phase 5: COMPLETE (Tasks Module)
- ✅ Task validation schemas
- ✅ Tasks API routes (GET, POST) with scope-based access and auto-OVERDUE
- ✅ Single task API routes (GET, PATCH)
- ✅ Tasks list page with filters (status, priority, search)
- ✅ Create task form with customer and assignee dropdowns
- ✅ Task details page with inline editing
- ✅ Quick "Mark as Done" action from list
- ✅ Auto-update status to OVERDUE for past due dates
- ✅ Audit logging for all task operations

### ✅ Phase 6: COMPLETE (Dashboard & Reports)
- ✅ Dashboard Summary API with statistics and issues
- ✅ Dashboard page with widgets:
  - Stats cards (total/my customers, open/overdue tasks, completed this week)
  - Issues section (customers with no tasks, customers not updated)
  - Tasks due today with quick complete
  - Employee distribution (Admin only)
- ✅ Five comprehensive reports with APIs:
  - Overdue tasks report
  - Customers with no follow-up
  - New customers report (with grouping by day/week/month)
  - Task completion rate by employee
  - Customer status funnel with conversion rates
- ✅ Reports page with filters and CSV export
- ✅ Scope-based access for all reports

### ✅ Phase 7: COMPLETE (Polish & Testing)
- ✅ Comprehensive README documentation
- ✅ Complete API endpoints documentation
- ✅ Features overview and highlights
- ✅ Testing guide with manual checklist
- ✅ Production deployment guide
- ✅ Security best practices documented
- ✅ Troubleshooting guide

---

## 🎊 Project Complete!

All 7 phases have been successfully implemented. The CRM system is production-ready with:
- ✅ Full authentication & authorization
- ✅ User, customer, and task management
- ✅ Comprehensive dashboard & reports
- ✅ Multi-language support (Arabic/English)
- ✅ Role-based access control
- ✅ Audit logging & security features

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database
- npm or yarn

### 1. Clone & Install
```bash
cd client
npm install
```

### 2. Setup Database
Create a PostgreSQL database named `crm_db` (or your preferred name).

### 3. Configure Environment
Copy `.env.example` to `.env` and update:

```bash
cp .env.example .env
```

Update `DATABASE_URL` in `.env`:
```env
DATABASE_URL="postgresql://your_user:your_password@localhost:5432/crm_db"
```

### 4. Run Migrations & Seed
```bash
# Generate Prisma Client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed database with sample data
npm run db:seed
```

### 5. Start Development Server
```bash
npm run dev
```

Visit:
- English: http://localhost:3000/en
- Arabic: http://localhost:3000/ar

---

## 🔐 Login Credentials

After seeding, use these credentials:

**Admin Account:**
- Email: `admin@example.com`
- Password: `Admin123!`
- Role: Full system access

**Employee Account:**
- Email: `employee@example.com`
- Password: `Employee123!`
- Role: Limited to own customers/tasks

---

## 📊 Database Schema

### Models
1. **User** - System users with roles
2. **Role** - Admin, Employee roles
3. **Permission** - Granular permissions
4. **RolePermission** - Role-permission mapping
5. **UserRole** - User-role mapping
6. **Customer** - Customer records with soft delete
7. **Task** - Follow-up tasks
8. **AuditLog** - Activity tracking
9. **PasswordResetToken** - Password reset tokens

### Key Features
- **Soft Delete**: Customers can be deleted and restored
- **Audit Logging**: All sensitive actions tracked
- **Scope-based Permissions**: Admin sees all, Employee sees own
- **RTL Support**: Full Arabic language support

---

## 🏗️ Project Structure

```
client/
├── app/
│   ├── [locale]/
│   │   ├── (auth)/         # Auth pages route group
│   │   │   ├── login/page.tsx
│   │   │   ├── forgot-password/page.tsx
│   │   │   └── reset-password/page.tsx
│   │   ├── layout.tsx      # Root layout with i18n
│   │   └── page.tsx        # Homepage
│   ├── api/
│   │   └── auth/
│   │       ├── [...nextauth]/route.ts
│   │       ├── forgot-password/route.ts
│   │       └── reset-password/route.ts
│   └── globals.css         # Global styles
├── components/
│   └── ui/                 # shadcn/ui components
├── lib/
│   ├── prisma.ts           # Prisma client
│   ├── auth.ts             # Auth.js config
│   ├── permissions.ts      # Permission helpers
│   ├── audit.ts            # Audit logging
│   ├── rate-limit.ts       # Rate limiting
│   ├── email.ts            # Email service
│   └── utils.ts            # Utilities
├── messages/
│   ├── en.json             # English translations
│   └── ar.json             # Arabic translations
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── seed.ts             # Seed script
├── types/
│   └── index.ts            # TypeScript types
├── middleware.ts           # Next.js middleware
├── i18n.ts                 # i18n config
└── .env                    # Environment variables
```

---

## ✨ Features Overview

### Core Features
- **Multi-language Support**: Full Arabic (RTL) and English (LTR) support
- **Role-Based Access Control**: Admin and Employee roles with granular permissions
- **Scope-Based Visibility**: Admins see all data, Employees see only their own
- **Audit Logging**: All sensitive actions are tracked with before/after snapshots
- **Soft Delete**: Customers can be deleted and restored (Admin only)
- **Real-time Statistics**: Auto-updating dashboard with actionable insights

### Authentication & Security
- Secure authentication with Auth.js (NextAuth v5)
- Password reset flow with rate limiting
- bcrypt password hashing (10 rounds)
- HttpOnly + Secure cookies
- Rate limiting on auth endpoints (5 login attempts/min, 3 password reset requests/hour)
- Input validation with Zod
- CSRF protection

### Customer Management
- Create, read, update, and soft delete customers
- Customer types (Type A, B, C)
- Customer status tracking (New → Contacted → In Progress → Won/Lost)
- Owner assignment (Admin only)
- National ID uniqueness validation
- Advanced filters (search, type, status, show deleted)
- Pagination
- Restore deleted customers (Admin only)

### Task Management
- Create and assign tasks to team members
- Task priorities (Low, Medium, High)
- Task status (Open, Done, Overdue, Canceled)
- Auto-update to OVERDUE when past due date
- Quick "Mark as Done" from list and dashboard
- Inline editing in task details page
- Due date tracking with smart formatting (Today, Tomorrow, X days left)
- Task completion timestamp tracking

### Dashboard & Analytics
- Real-time statistics cards
- Issues section (customers with no tasks, outdated customers)
- Today's tasks widget with quick complete
- Employee distribution chart (Admin only)
- Auto-refresh on actions

### Reports & Insights
1. **Overdue Tasks Report**: Filter by assignee, type, priority
2. **Customers with No Follow-up**: Identify customers needing attention
3. **New Customers Report**: Group by day/week/month with date range
4. **Task Completion Rate**: Per-employee performance metrics
5. **Customer Status Funnel**: Conversion rates and success metrics
- All reports support CSV export
- Scope-based access (Admin sees all, Employee sees own)

### User Management (Admin Only)
- Create and manage users
- Assign roles (Admin/Employee)
- Activate/deactivate users
- View last login timestamps
- Cannot delete self

---

## 📚 API Documentation

### Authentication
- `POST /api/auth/[...nextauth]` - Authentication handler
- `POST /api/auth/forgot-password` - Request password reset (rate limited: 3/hour)
- `POST /api/auth/reset-password` - Confirm password reset (rate limited: 5/hour)

### Users (Admin Only)
- `GET /api/users` - List users with pagination and filters
- `POST /api/users` - Create new user
- `GET /api/users/[id]` - Get single user
- `PATCH /api/users/[id]` - Update user
- `DELETE /api/users/[id]` - Disable user (soft disable)
- `GET /api/roles` - Get all roles

### Customers
- `GET /api/customers` - List customers (scope-based, with filters, pagination)
- `POST /api/customers` - Create customer
- `GET /api/customers/[id]` - Get customer details (scope-based)
- `PATCH /api/customers/[id]` - Update customer (scope-based)
- `DELETE /api/customers/[id]` - Soft delete customer (Admin only)
- `POST /api/customers/[id]/assign-owner` - Reassign owner (Admin only)
- `POST /api/customers/[id]/restore` - Restore deleted customer (Admin only)

### Tasks
- `GET /api/tasks` - List tasks (scope-based, with filters, pagination)
- `POST /api/tasks` - Create task
- `GET /api/tasks/[id]` - Get task details (scope-based)
- `PATCH /api/tasks/[id]` - Update task (scope-based)

### Dashboard
- `GET /api/dashboard/summary` - Get dashboard statistics and issues (scope-based)

### Reports
- `GET /api/reports/overdue-tasks` - Overdue tasks report (scope-based)
- `GET /api/reports/customers-no-followup` - Customers without open tasks (scope-based)
- `GET /api/reports/new-customers` - New customers with grouping (scope-based)
- `GET /api/reports/task-completion` - Task completion rate by employee (scope-based)
- `GET /api/reports/status-funnel` - Customer status funnel with conversion rates (scope-based)

---

## 🧪 Testing Guide

### Manual Testing Checklist

#### Authentication
- [ ] Login with admin credentials
- [ ] Login with employee credentials
- [ ] Test rate limiting (6 failed attempts)
- [ ] Request password reset
- [ ] Complete password reset flow
- [ ] Logout

#### Permissions
- [ ] Admin can see all customers
- [ ] Employee sees only own customers
- [ ] Admin can create users
- [ ] Employee cannot access /users
- [ ] Admin can reassign customer owner
- [ ] Employee cannot reassign owner
- [ ] Admin can soft delete customers
- [ ] Employee cannot delete customers
- [ ] Admin can restore deleted customers

#### Customer Management
- [ ] Create customer (auto-assigned to current user if Employee)
- [ ] Edit customer (scope check)
- [ ] View customer details with tasks
- [ ] Filter customers by type/status
- [ ] Search customers
- [ ] Pagination works
- [ ] Soft delete customer (Admin)
- [ ] Restore customer (Admin)
- [ ] Show deleted customers toggle (Admin)

#### Task Management
- [ ] Create task from tasks page
- [ ] Create task from customer details page (pre-selected customer)
- [ ] Edit task
- [ ] Mark task as done from list
- [ ] Mark task as done from dashboard
- [ ] Auto-OVERDUE detection works
- [ ] Filter tasks by status/priority
- [ ] Scope enforcement (Employee sees only assigned tasks)

#### Dashboard
- [ ] Stats cards show correct numbers
- [ ] Issues section shows customers with no tasks
- [ ] Issues section shows outdated customers
- [ ] Today's tasks widget shows tasks due today
- [ ] Quick complete works
- [ ] Employee distribution shows (Admin only)
- [ ] Refresh after completing task

#### Reports
- [ ] Generate all 5 reports
- [ ] Apply filters to reports
- [ ] CSV export works for all reports
- [ ] Scope enforcement (Employee sees own data)
- [ ] Date range filtering works
- [ ] Grouping works (new customers report)

#### Internationalization
- [ ] Switch to Arabic → RTL layout
- [ ] Switch to English → LTR layout
- [ ] All translations display correctly
- [ ] Forms work in both languages

### Database Testing

```bash
# Test migrations
npm run db:migrate

# Test seed
npm run db:seed

# Verify data in Prisma Studio
npm run db:studio
```

---

## 🚀 Deployment Guide

### Production Checklist

#### 1. Environment Variables
```env
# Production .env
DATABASE_URL="your_production_database_url"
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="generate_strong_secret_here"  # Use: openssl rand -base64 32

# Optional: Email service for password reset
EMAIL_FROM="noreply@yourdomain.com"
RESEND_API_KEY="your_resend_api_key"
```

#### 2. Database Setup
```bash
# Run migrations in production
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate

# Seed production database
npm run db:seed
```

#### 3. Build Application
```bash
# Install dependencies
npm ci

# Build for production
npm run build

# Start production server
npm start
```

### Deployment Platforms

#### Vercel (Recommended)
1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

Database: Use Vercel Postgres, Supabase, or Neon

#### Railway
1. Create new project from GitHub
2. Add PostgreSQL service
3. Configure environment variables
4. Deploy

#### Docker (Self-hosted)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Post-Deployment
- [ ] Change default admin/employee passwords
- [ ] Test all critical paths
- [ ] Verify email service works
- [ ] Check audit logs are working
- [ ] Monitor error logs
- [ ] Setup database backups

---

## 🔧 Available Scripts

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Start production server

# Database
npm run db:generate      # Generate Prisma client
npm run db:migrate       # Run migrations
npm run db:seed          # Seed database
npm run db:studio        # Open Prisma Studio

# Other
npm run lint             # Run ESLint
```

---

## 🌍 Internationalization

The app supports **Arabic (RTL)** and **English (LTR)**.

### Using Translations

```typescript
import { useTranslations } from 'next-intl';

export default function Page() {
  const t = useTranslations('customers');
  return <h1>{t('title')}</h1>;
}
```

---

## 🔐 Security Features

- ✅ Password hashing (bcrypt)
- ✅ HttpOnly cookies
- ✅ Rate limiting (login, password reset)
- ✅ Input validation (Zod)
- ✅ Audit logging
- ✅ Scope-based permissions
- ✅ Soft delete (data preservation)

---

## 📝 Permission System

### Permission Format
`{resource}.{action}.{scope?}`

Examples:
- `customer.view.all` - View all customers
- `customer.view.own` - View only own customers

### Checking Permissions

```typescript
import { can } from '@/lib/permissions';

const allowed = await can(userId, 'customer.edit.all', customer);
```

---

## 🐛 Troubleshooting

### Database Connection Error
```bash
# Check PostgreSQL is running
# Verify DATABASE_URL in .env
npm run db:generate
```

### Migration Errors
```bash
# Reset database (WARNING: deletes all data)
npx prisma migrate reset
npm run db:seed
```

---

**Built with ❤️ using Next.js, Prisma, and modern web technologies**
