# SpaceIntel - Quick Start Reference

## 🚀 One-Time Setup (First Time Only)

### 1. Install Prerequisites
- **Docker Desktop**: https://www.docker.com/products/docker-desktop
- **Node.js**: https://nodejs.org/ (LTS recommended)
- **Python 3.9+**: https://www.python.org/

### 2. Clone/Copy Project
```bash
cd Space_Intel
```

### 3. Run Setup Script
**Windows:**
```bash
setup-windows.bat
```

**Mac/Linux:**
```bash
chmod +x setup-macos-linux.sh
./setup-macos-linux.sh
```

Or manually:
```bash
docker-compose up -d
```

---

## 🎯 Every Time You Want to Run the App

### Terminal 1: Start Docker Services
```bash
cd Space_Intel
docker-compose up -d
```

### Terminal 2: Start Backend
```bash
cd spaceintel-backend
python -m venv venv

# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Terminal 3: Start Frontend
```bash
cd spaceintel-frontend
npm install  # (only needed first time)
npm run dev
```

---

## 🌐 Access the App

| Service | URL | Purpose |
|---------|-----|---------|
| **Frontend** | http://localhost:3000 | Main app interface |
| **Backend API** | http://localhost:8000 | API endpoints |
| **API Docs** | http://localhost:8000/docs | Swagger documentation |
| **Qdrant** | http://localhost:6333/dashboard | Vector DB dashboard |

---

## 🛑 Stopping the App

### Stop Everything
```bash
# Stop but keep data
docker-compose down

# Stop and delete all data (fresh start)
docker-compose down -v
```

### Kill a Specific Terminal
Press `Ctrl+C` in each terminal

---

## 📋 Service Health Check

```bash
docker-compose ps
```

Expected output shows all services as "Up":
```
NAME       STATUS      PORTS
postgres   Up          0.0.0.0:5432->5432/tcp
redis      Up          0.0.0.0:6379->6379/tcp
qdrant     Up          0.0.0.0:6333->6333/tcp
```

---

## 🐛 Common Issues

| Problem | Solution |
|---------|----------|
| Docker not running | Open Docker Desktop |
| Port already in use | Change port in docker-compose.yml or kill the process |
| Backend can't connect to services | Wait 10 seconds for services to fully start |
| Frontend shows blank page | Check http://localhost:3000 is correct, refresh browser |
| Permission denied (Linux) | Run `sudo usermod -aG docker $USER` then log out/in |

---

## 📚 Detailed Documentation

See **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** for:
- Troubleshooting commands
- Environment configuration
- Production setup
- Advanced topics

---

## ⚡ TL;DR (Copy-Paste Commands)

```bash
# First time
cd Space_Intel
docker-compose up -d
cd spaceintel-backend && python -m venv venv && venv\Scripts\activate && pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# In new terminal
cd Space_Intel/spaceintel-frontend && npm install && npm run dev

# Open http://localhost:3000
```

---

**Questions?** Check DEPLOYMENT_GUIDE.md or share error messages with your friend.
