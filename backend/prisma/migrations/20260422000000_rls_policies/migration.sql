-- Enable Row Level Security on all user-scoped tables
ALTER TABLE "SavedReport" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MasterBaseline" ENABLE ROW LEVEL SECURITY;

-- SavedReport: users can only access their own rows
CREATE POLICY "saved_report_owner_only"
  ON "SavedReport"
  USING ("userId" = current_setting('app.current_user_id', true));

-- MasterBaseline: users can only access their own rows
CREATE POLICY "master_baseline_owner_only"
  ON "MasterBaseline"
  USING ("userId" = current_setting('app.current_user_id', true));

-- Note: these RLS policies are a secondary defense layer.
-- Primary access control is the Firebase JWT check in the Express requireAuth middleware,
-- which filters all queries by userId. Enable these once the backend sets the
-- app.current_user_id session variable per request (SET LOCAL "app.current_user_id" = $uid).
