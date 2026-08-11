# Aqua Lens — Codebase Intelligence & Dependency Graph Platform

Aqua Lens provides deep codebase intelligence, dependency graph extraction, blast-radius analysis, and structural refactoring plans for software architectures.

---

## 1. Run Frontend Locally

**Prerequisites:** Node.js (v18+)

1. Install frontend dependencies:
   ```bash
   npm install
   ```
2. Run the frontend application:
   ```bash
   npm run dev
   ```
   Frontend will start at `http://localhost:3000`.

---

## 2. Run Backend Locally

The backend engine handles public GitHub repository shallow cloning, safe file scanning, language metrics calculation, and dependency graph extraction.

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install backend dependencies:
   ```bash
   npm install
   ```
3. (Optional) Configure environment variables:
   ```bash
   cp .env.example .env
   ```
4. Start backend development server:
   ```bash
   npm run dev
   ```
   Backend API will run at `http://localhost:5000`.

### Backend API Endpoints

- **Health Check**: `GET http://localhost:5000/api/health`
- **Analyze Repository**: `POST http://localhost:5000/api/analyze`
  ```json
  {
    "repositoryUrl": "https://github.com/facebook/react"
  }
  ```

