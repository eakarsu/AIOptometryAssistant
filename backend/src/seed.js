import pool from './db.js';
import bcrypt from 'bcryptjs';

const seed = async () => {
  console.log('Seeding database...');

  // Clear existing data in reverse dependency order
  await pool.query('DELETE FROM recalls');
  await pool.query('DELETE FROM visual_acuity');
  await pool.query('DELETE FROM contact_lenses');
  await pool.query('DELETE FROM billing');
  await pool.query('DELETE FROM appointments');
  await pool.query('DELETE FROM inventory');
  await pool.query('DELETE FROM insurance_records');
  await pool.query('DELETE FROM frames');
  await pool.query('DELETE FROM prescriptions');
  await pool.query('DELETE FROM retinal_scans');
  await pool.query('DELETE FROM patients');
  await pool.query('DELETE FROM users');

  // Reset sequences
  await pool.query('ALTER SEQUENCE recalls_id_seq RESTART WITH 1');
  await pool.query('ALTER SEQUENCE visual_acuity_id_seq RESTART WITH 1');
  await pool.query('ALTER SEQUENCE contact_lenses_id_seq RESTART WITH 1');
  await pool.query('ALTER SEQUENCE billing_id_seq RESTART WITH 1');
  await pool.query('ALTER SEQUENCE appointments_id_seq RESTART WITH 1');
  await pool.query('ALTER SEQUENCE inventory_id_seq RESTART WITH 1');
  await pool.query('ALTER SEQUENCE insurance_records_id_seq RESTART WITH 1');
  await pool.query('ALTER SEQUENCE frames_id_seq RESTART WITH 1');
  await pool.query('ALTER SEQUENCE prescriptions_id_seq RESTART WITH 1');
  await pool.query('ALTER SEQUENCE retinal_scans_id_seq RESTART WITH 1');
  await pool.query('ALTER SEQUENCE patients_id_seq RESTART WITH 1');
  await pool.query('ALTER SEQUENCE users_id_seq RESTART WITH 1');

  console.log('Cleared existing data and reset sequences.');

  // --- Users ---
  const hashedPassword = await bcrypt.hash('password123', 10);

  await pool.query(`
    INSERT INTO users (email, password, name, role) VALUES
    ('sarah@optometry.com', $1, 'Dr. Sarah Chen', 'doctor'),
    ('admin@optometry.com', $1, 'Admin User', 'admin')
  `, [hashedPassword]);

  console.log('Seeded users.');

  // --- Patients ---
  await pool.query(`
    INSERT INTO patients (first_name, last_name, date_of_birth, email, phone, address, medical_history) VALUES
    ('James', 'Wilson', '1958-03-14', 'james.wilson@email.com', '(555) 234-5678', '142 Oak Street, Springfield, IL 62701', 'Type 2 diabetes diagnosed 2015. Hypertension controlled with medication. Family history of glaucoma.'),
    ('Maria', 'Garcia', '1975-07-22', 'maria.garcia@email.com', '(555) 345-6789', '88 Elm Avenue, Austin, TX 73301', 'Mild myopia since childhood. No systemic conditions. Seasonal allergies.'),
    ('Robert', 'Thompson', '1962-11-05', 'robert.t@email.com', '(555) 456-7890', '310 Maple Drive, Denver, CO 80201', 'Hypertension. High cholesterol. Father had macular degeneration. Former smoker.'),
    ('Linda', 'Nguyen', '1980-01-30', 'linda.nguyen@email.com', '(555) 567-8901', '27 Pine Lane, Seattle, WA 98101', 'No significant medical history. Contact lens wearer for 15 years. Dry eye symptoms.'),
    ('Michael', 'Okafor', '1945-09-18', 'michael.okafor@email.com', '(555) 678-9012', '55 Birch Road, Atlanta, GA 30301', 'Type 2 diabetes since 2005. Cataracts developing. Family history of glaucoma. Hypertension.'),
    ('Susan', 'Park', '1990-04-12', 'susan.park@email.com', '(555) 789-0123', '402 Cedar Court, San Francisco, CA 94101', 'High myopia (-7.50). Lattice degeneration noted. No systemic conditions.'),
    ('David', 'Martinez', '1968-12-01', 'david.m@email.com', '(555) 890-1234', '73 Walnut Street, Phoenix, AZ 85001', 'Controlled hypertension. Elevated intraocular pressure noted at last visit. Sleep apnea.'),
    ('Patricia', 'Brown', '1955-06-25', 'patricia.brown@email.com', '(555) 901-2345', '189 Spruce Avenue, Portland, OR 97201', 'Age-related macular degeneration diagnosed 2023. Takes AREDS2 supplements. Osteoarthritis.'),
    ('Anthony', 'Lee', '1983-08-09', 'anthony.lee@email.com', '(555) 012-3456', '61 Redwood Place, Chicago, IL 60601', 'No significant ocular history. Mild astigmatism. Computer vision syndrome symptoms.'),
    ('Jennifer', 'Patel', '1972-02-17', 'jennifer.patel@email.com', '(555) 123-4567', '234 Magnolia Boulevard, Houston, TX 77001', 'Type 1 diabetes since age 12. Mild nonproliferative diabetic retinopathy. Thyroid disorder.'),
    ('Charles', 'Robinson', '1950-10-28', 'charles.r@email.com', '(555) 234-5679', '98 Hickory Lane, Miami, FL 33101', 'Glaucoma diagnosed 2020 - on Latanoprost drops. Cataract surgery right eye 2023. Atrial fibrillation.'),
    ('Emily', 'Kim', '1995-05-03', 'emily.kim@email.com', '(555) 345-6780', '512 Aspen Way, Boston, MA 02101', 'No medical conditions. Wears daily disposable contacts. Occasional headaches with prolonged screen use.'),
    ('William', 'Davis', '1960-07-14', 'william.davis@email.com', '(555) 456-7891', '77 Sycamore Drive, Nashville, TN 37201', 'Hypertensive retinopathy grade 1. Controlled diabetes. Previous retinal laser treatment left eye 2022.'),
    ('Angela', 'Hernandez', '1988-09-21', 'angela.h@email.com', '(555) 567-8902', '330 Poplar Street, Minneapolis, MN 55401', 'Keratoconus right eye. Fitted with scleral contact lens. No systemic conditions.'),
    ('Thomas', 'Wright', '1942-04-06', 'thomas.wright@email.com', '(555) 678-9013', '15 Chestnut Circle, Philadelphia, PA 19101', 'Advanced cataracts both eyes. Macular pucker left eye. Diabetes type 2. History of retinal detachment repair right eye 2019.')
  `);

  console.log('Seeded patients.');

  // --- Retinal Scans ---
  await pool.query(`
    INSERT INTO retinal_scans (patient_id, scan_date, eye, image_url, ai_analysis, findings, risk_level, notes) VALUES
    (1, '2025-01-15', 'both', '/scans/scan_001.jpg', 'Microaneurysms detected in temporal region. Cotton wool spots absent. No neovascularization.', 'Mild nonproliferative diabetic retinopathy', 'moderate', 'Patient reports stable vision. Recommend follow-up in 6 months.'),
    (2, '2025-02-20', 'both', '/scans/scan_002.jpg', 'No abnormalities detected. Optic disc margins sharp and well-defined. Macula normal.', 'Normal healthy retina', 'low', 'Routine exam. All findings within normal limits.'),
    (3, '2024-11-10', 'right', '/scans/scan_003.jpg', 'Drusen deposits noted in macular region. RPE changes minimal. No geographic atrophy.', 'Early age-related macular degeneration', 'moderate', 'Recommend AREDS2 supplementation and follow-up in 4 months.'),
    (4, '2025-03-05', 'left', '/scans/scan_004.jpg', 'No retinal pathology. Mild tear film irregularity noted during imaging.', 'Normal healthy retina', 'low', 'Dry eye affecting scan quality slightly. Otherwise normal.'),
    (5, '2024-09-22', 'both', '/scans/scan_005.jpg', 'Cup-to-disc ratio 0.7 OD, 0.65 OS. Nerve fiber layer thinning superiorly OD. Microaneurysms scattered both eyes.', 'Glaucoma suspect with mild diabetic retinopathy', 'high', 'IOP elevated at 24 mmHg OD. Refer for visual field testing. Monitor diabetic changes.'),
    (6, '2025-01-28', 'both', '/scans/scan_006.jpg', 'Lattice degeneration temporal periphery both eyes. No retinal holes or tears identified. Vitreous clear.', 'Lattice degeneration - retinal detachment risk', 'moderate', 'Patient aware of flashes/floaters warning signs. Dilated exam every 6 months.'),
    (7, '2024-12-14', 'both', '/scans/scan_007.jpg', 'Cup-to-disc ratio 0.6 both eyes. Increased from 0.5 noted 12 months ago. RNFL borderline thin.', 'Glaucoma suspect - elevated cup-to-disc ratio', 'high', 'Progression noted. Start IOP-lowering treatment. Visual field and OCT in 3 months.'),
    (8, '2025-02-01', 'left', '/scans/scan_008.jpg', 'Large confluent drusen in macula. Early geographic atrophy noted. RPE disruption significant.', 'Intermediate age-related macular degeneration progressing', 'high', 'Progression from early to intermediate AMD. Consider anti-VEGF if wet AMD develops. Amsler grid monitoring.'),
    (9, '2024-10-30', 'both', '/scans/scan_009.jpg', 'No retinal abnormalities. Optic nerve healthy. Macula intact with normal foveal reflex.', 'Normal healthy retina', 'low', 'First comprehensive exam. Baseline established.'),
    (10, '2025-01-08', 'both', '/scans/scan_010.jpg', 'Multiple microaneurysms and dot-blot hemorrhages in all quadrants. Hard exudates near macula OD. No neovascularization.', 'Moderate nonproliferative diabetic retinopathy', 'high', 'Worsening from mild NPDR. Tighten blood sugar control. Refer to retinal specialist.'),
    (11, '2024-08-19', 'right', '/scans/scan_011.jpg', 'IOL well-centered post cataract surgery. Cup-to-disc ratio stable at 0.55. RNFL stable on OCT.', 'Post-surgical - stable glaucoma', 'moderate', 'IOP 16 mmHg on Latanoprost. Continue current regimen. Next visual field in 6 months.'),
    (12, '2025-03-12', 'both', '/scans/scan_012.jpg', 'Clear media. Normal optic disc and macula. Peripheral retina unremarkable.', 'Normal healthy retina', 'low', 'Young healthy patient. Routine screening normal.'),
    (13, '2024-07-25', 'both', '/scans/scan_013.jpg', 'Arteriovenous nicking noted. Copper wiring of arterioles. Flame hemorrhage superior arcade OS.', 'Hypertensive retinopathy grade 2', 'moderate', 'Worsening from grade 1. Blood pressure 158/95 at visit. Coordinate with PCP for BP management.'),
    (14, '2025-02-14', 'right', '/scans/scan_014.jpg', 'Corneal thinning and ectasia consistent with keratoconus. Retinal exam unremarkable through scleral lens.', 'Keratoconus - retina normal', 'low', 'Retinal findings normal. Keratoconus stable with current scleral lens fit.'),
    (15, '2024-06-11', 'both', '/scans/scan_015.jpg', 'Dense cataract limiting retinal view OD. Macular pucker with epiretinal membrane OS. Previous scleral buckle visible OD.', 'Cataracts obscuring view; macular pucker OS', 'critical', 'Cataract surgery OD needed to evaluate retina. Macular pucker OS stable per patient symptoms. Surgical consult recommended.'),
    (3, '2025-03-01', 'left', '/scans/scan_016.jpg', 'New drusen deposits forming inferiorly. No subretinal fluid. Pigment changes stable.', 'Early AMD progression - left eye', 'moderate', 'Left eye now showing early AMD signs. Continue supplements and monitoring.')
  `);

  console.log('Seeded retinal scans.');

  // --- Prescriptions ---
  await pool.query(`
    INSERT INTO prescriptions (patient_id, exam_date, right_sphere, right_cylinder, right_axis, left_sphere, left_cylinder, left_axis, right_add, left_add, pd, notes, ai_trend_analysis) VALUES
    (1, '2025-01-15', -2.25, -0.75, 90, -2.50, -1.00, 85, 2.50, 2.50, 64.0, 'Progressive lenses recommended. Anti-reflective coating.', 'Stable myopia. Add power increased from +2.25 over 2 years, consistent with age-related presbyopia progression.'),
    (2, '2025-02-20', -1.50, -0.50, 175, -1.75, -0.25, 10, NULL, NULL, 61.0, 'Single vision distance. Consider blue light filter for computer use.', 'Slight myopic shift -0.25 OD over 12 months. Monitor at next visit.'),
    (3, '2024-11-10', +1.00, -0.50, 60, +0.75, -0.75, 120, 2.00, 2.00, 65.0, 'Progressive lenses. Recommend photochromic for UV protection.', 'Hyperopic shift +0.25 both eyes. Add power stable. AMD patients benefit from UV protection.'),
    (4, '2025-03-05', -3.00, -0.75, 180, -2.75, -0.50, 5, NULL, NULL, 60.0, 'Daily disposable contacts preferred. Rewetting drops for dry eye.', 'Stable prescription for 3 consecutive years. Dry eye symptoms may require hybrid lens consideration.'),
    (5, '2024-09-22', -1.00, -1.25, 45, -0.75, -1.50, 135, 2.75, 2.75, 66.0, 'Bifocal lenses. Large segment for reading. High-index recommended.', 'Cylinder increasing OD. Add power at maximum typical range. Consider occupational lenses.'),
    (6, '2025-01-28', -7.50, -1.50, 170, -7.25, -1.75, 15, NULL, NULL, 62.0, 'High-index 1.74 lenses essential. Anti-reflective coating. Polycarbonate for safety.', 'High myopia stable. Lattice degeneration risk correlates with axial length. Annual dilated exams critical.'),
    (7, '2024-12-14', -0.50, -0.25, 90, -0.75, -0.50, 85, 1.75, 1.75, 63.0, 'Progressive lenses. Moderate add power. Occupational lens for computer work.', 'Mild myopic shift and add increase from +1.50. Early presbyopia progressing normally.'),
    (8, '2025-02-01', +2.00, -0.50, 110, +2.25, -0.75, 70, 2.50, 2.50, 62.5, 'Progressive with enhanced reading zone. Large frame recommended for AMD.', 'Hyperopia increasing. Consider early cataract contribution to refractive change.'),
    (9, '2024-10-30', -0.25, -0.50, 180, -0.50, -0.75, 175, NULL, NULL, 63.0, 'Minimal Rx. Computer glasses with blue light filter recommended.', 'First prescription. Mild astigmatism both eyes. Baseline established.'),
    (10, '2025-01-08', -4.50, -1.00, 95, -4.25, -0.75, 80, 1.50, 1.50, 60.5, 'Progressive lenses. Anti-reflective essential for night driving.', 'Myopia stable. Add power new - early presbyopia onset at age 52. Diabetic monitoring ongoing.'),
    (11, '2024-08-19', +0.50, -0.75, 45, -1.25, -0.50, 135, 2.75, 2.75, 67.0, 'Post-cataract Rx OD. Progressive lenses. Glaucoma-friendly frame with good peripheral view.', 'Significant refractive change OD post-cataract surgery. OS stable. Anisometropia now present.'),
    (12, '2025-03-12', -2.00, -0.25, 5, -1.75, -0.50, 170, NULL, NULL, 58.0, 'Daily disposable contacts or single vision glasses. Blue light coating.', 'Stable since last exam. Young patient with typical screen-related symptoms.'),
    (13, '2024-07-25', -0.75, -1.00, 120, -1.00, -1.25, 55, 2.25, 2.25, 64.5, 'Progressive lenses. Discuss impact of hypertension on vision.', 'Cylinder slowly increasing both eyes. Monitor for hypertensive-related changes.'),
    (14, '2025-02-14', -3.25, -3.00, 15, -1.50, -0.75, 160, NULL, NULL, 61.5, 'Scleral contact lens OD for keratoconus. Spectacle Rx for backup.', 'Keratoconus OD causes irregular astigmatism not fully correctable with spectacles. OS stable.'),
    (15, '2024-06-11', +3.50, -1.50, 75, +2.75, -1.00, 100, 2.75, 2.75, 68.0, 'Strong reading addition. Cataract surgery will change Rx significantly OD.', 'Hyperopic shift likely cataract-related OD. High add power. Defer new glasses until post-surgery.'),
    (1, '2024-03-10', -2.00, -0.75, 90, -2.25, -1.00, 85, 2.25, 2.25, 64.0, 'Annual update. Progressive lenses.', 'Compared to current: mild myopic increase and add power increase. Normal age-related change.')
  `);

  console.log('Seeded prescriptions.');

  // --- Frames ---
  await pool.query(`
    INSERT INTO frames (brand, model, color, material, shape, size, price, image_url, suitable_face_shapes, gender, in_stock) VALUES
    ('Ray-Ban', 'Aviator Classic RB3025', 'Gold/Green', 'Metal', 'aviator', '58-14-135', 169.00, '/frames/rayban_aviator.jpg', 'oval,heart,square', 'unisex', true),
    ('Ray-Ban', 'Wayfarer RB2140', 'Black/G-15', 'Acetate', 'rectangular', '54-18-150', 159.00, '/frames/rayban_wayfarer.jpg', 'oval,round,heart', 'unisex', true),
    ('Ray-Ban', 'Clubmaster RB3016', 'Tortoise/Gold', 'Acetate/Metal', 'browline', '51-21-145', 178.00, '/frames/rayban_clubmaster.jpg', 'oval,diamond,heart', 'unisex', true),
    ('Oakley', 'Flak 2.0 XL', 'Matte Black', 'O-Matter', 'rectangular', '59-12-133', 196.00, '/frames/oakley_flak.jpg', 'oval,square,round', 'male', true),
    ('Oakley', 'Holbrook', 'Polished Black', 'O-Matter', 'rectangular', '57-18-137', 175.00, '/frames/oakley_holbrook.jpg', 'oval,round,heart', 'male', true),
    ('Gucci', 'GG0061S', 'Havana/Gold', 'Acetate', 'round', '56-22-140', 380.00, '/frames/gucci_round.jpg', 'square,oval,heart', 'female', true),
    ('Tom Ford', 'FT5634-B', 'Shiny Black', 'Acetate', 'rectangular', '53-18-145', 415.00, '/frames/tomford_rect.jpg', 'oval,round,diamond', 'unisex', false),
    ('Warby Parker', 'Durand', 'Whiskey Tortoise', 'Acetate', 'round', '50-20-142', 95.00, '/frames/wp_durand.jpg', 'square,oval,diamond', 'unisex', true),
    ('Warby Parker', 'Haskell', 'Crystal', 'Acetate', 'rectangular', '49-22-145', 95.00, '/frames/wp_haskell.jpg', 'round,oval,heart', 'unisex', true),
    ('Nike', 'Flexon 4311', 'Satin Gunmetal', 'Titanium', 'rectangular', '55-17-140', 189.00, '/frames/nike_flexon.jpg', 'oval,round,square', 'male', true),
    ('Prada', 'PR 17WV', 'Caramel Tortoise', 'Acetate', 'cat-eye', '51-18-140', 350.00, '/frames/prada_cateye.jpg', 'oval,square,heart', 'female', false),
    ('Tom Ford', 'FT5865-B', 'Dark Havana', 'Acetate', 'square', '55-16-145', 450.00, '/frames/tomford_square.jpg', 'oval,round,heart', 'male', true),
    ('Ray-Ban', 'Round Metal RB3447', 'Silver/Blue', 'Metal', 'round', '50-21-145', 163.00, '/frames/rayban_round.jpg', 'square,oval,diamond', 'unisex', true),
    ('Oakley', 'Pitchman R', 'Satin Grey Smoke', 'TR-90', 'oval', '50-19-140', 210.00, '/frames/oakley_pitchman.jpg', 'square,heart,diamond', 'male', false),
    ('Gucci', 'GG1085O', 'Black/Gold', 'Acetate/Metal', 'cat-eye', '52-17-145', 420.00, '/frames/gucci_cateye.jpg', 'oval,square,diamond', 'female', true),
    ('Warby Parker', 'Ames', 'Brushed Ink', 'Stainless Steel', 'aviator', '54-17-145', 145.00, '/frames/wp_ames.jpg', 'oval,heart,square', 'unisex', true),
    ('Nike', 'Maverick Free', 'Matte Black/Red', 'TR-90', 'rectangular', '60-15-130', 89.00, '/frames/nike_maverick.jpg', 'oval,round,square', 'unisex', true)
  `);

  console.log('Seeded frames.');

  // --- Insurance Records ---
  await pool.query(`
    INSERT INTO insurance_records (patient_id, provider, policy_number, group_number, subscriber_name, coverage_type, effective_date, expiration_date, copay, deductible, verification_status, verification_result) VALUES
    (1, 'VSP Vision Care', 'VSP-88234561', 'GRP-4420', 'James Wilson', 'vision', '2024-01-01', '2025-12-31', 25.00, 0.00, 'verified', 'Active coverage. $150 frame allowance. Full lens coverage with $25 copay.'),
    (2, 'EyeMed', 'EM-77123456', 'GRP-8815', 'Maria Garcia', 'vision', '2024-06-01', '2025-05-31', 15.00, 0.00, 'verified', 'Active. $130 frame allowance. Contact lens allowance $150 in lieu of frames.'),
    (3, 'Blue Cross Blue Shield', 'BCBS-55987234', 'GRP-2210', 'Robert Thompson', 'both', '2024-01-01', '2025-12-31', 40.00, 250.00, 'verified', 'Medical and vision coverage. Medical eye exams covered. $200 frame allowance.'),
    (4, 'Aetna', 'AET-99345678', 'GRP-6650', 'Linda Nguyen', 'vision', '2024-03-01', '2025-02-28', 20.00, 0.00, 'expired', 'Policy expired. Patient needs to renew or provide updated insurance information.'),
    (5, 'UnitedHealthcare', 'UHC-33456789', 'GRP-1180', 'Michael Okafor', 'both', '2024-01-01', '2025-12-31', 50.00, 300.00, 'verified', 'Diabetic eye exam covered under medical. Vision hardware $175 allowance.'),
    (6, 'VSP Vision Care', 'VSP-88567234', 'GRP-4420', 'Susan Park', 'vision', '2024-01-01', '2025-12-31', 25.00, 0.00, 'verified', 'Active coverage. High-index lenses covered with authorization for high Rx.'),
    (7, 'MetLife Vision', 'MLV-44678901', 'GRP-3375', 'David Martinez', 'vision', '2024-07-01', '2025-06-30', 10.00, 0.00, 'verified', 'Active. $150 frame allowance. Progressive lenses covered.'),
    (8, 'Cigna', 'CIG-22789012', 'GRP-9940', 'Patricia Brown', 'medical', '2024-01-01', '2025-12-31', 50.00, 500.00, 'verified', 'Medical coverage for AMD monitoring and treatment. Vision hardware not covered.'),
    (9, 'EyeMed', 'EM-77234567', 'GRP-8815', 'Anthony Lee', 'vision', '2024-06-01', '2025-05-31', 15.00, 0.00, 'pending', 'Verification submitted. Awaiting response from carrier.'),
    (10, 'Blue Cross Blue Shield', 'BCBS-55123789', 'GRP-2210', 'Jennifer Patel', 'both', '2024-01-01', '2025-12-31', 40.00, 200.00, 'verified', 'Diabetic eye exams covered under medical. Vision plan includes $180 frame allowance.'),
    (11, 'Humana', 'HUM-11890123', 'GRP-5560', 'Charles Robinson', 'both', '2024-01-01', '2025-12-31', 35.00, 150.00, 'verified', 'Glaucoma management covered under medical. Vision allowance $160 for frames.'),
    (12, 'Aetna', 'AET-99456789', 'GRP-6650', 'Emily Kim', 'vision', '2024-03-01', '2025-02-28', 20.00, 0.00, 'verified', 'Active. Contact lens fit covered. $150 allowance for contacts or $130 for frames.'),
    (13, 'UnitedHealthcare', 'UHC-33567890', 'GRP-1180', 'William Davis', 'medical', '2024-01-01', '2025-12-31', 45.00, 350.00, 'verified', 'Medical eye exams for hypertensive retinopathy monitoring covered. No vision hardware benefit.'),
    (14, 'VSP Vision Care', 'VSP-88678345', 'GRP-7735', 'Angela Hernandez', 'vision', '2024-01-01', '2025-12-31', 25.00, 0.00, 'denied', 'Scleral contact lens requires prior authorization. Initial claim denied. Appeal submitted.'),
    (15, 'Cigna', 'CIG-22890123', 'GRP-9940', 'Thomas Wright', 'both', '2024-01-01', '2025-12-31', 75.00, 400.00, 'verified', 'Cataract surgery pre-authorized. Medical and vision combined plan. IOL upgrade patient responsibility.'),
    (3, 'VSP Vision Care', 'VSP-88234999', 'GRP-4420', 'Robert Thompson', 'vision', '2024-01-01', '2025-12-31', 25.00, 0.00, 'verified', 'Secondary vision plan through spouse. $150 frame allowance. Can coordinate benefits.')
  `);

  console.log('Seeded insurance records.');

  // --- Inventory ---
  await pool.query(`
    INSERT INTO inventory (item_name, category, brand, sku, quantity, reorder_level, unit_cost, retail_price, supplier, location, last_restocked) VALUES
    ('Aviator Classic RB3025', 'frames', 'Ray-Ban', 'FRM-RB3025-GLD', 12, 5, 85.00, 169.00, 'Luxottica', 'Display A', '2025-02-15'),
    ('Wayfarer RB2140', 'frames', 'Ray-Ban', 'FRM-RB2140-BLK', 8, 5, 78.00, 159.00, 'Luxottica', 'Display A', '2025-01-20'),
    ('Flak 2.0 XL', 'frames', 'Oakley', 'FRM-OAK-FLK2', 6, 3, 98.00, 196.00, 'Luxottica', 'Display B', '2025-02-01'),
    ('Durand', 'frames', 'Warby Parker', 'FRM-WP-DUR-WT', 15, 8, 38.00, 95.00, 'Warby Parker Direct', 'Display C', '2025-03-01'),
    ('Progressive HD Lens Pair', 'lenses', 'Essilor', 'LNS-ESS-PROG-HD', 30, 15, 65.00, 280.00, 'Essilor Labs', 'Storage A', '2025-02-20'),
    ('Single Vision CR-39 Pair', 'lenses', 'Essilor', 'LNS-ESS-SV-CR39', 50, 25, 18.00, 95.00, 'Essilor Labs', 'Storage A', '2025-03-05'),
    ('Bifocal FT-28 Lens Pair', 'lenses', 'Zeiss', 'LNS-ZS-BIF-FT28', 20, 10, 42.00, 180.00, 'Zeiss Vision', 'Storage A', '2025-01-15'),
    ('1-Day Acuvue Moist (90pk)', 'contacts', 'Johnson & Johnson', 'CTL-JJ-1DAM-90', 25, 10, 32.00, 65.00, 'J&J Vision', 'Storage B', '2025-03-10'),
    ('Air Optix Night & Day (6pk)', 'contacts', 'Alcon', 'CTL-ALC-AOND-6', 18, 8, 28.00, 58.00, 'Alcon Labs', 'Storage B', '2025-02-25'),
    ('Biofinity Toric (6pk)', 'contacts', 'CooperVision', 'CTL-CV-BTOR-6', 14, 6, 35.00, 72.00, 'CooperVision', 'Storage B', '2025-02-10'),
    ('Biotrue Multi-Purpose Solution 10oz', 'solutions', 'Bausch + Lomb', 'SOL-BL-BIO-10', 40, 20, 4.50, 12.99, 'Bausch + Lomb', 'Storage C', '2025-03-01'),
    ('Microfiber Cleaning Cloth (5pk)', 'accessories', 'OptiClean', 'ACC-OC-CLOTH-5', 60, 30, 1.20, 8.99, 'OptiClean Supply', 'Storage C', '2025-02-15'),
    ('Hard Shell Glasses Case', 'accessories', 'Generic', 'ACC-GEN-CASE-HS', 45, 20, 2.50, 14.99, 'Pacific Optical Supply', 'Storage C', '2025-01-28'),
    ('Eyeglass Repair Kit', 'accessories', 'OptiClean', 'ACC-OC-REPAIR', 35, 15, 1.80, 9.99, 'OptiClean Supply', 'Storage C', '2025-02-20'),
    ('Anti-Fog Lens Spray 2oz', 'accessories', 'FogAway', 'ACC-FA-SPRAY-2', 28, 12, 3.00, 11.99, 'FogAway Inc', 'Display D', '2025-03-08'),
    ('Pre-Moistened Lens Wipes (100ct)', 'accessories', 'Zeiss', 'ACC-ZS-WIPES-100', 22, 10, 5.50, 15.99, 'Zeiss Vision', 'Display D', '2025-02-28'),
    ('High-Index 1.74 Lens Pair', 'lenses', 'Essilor', 'LNS-ESS-HI174', 15, 8, 95.00, 380.00, 'Essilor Labs', 'Storage A', '2025-01-30'),
    ('Dailies Total1 (90pk)', 'contacts', 'Alcon', 'CTL-ALC-DT1-90', 20, 10, 45.00, 89.00, 'Alcon Labs', 'Storage B', '2025-03-05')
  `);

  console.log('Seeded inventory.');

  // --- Appointments ---
  await pool.query(`
    INSERT INTO appointments (patient_id, doctor_name, appointment_date, appointment_time, duration_minutes, appointment_type, status, room, notes) VALUES
    (1, 'Dr. Sarah Chen', '2025-03-20', '09:00', 30, 'Comprehensive Exam', 'completed', 'Room 1', 'Annual diabetic eye exam'),
    (2, 'Dr. Sarah Chen', '2025-03-20', '09:30', 20, 'Contact Lens Follow-up', 'completed', 'Room 2', 'CL check - 2 week follow-up'),
    (3, 'Dr. Sarah Chen', '2025-03-20', '10:00', 45, 'Medical Eye Exam', 'completed', 'Room 1', 'AMD monitoring visit'),
    (4, 'Dr. Sarah Chen', '2025-03-21', '08:30', 30, 'Comprehensive Exam', 'scheduled', 'Room 1', 'New patient exam'),
    (5, 'Dr. Sarah Chen', '2025-03-21', '09:00', 60, 'Glaucoma Follow-up', 'scheduled', 'Room 2', 'IOP check and visual field'),
    (6, 'Dr. Sarah Chen', '2025-03-21', '10:00', 30, 'Contact Lens Fitting', 'scheduled', 'Room 1', 'Scleral lens evaluation'),
    (7, 'Dr. Sarah Chen', '2025-03-21', '10:30', 30, 'Comprehensive Exam', 'scheduled', 'Room 2', 'Glaucoma suspect follow-up'),
    (8, 'Dr. Sarah Chen', '2025-03-22', '09:00', 45, 'Medical Eye Exam', 'scheduled', 'Room 1', 'AMD injection follow-up'),
    (9, 'Dr. Sarah Chen', '2025-03-22', '09:45', 20, 'Glasses Check', 'scheduled', 'Room 2', 'New glasses adjustment'),
    (10, 'Dr. Sarah Chen', '2025-03-22', '10:00', 30, 'Comprehensive Exam', 'scheduled', 'Room 1', 'Diabetic eye exam'),
    (11, 'Dr. Sarah Chen', '2025-03-22', '10:30', 30, 'Glaucoma Follow-up', 'scheduled', 'Room 2', 'Visual field testing'),
    (12, 'Dr. Sarah Chen', '2025-03-23', '08:30', 20, 'Contact Lens Follow-up', 'scheduled', 'Room 1', 'Daily lens trial check'),
    (13, 'Dr. Sarah Chen', '2025-03-23', '09:00', 45, 'Medical Eye Exam', 'scheduled', 'Room 2', 'Hypertensive retinopathy check'),
    (14, 'Dr. Sarah Chen', '2025-03-23', '10:00', 30, 'Contact Lens Fitting', 'scheduled', 'Room 1', 'Keratoconus - scleral lens'),
    (15, 'Dr. Sarah Chen', '2025-03-23', '10:30', 60, 'Pre-Op Evaluation', 'scheduled', 'Room 2', 'Cataract surgery measurements'),
    (1, 'Dr. Sarah Chen', '2025-03-24', '09:00', 30, 'Diabetic Eye Exam', 'scheduled', 'Room 1', '6-month follow-up')
  `);
  console.log('Seeded appointments.');

  // --- Billing ---
  await pool.query(`
    INSERT INTO billing (patient_id, invoice_number, invoice_date, service_description, service_code, amount, insurance_covered, patient_responsibility, payment_status, payment_method, notes) VALUES
    (1, 'INV-2025-001', '2025-01-15', 'Comprehensive Eye Exam - Diabetic', '92004', 250.00, 200.00, 50.00, 'paid', 'insurance+copay', 'VSP covered. $25 copay collected.'),
    (1, 'INV-2025-002', '2025-01-15', 'Retinal Photography', '92250', 75.00, 60.00, 15.00, 'paid', 'insurance+copay', 'Medical necessity documented.'),
    (2, 'INV-2025-003', '2025-02-20', 'Comprehensive Eye Exam', '92004', 200.00, 185.00, 15.00, 'paid', 'insurance+copay', 'EyeMed coverage applied.'),
    (3, 'INV-2025-004', '2024-11-10', 'Medical Eye Exam - AMD', '92014', 300.00, 260.00, 40.00, 'paid', 'insurance+copay', 'BCBS medical claim.'),
    (3, 'INV-2025-005', '2024-11-10', 'OCT Retinal Scan', '92134', 120.00, 96.00, 24.00, 'paid', 'insurance+copay', 'Diagnostic imaging for AMD.'),
    (5, 'INV-2025-006', '2024-09-22', 'Glaucoma Evaluation', '92014', 350.00, 300.00, 50.00, 'paid', 'insurance+copay', 'UHC medical. Elevated IOP workup.'),
    (6, 'INV-2025-007', '2025-01-28', 'Comprehensive Exam - High Myopia', '92004', 250.00, 225.00, 25.00, 'paid', 'insurance+copay', 'VSP claim. Lattice degeneration documented.'),
    (7, 'INV-2025-008', '2024-12-14', 'Glaucoma Follow-up', '92012', 180.00, 170.00, 10.00, 'paid', 'insurance+copay', 'MetLife vision.'),
    (8, 'INV-2025-009', '2025-02-01', 'AMD Monitoring', '92014', 400.00, 350.00, 50.00, 'paid', 'insurance+copay', 'Cigna medical claim.'),
    (10, 'INV-2025-010', '2025-01-08', 'Diabetic Retinal Exam', '92014', 300.00, 260.00, 40.00, 'paid', 'insurance+copay', 'BCBS medical. NPDR documented.'),
    (11, 'INV-2025-011', '2024-08-19', 'Post-Cataract Follow-up', '92012', 150.00, 115.00, 35.00, 'paid', 'insurance+copay', 'Humana. 3-month post-op.'),
    (12, 'INV-2025-012', '2025-03-12', 'Comprehensive Eye Exam', '92004', 200.00, 180.00, 20.00, 'pending', 'insurance', 'Aetna claim submitted, awaiting payment.'),
    (13, 'INV-2025-013', '2024-07-25', 'Medical Eye Exam - HTN', '92014', 280.00, 235.00, 45.00, 'paid', 'insurance+copay', 'UHC medical for HTN retinopathy.'),
    (14, 'INV-2025-014', '2025-02-14', 'Contact Lens Fitting - Specialty', '92072', 350.00, 0.00, 350.00, 'partial', 'credit card', 'VSP denied scleral lens. Patient paid $200, balance $150.'),
    (15, 'INV-2025-015', '2024-06-11', 'Pre-Op Cataract Eval', '92004', 450.00, 375.00, 75.00, 'paid', 'insurance+copay', 'Cigna pre-auth approved.'),
    (4, 'INV-2025-016', '2025-03-05', 'Contact Lens Exam', '92014', 180.00, 0.00, 180.00, 'overdue', 'none', 'Insurance expired. Patient billed directly. 30 days overdue.')
  `);
  console.log('Seeded billing.');

  // --- Contact Lenses ---
  await pool.query(`
    INSERT INTO contact_lenses (patient_id, fitting_date, lens_brand, lens_type, right_base_curve, right_diameter, right_power, right_cylinder, right_axis, left_base_curve, left_diameter, left_power, left_cylinder, left_axis, wear_schedule, replacement_schedule, solution_recommended, notes) VALUES
    (2, '2025-02-20', 'Acuvue Oasys 1-Day', 'Spherical Daily', 8.5, 14.3, -1.50, NULL, NULL, 8.5, 14.3, -1.75, NULL, NULL, 'Daily wear', 'Daily disposable', 'None required', 'Excellent comfort. No dryness reported.'),
    (4, '2025-03-05', 'Biofinity', 'Spherical Monthly', 8.6, 14.0, -3.00, NULL, NULL, 8.6, 14.0, -2.75, NULL, NULL, 'Daily wear - remove at night', '30 days', 'Biotrue Multi-Purpose Solution', 'Good lens movement. Slight dryness end of day.'),
    (6, '2025-01-28', 'SynergEyes Duette', 'Hybrid', 7.8, 14.5, -7.50, -1.50, 170, 7.8, 14.5, -7.25, -1.75, 15, 'Daily wear', '6 months', 'ClearCare Plus', 'High myopia. Hybrid lens provides sharper vision.'),
    (9, '2024-10-30', 'Dailies Total1', 'Spherical Daily', 8.5, 14.1, -0.25, NULL, NULL, 8.5, 14.1, -0.50, NULL, NULL, 'Part-time wear', 'Daily disposable', 'None required', 'Low Rx. Wears CLs for sports only.'),
    (12, '2025-03-12', 'Acuvue Oasys 1-Day', 'Spherical Daily', 8.5, 14.3, -2.00, NULL, NULL, 8.5, 14.3, -1.75, NULL, NULL, 'Daily wear', 'Daily disposable', 'None required', 'Switch from monthly to daily.'),
    (14, '2025-02-14', 'BostonXO', 'Scleral RGP', 7.2, 16.5, -3.25, -3.00, 15, 8.4, 14.0, -1.50, -0.75, 160, 'Daily wear', '12 months', 'Boston Simplus', 'Scleral lens OD for keratoconus. Good centration.'),
    (4, '2024-06-15', 'Air Optix Night & Day', 'Extended Wear', 8.6, 13.8, -2.75, NULL, NULL, 8.6, 13.8, -2.50, NULL, NULL, 'Extended wear - up to 30 nights', '30 days', 'Opti-Free Puremoist', 'Extended wear trial. Patient travels frequently.'),
    (2, '2024-08-10', 'Acuvue Moist', 'Spherical Daily', 8.5, 14.2, -1.25, NULL, NULL, 8.5, 14.2, -1.50, NULL, NULL, 'Daily wear', 'Daily disposable', 'None required', 'Previous lens - switched to Oasys.'),
    (10, '2025-01-08', 'Biofinity Toric', 'Toric Monthly', 8.7, 14.5, -4.50, -1.00, 95, 8.7, 14.5, -4.25, -0.75, 80, 'Daily wear', '30 days', 'Biotrue Multi-Purpose', 'Toric for astigmatism. Diabetic - monitor closely.'),
    (5, '2024-09-22', 'Proclear Multifocal', 'Multifocal Monthly', 8.7, 14.4, -1.00, NULL, NULL, 8.7, 14.4, -0.75, NULL, NULL, 'Daily wear', '30 days', 'ClearCare Plus', 'ADD +2.75 D design. Near vision good.'),
    (7, '2024-12-14', 'Dailies AquaComfort Plus', 'Spherical Daily', 8.7, 14.0, -0.50, NULL, NULL, 8.7, 14.0, -0.75, NULL, NULL, 'Part-time wear', 'Daily disposable', 'None required', 'Occasional wear for social events.'),
    (3, '2024-11-10', 'Air Optix Aqua Multifocal', 'Multifocal Monthly', 8.6, 14.2, 1.00, NULL, NULL, 8.6, 14.2, 0.75, NULL, NULL, 'Daily wear', '30 days', 'Opti-Free Puremoist', 'AMD patient - CLs for distance.'),
    (1, '2025-01-15', 'Biofinity Multifocal', 'Multifocal Monthly', 8.6, 14.0, -2.25, NULL, NULL, 8.6, 14.0, -2.50, NULL, NULL, 'Daily wear', '30 days', 'Biotrue Multi-Purpose', 'Diabetic patient. Good near and distance.'),
    (8, '2025-02-01', 'PureVision2 Multi-Focal', 'Multifocal Monthly', 8.6, 14.0, 2.00, NULL, NULL, 8.6, 14.0, 2.25, NULL, NULL, 'Daily wear', '30 days', 'ReNu MultiPlus', 'AMD patient using CLs as supplement.'),
    (11, '2024-08-19', 'Dailies Total1 Multifocal', 'Multifocal Daily', 8.5, 14.1, 0.50, NULL, NULL, 8.5, 14.1, -1.25, NULL, NULL, 'Daily wear', 'Daily disposable', 'None required', 'Post-cataract OD. Anisometropia corrected with CLs.')
  `);
  console.log('Seeded contact lenses.');

  // --- Visual Acuity ---
  await pool.query(`
    INSERT INTO visual_acuity (patient_id, test_date, right_uncorrected, right_corrected, left_uncorrected, left_corrected, both_uncorrected, both_corrected, test_type, test_distance, pinhole_right, pinhole_left, notes) VALUES
    (1, '2025-01-15', '20/40', '20/20', '20/50', '20/20', '20/30', '20/15', 'Snellen', '20 feet', '20/20', '20/20', 'Good correction both eyes. VA stable.'),
    (2, '2025-02-20', '20/30', '20/20', '20/40', '20/20', '20/25', '20/15', 'Snellen', '20 feet', '20/20', '20/20', 'Mild uncorrected blur. Corrects fully.'),
    (3, '2024-11-10', '20/30', '20/25', '20/25', '20/20', '20/25', '20/20', 'Snellen', '20 feet', '20/25', '20/20', 'OD slightly reduced - drusen affecting macula.'),
    (4, '2025-03-05', '20/60', '20/20', '20/50', '20/20', '20/40', '20/15', 'Snellen', '20 feet', '20/20', '20/20', 'Moderate uncorrected blur. Full correction.'),
    (5, '2024-09-22', '20/30', '20/20', '20/25', '20/20', '20/25', '20/20', 'Snellen', '20 feet', '20/20', '20/20', 'Good VA despite diabetic changes.'),
    (6, '2025-01-28', '20/200', '20/25', '20/200', '20/25', '20/200', '20/20', 'Snellen', '20 feet', '20/30', '20/25', 'High myopia. Good BCVA.'),
    (7, '2024-12-14', '20/25', '20/20', '20/25', '20/20', '20/20', '20/15', 'Snellen', '20 feet', '20/20', '20/20', 'Near-emmetropic. Good VA.'),
    (8, '2025-02-01', '20/50', '20/30', '20/40', '20/25', '20/40', '20/25', 'Snellen', '20 feet', '20/30', '20/25', 'Reduced BCVA OD - AMD progression.'),
    (9, '2024-10-30', '20/20', '20/20', '20/25', '20/20', '20/20', '20/15', 'Snellen', '20 feet', NULL, NULL, 'Near-plano. Minimal blur OS.'),
    (10, '2025-01-08', '20/70', '20/20', '20/60', '20/20', '20/50', '20/15', 'Snellen', '20 feet', '20/20', '20/20', 'Moderate uncorrected blur. Full correction. Diabetic.'),
    (11, '2024-08-19', '20/25', '20/20', '20/50', '20/25', '20/30', '20/20', 'Snellen', '20 feet', '20/20', '20/25', 'OD post-cataract good. OS cataract developing.'),
    (12, '2025-03-12', '20/30', '20/20', '20/30', '20/20', '20/25', '20/15', 'Snellen', '20 feet', '20/20', '20/20', 'Young healthy eyes. Full correction.'),
    (13, '2024-07-25', '20/30', '20/20', '20/40', '20/25', '20/30', '20/20', 'Snellen', '20 feet', '20/20', '20/20', 'OS slightly reduced - hypertensive changes.'),
    (14, '2025-02-14', '20/80', '20/30', '20/30', '20/20', '20/40', '20/20', 'Snellen', '20 feet', '20/40', '20/20', 'OD keratoconus - reduced spectacle BCVA.'),
    (15, '2024-06-11', '20/100', '20/40', '20/60', '20/30', '20/60', '20/30', 'Snellen', '20 feet', '20/40', '20/30', 'Bilateral cataracts reducing VA.'),
    (1, '2024-03-10', '20/40', '20/20', '20/40', '20/20', '20/30', '20/15', 'Snellen', '20 feet', '20/20', '20/20', 'Stable VA. Diabetic monitoring ongoing.')
  `);
  console.log('Seeded visual acuity.');

  // --- Recalls ---
  await pool.query(`
    INSERT INTO recalls (patient_id, recall_date, recall_type, reason, status, contact_method, contacted_date, notes) VALUES
    (1, '2025-06-14', 'Annual Eye Exam', 'Diabetic patient - annual comprehensive exam due', 'pending', NULL, NULL, 'High priority - diabetic retinopathy monitoring'),
    (2, '2025-04-22', 'Prescription Recheck', 'Progressive myopia - 6-month recheck', 'pending', NULL, NULL, 'Monitor myopia progression'),
    (3, '2026-01-10', 'Annual Eye Exam', 'Annual comprehensive exam due', 'pending', NULL, NULL, NULL),
    (4, '2025-09-05', 'Contact Lens Follow-up', 'Annual CL fitting renewal', 'contacted', 'phone', '2025-08-20', 'Left voicemail'),
    (5, '2025-03-01', 'Glaucoma Check', 'IOP monitoring every 6 months', 'overdue', 'email', '2025-02-15', 'Email sent, no response'),
    (6, '2026-02-15', 'Pediatric Vision Check', 'School-age annual vision screening', 'pending', NULL, NULL, NULL),
    (7, '2025-12-14', 'Annual Eye Exam', 'Routine annual exam', 'scheduled', 'phone', '2025-11-20', 'Appointment booked for Dec 14'),
    (8, '2025-02-01', 'Diabetic Eye Exam', 'AMD monitoring - 6 month follow-up', 'overdue', 'phone', '2025-01-15', 'Patient rescheduling'),
    (9, '2025-10-30', 'Annual Eye Exam', 'Routine annual exam', 'pending', NULL, NULL, NULL),
    (10, '2025-07-08', 'Diabetic Eye Exam', 'Diabetic retinopathy screening', 'pending', NULL, NULL, 'Coordinate with PCP'),
    (11, '2025-02-19', 'Post-Op Follow-up', 'Cataract post-op 1 year follow-up OS', 'overdue', 'sms', '2025-02-05', 'SMS reminder sent'),
    (12, '2026-03-12', 'Annual Eye Exam', 'Routine annual exam - young patient', 'completed', 'phone', '2026-02-28', 'Scheduled and attended'),
    (14, '2025-08-14', 'Contact Lens Follow-up', 'Keratoconus scleral lens follow-up', 'pending', NULL, NULL, 'Specialty lens fitting review'),
    (15, '2025-06-11', 'Post-Op Follow-up', 'Cataract surgery evaluation', 'pending', NULL, NULL, 'Discuss surgical timing')
  `);
  console.log('Seeded recalls.');

  console.log('Database seeding complete!');
};

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
  });
