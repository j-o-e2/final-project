-- ============================================================================
-- LIST ALL RLS POLICIES ON PROFILES TABLE
-- ============================================================================
-- This query shows every policy currently configured on public.profiles

SELECT 
    policyname AS "Policy Name",
    permissive AS "Type (PERMISSIVE/RESTRICTIVE)",
    roles AS "Roles",
    qual AS "USING Clause (SELECT/INSERT/UPDATE/DELETE condition)",
    with_check AS "WITH CHECK Clause (INSERT/UPDATE condition)",
    cmd AS "Command (SELECT/INSERT/UPDATE/DELETE/ALL)"
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- Count total
SELECT COUNT(*) as "Total Policies" FROM pg_policies WHERE tablename = 'profiles';

-- Show RLS status
SELECT rowsecurity as "RLS Enabled" FROM pg_tables WHERE tablename = 'profiles' AND schemaname = 'public';
