-- 0014_receipts_bucket.sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Path convention: <user_id>/<txn_id>/<filename>
CREATE POLICY receipts_owner_read ON storage.objects FOR SELECT
  USING (bucket_id = 'receipts'
         AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY receipts_owner_write ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'receipts'
              AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY receipts_owner_update ON storage.objects FOR UPDATE
  USING (bucket_id = 'receipts'
         AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY receipts_owner_delete ON storage.objects FOR DELETE
  USING (bucket_id = 'receipts'
         AND (storage.foldername(name))[1] = auth.uid()::text);
