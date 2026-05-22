# Eti Edu - Modern Learning Platform

A comprehensive educational portal offering multiple interactive learning paths, including AI navigation, interactive English story-telling, coding education, and an AI-powered teaching assistant.

## 📂 Project Structure

The repository is organized into a main portal and several distinct sub-applications:

- **Root Directory (`/`)**: Contains the main landing page (`index.html`, `style.css`, `script.js`) that serves as the entry point and portal for users to select their learning paths.
- **`server/`**: The backend services (Node.js/Express). It contains multiple micro-services:
  - `ai.js` (Port 3001): Handles AI chat proxying (Gemini, DeepSeek) and PDF parsing.
  - `auth.js` (Port 3004): Handles user authentication (registration, login) via JSON storage.
  - `coding.js` & `ai-course.js`: Additional backend handlers for specific learning paths.
- **`ai-teaching-assistant---香港老師高效教學助理/`**: A Vite + React + TypeScript frontend application designed for teachers to generate lesson plans and materials.
- **`english-of-might-and-magic/`**: A Vite + React + TypeScript frontend application offering an immersive, adventure-based interactive English learning experience.
- **`Educational-AI/`**: A Vanilla JS application focusing on AI prompt engineering and usage.
- **`Educational-Coding-Game-Website/`**: A Vanilla JS application featuring a coding editor for educational logic games.

## 🛠️ Prerequisites

- **Node.js** (v18+ recommended)
- **npm** or **yarn**
- API Keys for AI Services (Google Gemini / DeepSeek)

## 🚀 Setup & Installation

### 1. Backend Setup (`server/`)
1. Navigate to the server directory:
   ```bash
   cd server
   ```
2. Install dependencies (if a `package.json` is added, run `npm install`. Otherwise, manually install `express`, `cors`, `dotenv`, `openai`, `jsonwebtoken`, `express-session`, `pdf-parse`).
3. Create a `.env` file in the root or `server` directory with the following variables:
   ```env
   JWT_SECRET=your_super_secret_key
   GEMINI_API_KEY=your_google_gemini_api_key
   DEEPSEEK_API_KEY=your_deepseek_api_key
   AUTH_PORT=3004
   ```
4. Start the required backend services:
   ```bash
   node auth.js  # Starts Auth service on port 3004
   node ai.js    # Starts AI service on port 3001
   ```

### 2. Frontend Sub-Projects Setup
For the React/Vite-based projects (`ai-teaching-assistant---香港老師高效教學助理` and `english-of-might-and-magic`):
1. Navigate to the project directory:
   ```bash
   cd "ai-teaching-assistant---香港老師高效教學助理"
   # OR
   cd english-of-might-and-magic
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

### 3. Portal and Vanilla JS Apps
The main landing page, `Educational-AI`, and `Educational-Coding-Game-Website` consist of static files. 
You can serve them using any static file server (like VS Code Live Server or `npx serve` from the root directory):
```bash
npx serve .
```
Access the portal in your browser to navigate to the respective apps.

## 🔐 Authentication
The platform features an educator registration and login system. Test/demo mode is active with login limits per user. Ensure `users.json` or `users.txt` is writable by the Node.js process for user persistence.
