# 🍽️ BitePick

A modern restaurant decision web app that helps individuals --- and soon
groups --- quickly decide where to eat.

Built to solve the classic problem:

> "I don't know... what do you want to eat?"

------------------------------------------------------------------------

## 🚀 Live Demo

🌐 Production: https://bitepick.vercel.app\
🛠 Backend: Render (Node + Express API)

------------------------------------------------------------------------

## 🧠 Why I Built This

This project started as a way to: - Practice full-stack development -
Implement real authentication & authorization - Design clean UI/UX
flows - Deploy a production-ready application - Prepare for DevOps &
backend-focused roles

It evolved into a scalable restaurant decision platform with filtering,
authentication, and future group features.

------------------------------------------------------------------------

## ✨ Features (v1 -- Single User Mode)

### 🎲 Random Restaurant Generator

-   Generates a random restaurant from database
-   Fully filterable before randomizing

### 🔍 Smart Filtering

-   Multi-select category filter
-   Multi-select location filter
-   Price filtering
-   Frontend filtering + backend data retrieval

### 🔐 Authentication (Custom JWT)

-   Register / Login
-   Token-based auth stored in localStorage
-   Protected routes
-   Authorization middleware on backend

### 🛠 Restaurant Management (Authenticated Users)

-   Add restaurants
-   Edit restaurants
-   Delete restaurants
-   Duplicate prevention
-   Proper error handling (409, 403, 404)

------------------------------------------------------------------------

## 🏗️ Tech Stack

### Frontend

-   ⚛️ React (Vite)
-   🧭 React Router
-   🎨 Tailwind CSS
-   🔥 Custom dropdown multi-select components

### Backend

-   🟢 Node.js
-   🚂 Express
-   🔐 JWT Authentication
-   🗂 REST API Architecture

### Database

-   🗃 Initially: lowdb (local JSON for development visibility)
-   ☁️ Now: Supabase Postgres
-   🔒 RLS (Row Level Security)

### Deployment

-   ▲ Vercel (Frontend)
-   🚀 Render (Backend)
-   🌍 Environment-based configuration

------------------------------------------------------------------------

## 🛣️ Roadmap

### 👥 Group Session Mode (In Progress)

-   Create shareable group sessions
-   Voting / veto system
-   Weighted selection logic
-   Hidden pool auto-fill system

### 🤖 Future Enhancements

-   Monthly restaurant data validation
-   AI-assisted metadata cleanup
-   Ranking algorithm improvements
-   Analytics dashboard
-   Restaurant suggestions based on usage history

------------------------------------------------------------------------

## 🎯 Goals of This Project

This project demonstrates:

-   Full-stack architecture
-   REST API design
-   Authentication & authorization
-   Database modeling
-   Deployment pipelines
-   Real-world debugging
-   Product iteration thinking

------------------------------------------------------------------------

## 👨🏻‍💻 Author

Peter Lin\
Full-Stack Developer\
AWS Certified\

------------------------------------------------------------------------

## ⭐ If You Like It

Feel free to star the repo or fork it.

And next time someone asks:

> "Where should we eat?"

You'll have the answer. 🍜🔥
