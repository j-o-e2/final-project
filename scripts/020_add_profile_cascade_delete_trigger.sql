-- Migration: Create trigger to cascade delete profile when auth user is deleted

-- Create trigger function that deletes profile when auth user is deleted
CREATE OR REPLACE FUNCTION public.delete_profile_on_user_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete the profile row when the auth user is deleted
  DELETE FROM public.profiles
  WHERE id = OLD.id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users to call the function on DELETE
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;

CREATE TRIGGER on_auth_user_deleted
BEFORE DELETE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.delete_profile_on_user_delete();

-- End migration
