-- ============================================================
-- FIX 1: maintenance_status enum — add missing values
-- ============================================================
-- DB enum currently has only 'Closed'. Add 'In Shop' + 'Completed'.
ALTER TYPE maintenance_status ADD VALUE IF NOT EXISTS 'In Shop';
ALTER TYPE maintenance_status ADD VALUE IF NOT EXISTS 'Completed';

-- ============================================================
-- FIX 2: GRANT SELECT on views to authenticated + anon
-- ============================================================
GRANT SELECT ON v_vehicle_report TO authenticated;
GRANT SELECT ON v_vehicle_report TO anon;
GRANT SELECT ON v_dashboard_kpis TO authenticated;
GRANT SELECT ON v_dashboard_kpis TO anon;

-- ============================================================
-- FIX 3: Storage policies for vehicle-documents (PUBLIC bucket)
-- ============================================================
-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'vehicle-documents');

-- Allow anyone to view (public bucket)
CREATE POLICY "Allow public read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'vehicle-documents');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Allow authenticated delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'vehicle-documents');

-- ============================================================
-- FIX 4: Verify everything works
-- ============================================================
-- Test enum: this should now succeed
-- (Run manually if you want to verify)
-- INSERT INTO maintenance_logs (vehicle_id, description, cost, status, opened_at)
-- VALUES ((SELECT id FROM vehicles LIMIT 1), 'Test', 100, 'In Shop', now());

-- Verify views return data
SELECT * FROM v_vehicle_report LIMIT 3;
SELECT * FROM v_dashboard_kpis LIMIT 1;
