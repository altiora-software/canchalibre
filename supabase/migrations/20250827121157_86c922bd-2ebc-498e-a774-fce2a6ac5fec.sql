-- Remove test data and create automatic profile creation
DELETE FROM public.court_availability WHERE court_id IN (
  SELECT id FROM public.sport_courts WHERE complex_id IN (
    SELECT id FROM public.sport_complexes WHERE owner_id IN (
      SELECT id FROM public.profiles WHERE user_id = 'test-owner-user-id'
    )
  )
);

DELETE FROM public.sport_courts WHERE complex_id IN (
  SELECT id FROM public.sport_complexes WHERE owner_id IN (
    SELECT id FROM public.profiles WHERE user_id = 'test-owner-user-id'
  )
);

DELETE FROM public.sport_complexes WHERE owner_id IN (
  SELECT id FROM public.profiles WHERE user_id = 'test-owner-user-id'
);

DELETE FROM public.profiles WHERE user_id = 'test-owner-user-id';

-- Create function to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, user_id, full_name, email, role)
  VALUES (
    gen_random_uuid(),
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    'customer' -- Default role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to call the function after user insertion
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();