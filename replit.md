# Bomb Rolls and Bowls - Customer Feedback System

## Overview
A full-stack customer feedback management system for "Bomb Rolls and Bowls" cafe. Customers can submit feedback via QR code, and staff can analyze feedback through an admin dashboard.

## Features
- **Customer Feedback Form**: Star ratings for interior, food, service, staff, and hygiene (1-5 stars each)
- **Phone Validation**: Blocks duplicate submissions from same phone number on the same day
- **Thank You Page**: Confetti animation and cafe branding after submission
- **Admin Dashboard**: Analytics, charts, and feedback management
- **Real-time Updates**: Auto-refreshes feedback list every 15 seconds

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
