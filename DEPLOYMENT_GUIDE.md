# SpaceIntel - Deployment Guide for Friend's Laptop

This guide explains how to run SpaceIntel on another laptop using Docker, ensuring it runs identically to your system.

## Prerequisites

Your friend needs to install:

1. **Docker Desktop** (includes Docker and Docker Compose)
   - **Windows**: [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop)
   - **Mac**: [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop)
   - **Linux**: [Docker Engine](https://docs.docker.com/engine/install/) + [Docker Compose](https://docs.docker.com/compose/install/)

2. **Node.js** (for frontend development, optional if only running)
   - Download from [nodejs.org](https://nodejs.org/) (LTS version recommended)

## Step-by-Step Setup

### 1. **Clone or Copy the Project**

Send your friend the entire `Space_Intel` folder, or have them clone it:

```bash
# If using Git
git clone <repository-url> Space_Intel
cd Space_Intel
```

Or manually copy the folder to their laptop.

### 2. **Start All Services with Docker Compose**

```bash
# Navigate to the project root
cd Space_Intel

# Start all services (Postgres, Redis, Qdrant)
docker-compose up -d
```

This command:
- ✅ Starts PostgreSQL on port 5432
- ✅ Starts Redis on port 6379
- ✅ Starts Qdrant (vector database) on port 6333
- ✅ Creates persistent storage for Qdrant data

### 3. **Setup Backend**

```bash
# Navigate to backend
cd spaceintel-backend

# Create Python virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be available at: `http://localhost:8000`

### 4. **Setup Frontend**

In a new terminal:

```bash
# Navigate to frontend
cd spaceintel-frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

Frontend will be available at: `http://localhost:3000`

### 5. **Verify Everything is Running**

Check all services are healthy:

```bash
# View running containers
docker-compose ps

# Expected output:
# NAME       STATUS          PORTS
# postgres   Up 2 minutes    0.0.0.0:5432->5432/tcp
# redis      Up 2 minutes    0.0.0.0:6379->6379/tcp
# qdrant     Up 2 minutes    0.0.0.0:6333->6333/tcp
```

Visit these URLs:
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- Qdrant Dashboard: `http://localhost:6333/dashboard`

## Environment Configuration

The app uses these default credentials (from docker-compose.yml):

```
PostgreSQL:
  - Host: localhost
  - Port: 5432
  - User: spaceintel
  - Password: secret
  - Database: spaceintel_db

Redis:
  - Host: localhost
  - Port: 6379

Qdrant:
  - Host: localhost
  - Port: 6333
```

If your backend code references different credentials, update the backend `.env` file or environment variables.

## Common Issues & Fixes

### Issue: Port Already in Use
If ports 5432, 6379, or 6333 are already in use:

```bash
# Find what's using the port (replace 5432 with your port)
lsof -i :5432  # macOS/Linux
netstat -ano | findstr :5432  # Windows

# Either stop that process or modify docker-compose.yml ports:
# Change "5432:5432" to "5433:5432" for a different external port
```

### Issue: Docker Daemon Not Running
Make sure Docker Desktop is open and running:
- Windows/Mac: Open Docker Desktop app
- Linux: Ensure Docker service is started: `sudo systemctl start docker`

### Issue: Permission Denied (Linux)
Add your user to the docker group:

```bash
sudo usermod -aG docker $USER
# Then log out and back in
```

## Stopping and Cleaning Up

```bash
# Stop all containers (data is preserved)
docker-compose down

# Stop and remove all data (fresh start next time)
docker-compose down -v

# Remove unused Docker resources
docker system prune -a
```

## Connecting from Another Machine

If they want to access from a different machine on the network:

1. Find your friend's laptop IP address:
   - Windows: `ipconfig` → look for "IPv4 Address"
   - Mac/Linux: `ifconfig` → look for "inet"

2. Update connection strings from `localhost` to the IP address:
   - Frontend: `http://<LAPTOP_IP>:3000`
   - Backend: `http://<LAPTOP_IP>:8000`

## Production Deployment

For a production environment, consider:

1. Create `Dockerfile` for backend and frontend
2. Use environment variables instead of hardcoded credentials
3. Add `.env.example` file documenting all required variables
4. Update docker-compose.yml to build images instead of pulling pre-built ones
5. Add health checks to services
6. Use volumes for persistent data backup

## Troubleshooting Command Reference

```bash
# View logs for a service
docker-compose logs postgres
docker-compose logs redis
docker-compose logs qdrant

# View all logs with follow
docker-compose logs -f

# Restart a specific service
docker-compose restart postgres

# Execute command in container
docker-compose exec postgres psql -U spaceintel -d spaceintel_db
```

---

**Need help?** Share this guide with your friend and have them follow steps 1-5 in order.
