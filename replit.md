# Bomb Rolls and Bowls - Customer Feedback System

## Overview
A full-stack customer feedback management system for "Bomb Rolls and Bowls" cafe. Customers can submit feedback via QR code, and staff can analyze feedback through an admin dashboard.

## Features
- **Customer Feedback Form**: Star ratings for interior, food, service, staff, and hygiene (1-5 stars each)
- **Phone Validation**: Blocks duplicate submissions from same phone number on the same day
- **Thank You Page**: Confetti animation and cafe branding after submission
- **Admin Dashboard**: Analytics, charts, and feedback management
- **Real-time Updates**: Auto-refreshes feedback list every 15 seconds
- **Detailed Feedback View**: View Details button opens modal with full feedback breakdown
- **Category Rating Highlights**: Low ratings (1-2 stars) are highlighted in red for quick issue identification
- **Repeat Customer Tracking**: View all past feedback from the same customer with normalized name matching
- **Customer Name Normalization**: Case-insensitive customer matching (Rahul, RAHUL, rahul treated as same customer)

## Tech Stack
- **Frontend**: React + Vite + TailwindCSS + Shadcn UI + Framer Motion + Recharts
- **Backend**: Express.js + Mongoose (MongoDB)
- **Database**: MongoDB (user-provided via MONGODB_URI secret)

## Routes
- `/` - Customer feedback form
- `/thank-you` - Success page after feedback submission
- `/login` - Admin login page
- `/admin` - Admin dashboard with analytics and feedback management

## API Endpoints
- `POST /api/feedback` - Submit new feedback
- `POST /api/feedback/validate-phone` - Check if phone can submit today
- `GET /api/feedback` - List all feedback (admin only)
- `GET /api/feedback/:id` - Get single feedback
- `PATCH /api/feedback/:id/contact` - Mark feedback as contacted
- `GET /api/feedback/customer-history/:normalizedName` - Get customer's feedback history
- `GET /api/analytics` - Get analytics data (week/lastWeek/month)
- `POST /api/auth/login` - Admin login
- `POST /api/auth/logout` - Admin logout
- `GET /api/auth/check` - Check authentication status

## Default Admin Credentials
- Username: `admin`
- Password: `bomb123`

## Environment Variables
- `MONGODB_URI` - MongoDB connection string (required)
- `SESSION_SECRET` - Session encryption key (optional, has default)

## Color Theme
Premium cafe aesthetic with soft browns (#8B4513), creams (#F5F5DC), and greens (#228B22)

## Build Configuration
- Uses **Tailwind CSS v4** via `@tailwindcss/vite` Vite plugin (not PostCSS)
- `postcss.config.js` only includes `autoprefixer` (Tailwind is handled by Vite)
- CSS uses v4 syntax: `@import "tailwindcss"`, `@theme`, `@plugin` directives

## Floating Date Picker
- **Component**: `client/src/components/FloatingDatePicker.tsx`
- Clean floating calendar dropdown with dark red (#8B0000) color palette
- Features:
  - Month/Year header with left/right navigation arrows
  - Days of week row (Su, Mo, Tu, We, Th, Fr, Sa)
  - Date grid with proper spacing
  - Clear and Today buttons at bottom
  - Closes when clicking outside
  - Selected date highlighted in dark red with white text
  - Today's date has dark red outline/border
  - Hover effect with light pink (#fef2f2) background
  - Date input button has dark red border
  - Used in both AdminDashboard and AdminPanelMobile for date filtering
