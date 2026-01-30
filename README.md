# 🏥 CareBot — AI-Powered Medical Assistant Platform

CareBot is a **full-stack AI healthcare assistant** designed to help patients manage health conversations, consult doctors, and book appointments — all in one secure platform.

Unlike generic chatbots, CareBot focuses on **medical safety, structured conversations, and patient experience**, making it suitable for real-world healthcare workflows.

---

## 🚀 Live Demo
- **Frontend (Vercel):** [https://carebot-ai.vercel.app](https://care-bot-ai-main.vercel.app/)  
- **Backend (Render):** https://carebot-ai-main-1.onrender.com  

---

## 🎯 Key Features

### 🤖 AI Medical Chatbot
- Powered by **OpenAI (GPT-4o-mini)**
- Provides **safe, non-diagnostic medical guidance**
- Enforces healthcare safety rules:
  - ❌ No diagnosis
  - ❌ No prescriptions
  - ✅ Always recommends licensed professionals

### 💬 Persistent Chat Conversations
- Messages stored securely in **MongoDB**
- Each message includes:
  - Role (`user / assistant`)
  - Timestamp
  - Session reference
- Designed for future **multi-topic chat sessions**

### 👨‍⚕️ Doctors Directory
- Browse doctors by:
  - Name
  - Specialty
  - Experience
  - Availability
- Responsive and user-friendly UI

### 📅 Appointment Management
- Book appointments with doctors
- View:
  - Upcoming appointments
  - Past appointments
- Cancel scheduled visits
- Real-time updates

### 🔐 Authentication & Security
- JWT-based authentication
- Secure REST APIs
- CORS-protected backend
- Environment-based secret management

---

## 🧠 System Architecture

Frontend (React + Vite)
|
| REST API (Axios)
|
Backend (Node.js + Express)
|
| MongoDB (Mongoose)
|
OpenAI API (GPT-4o-mini)


---

## 🛠️ Tech Stack

### Frontend
- React (Vite)
- Tailwind CSS
- Shadcn/UI
- Lucide Icons
- Axios
- React Router
- Date-Fns

### Backend
- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT Authentication
- dotenv
- CORS

### AI Integration
- OpenAI API
- Model: `gpt-4o-mini`
- Controlled system prompts for medical safety

### Deployment
- Frontend: Vercel
- Backend: Render
- Database: MongoDB Atlas

---

## 🔑 Environment Variables

### Backend (Render)
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
OPENAI_API_KEY=your_openai_api_key
JWT_SECRET=your_jwt_secret
