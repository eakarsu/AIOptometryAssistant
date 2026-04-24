import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import express from 'express';
import cors from 'cors';
import pool from './db.js';
import { authenticateToken } from './middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

// Create all database tables on startup
const createTables = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR UNIQUE,
        password VARCHAR,
        name VARCHAR,
        role VARCHAR DEFAULT 'doctor',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS patients (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR,
        last_name VARCHAR,
        date_of_birth DATE,
        email VARCHAR,
        phone VARCHAR,
        address TEXT,
        medical_history TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS retinal_scans (
        id SERIAL PRIMARY KEY,
        patient_id INT REFERENCES patients(id) ON DELETE CASCADE,
        scan_date DATE,
        eye VARCHAR,
        image_url TEXT,
        ai_analysis TEXT,
        findings TEXT,
        risk_level VARCHAR,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS prescriptions (
        id SERIAL PRIMARY KEY,
        patient_id INT REFERENCES patients(id) ON DELETE CASCADE,
        exam_date DATE,
        right_sphere DECIMAL,
        right_cylinder DECIMAL,
        right_axis INT,
        left_sphere DECIMAL,
        left_cylinder DECIMAL,
        left_axis INT,
        right_add DECIMAL,
        left_add DECIMAL,
        pd DECIMAL,
        notes TEXT,
        ai_trend_analysis TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS frames (
        id SERIAL PRIMARY KEY,
        brand VARCHAR,
        model VARCHAR,
        color VARCHAR,
        material VARCHAR,
        shape VARCHAR,
        size VARCHAR,
        price DECIMAL,
        image_url TEXT,
        suitable_face_shapes TEXT,
        gender VARCHAR,
        in_stock BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS insurance_records (
        id SERIAL PRIMARY KEY,
        patient_id INT REFERENCES patients(id) ON DELETE CASCADE,
        provider VARCHAR,
        policy_number VARCHAR,
        group_number VARCHAR,
        subscriber_name VARCHAR,
        coverage_type VARCHAR,
        effective_date DATE,
        expiration_date DATE,
        copay DECIMAL,
        deductible DECIMAL,
        verification_status VARCHAR DEFAULT 'pending',
        verification_result TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS inventory (
        id SERIAL PRIMARY KEY,
        item_name VARCHAR,
        category VARCHAR,
        brand VARCHAR,
        sku VARCHAR UNIQUE,
        quantity INT,
        reorder_level INT,
        unit_cost DECIMAL,
        retail_price DECIMAL,
        supplier VARCHAR,
        location VARCHAR,
        last_restocked DATE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS appointments (
        id SERIAL PRIMARY KEY,
        patient_id INT REFERENCES patients(id) ON DELETE CASCADE,
        doctor_name VARCHAR,
        appointment_date DATE,
        appointment_time VARCHAR,
        duration_minutes INT DEFAULT 30,
        appointment_type VARCHAR,
        status VARCHAR DEFAULT 'scheduled',
        room VARCHAR,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS billing (
        id SERIAL PRIMARY KEY,
        patient_id INT REFERENCES patients(id) ON DELETE CASCADE,
        invoice_number VARCHAR UNIQUE,
        invoice_date DATE,
        service_description TEXT,
        service_code VARCHAR,
        amount DECIMAL,
        insurance_covered DECIMAL DEFAULT 0,
        patient_responsibility DECIMAL,
        payment_status VARCHAR DEFAULT 'pending',
        payment_method VARCHAR,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS contact_lenses (
        id SERIAL PRIMARY KEY,
        patient_id INT REFERENCES patients(id) ON DELETE CASCADE,
        fitting_date DATE,
        lens_brand VARCHAR,
        lens_type VARCHAR,
        right_base_curve DECIMAL,
        right_diameter DECIMAL,
        right_power DECIMAL,
        right_cylinder DECIMAL,
        right_axis INT,
        left_base_curve DECIMAL,
        left_diameter DECIMAL,
        left_power DECIMAL,
        left_cylinder DECIMAL,
        left_axis INT,
        wear_schedule VARCHAR,
        replacement_schedule VARCHAR,
        solution_recommended VARCHAR,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS visual_acuity (
        id SERIAL PRIMARY KEY,
        patient_id INT REFERENCES patients(id) ON DELETE CASCADE,
        test_date DATE,
        right_uncorrected VARCHAR,
        right_corrected VARCHAR,
        left_uncorrected VARCHAR,
        left_corrected VARCHAR,
        both_uncorrected VARCHAR,
        both_corrected VARCHAR,
        test_type VARCHAR,
        test_distance VARCHAR,
        pinhole_right VARCHAR,
        pinhole_left VARCHAR,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS recalls (
        id SERIAL PRIMARY KEY,
        patient_id INT REFERENCES patients(id) ON DELETE CASCADE,
        recall_date DATE,
        recall_type VARCHAR,
        reason TEXT,
        status VARCHAR DEFAULT 'pending',
        contact_method VARCHAR,
        contacted_date DATE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('All database tables created successfully');
  } catch (err) {
    console.error('Error creating tables:', err.message);
  }
};

// Import routes
import authRoutes from './routes/auth.js';
import patientRoutes from './routes/patients.js';
import retinalScanRoutes from './routes/retinalScans.js';
import prescriptionRoutes from './routes/prescriptions.js';
import frameRoutes from './routes/frames.js';
import insuranceRoutes from './routes/insurance.js';
import inventoryRoutes from './routes/inventory.js';
import aiRoutes from './routes/ai.js';
import appointmentRoutes from './routes/appointments.js';
import billingRoutes from './routes/billing.js';
import contactLensRoutes from './routes/contactLenses.js';
import visualAcuityRoutes from './routes/visualAcuity.js';
import reportsRoutes from './routes/reports.js';
import recallsRoutes from './routes/recalls.js';

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/patients', authenticateToken, patientRoutes);
app.use('/api/retinal-scans', authenticateToken, retinalScanRoutes);
app.use('/api/prescriptions', authenticateToken, prescriptionRoutes);
app.use('/api/frames', authenticateToken, frameRoutes);
app.use('/api/insurance', authenticateToken, insuranceRoutes);
app.use('/api/inventory', authenticateToken, inventoryRoutes);
app.use('/api/ai', authenticateToken, aiRoutes);
app.use('/api/appointments', authenticateToken, appointmentRoutes);
app.use('/api/billing', authenticateToken, billingRoutes);
app.use('/api/contact-lenses', authenticateToken, contactLensRoutes);
app.use('/api/visual-acuity', authenticateToken, visualAcuityRoutes);
app.use('/api/reports', authenticateToken, reportsRoutes);
app.use('/api/recalls', authenticateToken, recallsRoutes);

const PORT = process.env.BACKEND_PORT || 4000;

createTables().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
