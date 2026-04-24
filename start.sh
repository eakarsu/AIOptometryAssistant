#!/bin/bash

# ============================================================
#  AI Optometry Assistant - Start Script
#  Starts PostgreSQL, seeds data, launches backend & frontend
# ============================================================

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     AI Optometry Assistant - Startup         ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════╝${NC}"
echo ""

# ---- Load .env ----
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
  echo -e "${GREEN}✓ Loaded .env configuration${NC}"
else
  echo -e "${RED}✗ .env file not found! Please create one from .env example.${NC}"
  exit 1
fi

BACKEND_PORT=${BACKEND_PORT:-4000}
FRONTEND_PORT=${FRONTEND_PORT:-3000}

# ---- Kill processes on used ports ----
echo -e "${YELLOW}→ Cleaning up ports ${BACKEND_PORT} and ${FRONTEND_PORT}...${NC}"

kill_port() {
  local port=$1
  local pids=$(lsof -ti :$port 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo -e "${YELLOW}  Killing processes on port $port: $pids${NC}"
    echo "$pids" | xargs kill -9 2>/dev/null || true
    sleep 1
  fi
}

kill_port $BACKEND_PORT
kill_port $FRONTEND_PORT

echo -e "${GREEN}✓ Ports cleared${NC}"

# ---- Check PostgreSQL ----
echo -e "${YELLOW}→ Checking PostgreSQL...${NC}"

if command -v pg_isready &> /dev/null; then
  if ! pg_isready -q 2>/dev/null; then
    echo -e "${YELLOW}  Starting PostgreSQL...${NC}"
    if command -v brew &> /dev/null; then
      brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null || true
    fi
    sleep 2
  fi
  echo -e "${GREEN}✓ PostgreSQL is running${NC}"
else
  echo -e "${YELLOW}  pg_isready not found - assuming PostgreSQL is running${NC}"
fi

# ---- Create database and user if needed ----
echo -e "${YELLOW}→ Setting up database...${NC}"

# Extract DB details from DATABASE_URL
DB_NAME=$(echo $DATABASE_URL | sed -n 's|.*\/\([^?]*\).*|\1|p')
DB_USER=$(echo $DATABASE_URL | sed -n 's|.*://\([^:]*\):.*|\1|p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')

# Create user and database (ignore errors if they already exist)
psql -U postgres -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';" 2>/dev/null || true
psql -U postgres -c "ALTER USER ${DB_USER} CREATEDB;" 2>/dev/null || true
psql -U postgres -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};" 2>/dev/null || true
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};" 2>/dev/null || true

echo -e "${GREEN}✓ Database '${DB_NAME}' ready${NC}"

# ---- Install dependencies ----
echo -e "${YELLOW}→ Installing backend dependencies...${NC}"
cd "$PROJECT_DIR/backend"
npm install --silent 2>&1 | tail -1
echo -e "${GREEN}✓ Backend dependencies installed${NC}"

echo -e "${YELLOW}→ Installing frontend dependencies...${NC}"
cd "$PROJECT_DIR/frontend"
npm install --silent 2>&1 | tail -1
echo -e "${GREEN}✓ Frontend dependencies installed${NC}"

cd "$PROJECT_DIR"

# ---- Create tables (server does this on startup, but we also need them for seeding) ----
echo -e "${YELLOW}→ Creating database tables...${NC}"
cd "$PROJECT_DIR/backend"
node -e "
import pool from './src/db.js';
const q = \`
CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, email VARCHAR UNIQUE, password VARCHAR, name VARCHAR, role VARCHAR DEFAULT 'doctor', created_at TIMESTAMP DEFAULT NOW());
CREATE TABLE IF NOT EXISTS patients (id SERIAL PRIMARY KEY, first_name VARCHAR, last_name VARCHAR, date_of_birth DATE, email VARCHAR, phone VARCHAR, address TEXT, medical_history TEXT, created_at TIMESTAMP DEFAULT NOW());
CREATE TABLE IF NOT EXISTS retinal_scans (id SERIAL PRIMARY KEY, patient_id INT REFERENCES patients(id) ON DELETE CASCADE, scan_date DATE, eye VARCHAR, image_url TEXT, ai_analysis TEXT, findings TEXT, risk_level VARCHAR, notes TEXT, created_at TIMESTAMP DEFAULT NOW());
CREATE TABLE IF NOT EXISTS prescriptions (id SERIAL PRIMARY KEY, patient_id INT REFERENCES patients(id) ON DELETE CASCADE, exam_date DATE, right_sphere DECIMAL, right_cylinder DECIMAL, right_axis INT, left_sphere DECIMAL, left_cylinder DECIMAL, left_axis INT, right_add DECIMAL, left_add DECIMAL, pd DECIMAL, notes TEXT, ai_trend_analysis TEXT, created_at TIMESTAMP DEFAULT NOW());
CREATE TABLE IF NOT EXISTS frames (id SERIAL PRIMARY KEY, brand VARCHAR, model VARCHAR, color VARCHAR, material VARCHAR, shape VARCHAR, size VARCHAR, price DECIMAL, image_url TEXT, suitable_face_shapes TEXT, gender VARCHAR, in_stock BOOLEAN DEFAULT true, created_at TIMESTAMP DEFAULT NOW());
CREATE TABLE IF NOT EXISTS insurance_records (id SERIAL PRIMARY KEY, patient_id INT REFERENCES patients(id) ON DELETE CASCADE, provider VARCHAR, policy_number VARCHAR, group_number VARCHAR, subscriber_name VARCHAR, coverage_type VARCHAR, effective_date DATE, expiration_date DATE, copay DECIMAL, deductible DECIMAL, verification_status VARCHAR DEFAULT 'pending', verification_result TEXT, created_at TIMESTAMP DEFAULT NOW());
CREATE TABLE IF NOT EXISTS inventory (id SERIAL PRIMARY KEY, item_name VARCHAR, category VARCHAR, brand VARCHAR, sku VARCHAR UNIQUE, quantity INT, reorder_level INT, unit_cost DECIMAL, retail_price DECIMAL, supplier VARCHAR, location VARCHAR, last_restocked DATE, created_at TIMESTAMP DEFAULT NOW());
CREATE TABLE IF NOT EXISTS appointments (id SERIAL PRIMARY KEY, patient_id INT REFERENCES patients(id) ON DELETE CASCADE, doctor_name VARCHAR, appointment_date DATE, appointment_time VARCHAR, duration_minutes INT DEFAULT 30, appointment_type VARCHAR, status VARCHAR DEFAULT 'scheduled', room VARCHAR, notes TEXT, created_at TIMESTAMP DEFAULT NOW());
CREATE TABLE IF NOT EXISTS billing (id SERIAL PRIMARY KEY, patient_id INT REFERENCES patients(id) ON DELETE CASCADE, invoice_number VARCHAR UNIQUE, invoice_date DATE, service_description TEXT, service_code VARCHAR, amount DECIMAL, insurance_covered DECIMAL DEFAULT 0, patient_responsibility DECIMAL, payment_status VARCHAR DEFAULT 'pending', payment_method VARCHAR, notes TEXT, created_at TIMESTAMP DEFAULT NOW());
CREATE TABLE IF NOT EXISTS contact_lenses (id SERIAL PRIMARY KEY, patient_id INT REFERENCES patients(id) ON DELETE CASCADE, fitting_date DATE, lens_brand VARCHAR, lens_type VARCHAR, right_base_curve DECIMAL, right_diameter DECIMAL, right_power DECIMAL, right_cylinder DECIMAL, right_axis INT, left_base_curve DECIMAL, left_diameter DECIMAL, left_power DECIMAL, left_cylinder DECIMAL, left_axis INT, wear_schedule VARCHAR, replacement_schedule VARCHAR, solution_recommended VARCHAR, notes TEXT, created_at TIMESTAMP DEFAULT NOW());
CREATE TABLE IF NOT EXISTS visual_acuity (id SERIAL PRIMARY KEY, patient_id INT REFERENCES patients(id) ON DELETE CASCADE, test_date DATE, right_uncorrected VARCHAR, right_corrected VARCHAR, left_uncorrected VARCHAR, left_corrected VARCHAR, both_uncorrected VARCHAR, both_corrected VARCHAR, test_type VARCHAR, test_distance VARCHAR, pinhole_right VARCHAR, pinhole_left VARCHAR, notes TEXT, created_at TIMESTAMP DEFAULT NOW());
\`;
pool.query(q).then(() => { console.log('Tables created'); process.exit(0); }).catch(e => { console.error(e.message); process.exit(1); });
" 2>&1
echo -e "${GREEN}✓ Tables created${NC}"

# ---- Seed data ----
echo -e "${YELLOW}→ Seeding database with sample data...${NC}"
cd "$PROJECT_DIR/backend"
node src/seed.js
echo -e "${GREEN}✓ Database seeded successfully${NC}"

# ---- Start backend with hot reload ----
echo -e "${BLUE}→ Starting backend on port ${BACKEND_PORT}...${NC}"
cd "$PROJECT_DIR/backend"
npx nodemon src/server.js &
BACKEND_PID=$!
echo -e "${GREEN}✓ Backend started (PID: ${BACKEND_PID})${NC}"

# Wait for backend to be ready
sleep 2

# ---- Start frontend with hot reload ----
echo -e "${BLUE}→ Starting frontend on port ${FRONTEND_PORT}...${NC}"
cd "$PROJECT_DIR/frontend"
npx vite --port $FRONTEND_PORT &
FRONTEND_PID=$!
echo -e "${GREEN}✓ Frontend started (PID: ${FRONTEND_PID})${NC}"

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  Application is running!                     ║${NC}"
echo -e "${CYAN}║                                              ║${NC}"
echo -e "${CYAN}║  Frontend: http://localhost:${FRONTEND_PORT}              ║${NC}"
echo -e "${CYAN}║  Backend:  http://localhost:${BACKEND_PORT}              ║${NC}"
echo -e "${CYAN}║                                              ║${NC}"
echo -e "${CYAN}║  Login: sarah@optometry.com / password123    ║${NC}"
echo -e "${CYAN}║                                              ║${NC}"
echo -e "${CYAN}║  Press Ctrl+C to stop all services           ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════╝${NC}"
echo ""

# ---- Handle shutdown ----
cleanup() {
  echo ""
  echo -e "${YELLOW}→ Shutting down...${NC}"
  kill $BACKEND_PID 2>/dev/null || true
  kill $FRONTEND_PID 2>/dev/null || true
  kill_port $BACKEND_PORT
  kill_port $FRONTEND_PORT
  echo -e "${GREEN}✓ All services stopped${NC}"
  exit 0
}

trap cleanup SIGINT SIGTERM

# Wait for child processes
wait
