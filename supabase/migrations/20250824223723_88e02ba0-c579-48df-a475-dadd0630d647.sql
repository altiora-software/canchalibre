-- Create user profiles table for additional user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  email TEXT,
  role TEXT DEFAULT 'owner' CHECK (role IN ('owner', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sports complexes table
CREATE TABLE public.sport_complexes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  neighborhood TEXT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  website TEXT,
  photos TEXT[],
  amenities TEXT[],
  opening_hours JSONB,
  is_active BOOLEAN DEFAULT false,
  is_approved BOOLEAN DEFAULT false,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'overdue')),
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sports enum
CREATE TYPE public.sport_type AS ENUM ('futbol', 'basquet', 'tenis', 'voley', 'handball', 'skate');

-- Create sport courts table
CREATE TABLE public.sport_courts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  complex_id UUID NOT NULL REFERENCES public.sport_complexes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sport public.sport_type NOT NULL,
  players_capacity INTEGER NOT NULL,
  surface_type TEXT,
  has_lighting BOOLEAN DEFAULT false,
  has_roof BOOLEAN DEFAULT false,
  hourly_price DECIMAL(10,2),
  photos TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sport_complexes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sport_courts ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Sport complexes policies
CREATE POLICY "Anyone can view approved complexes" ON public.sport_complexes FOR SELECT USING (is_approved = true);
CREATE POLICY "Owners can view their own complexes" ON public.sport_complexes FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = owner_id AND user_id = auth.uid())
);
CREATE POLICY "Owners can insert their own complexes" ON public.sport_complexes FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = owner_id AND user_id = auth.uid())
);
CREATE POLICY "Owners can update their own complexes" ON public.sport_complexes FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = owner_id AND user_id = auth.uid())
);
CREATE POLICY "Admins can manage all complexes" ON public.sport_complexes FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Sport courts policies
CREATE POLICY "Anyone can view courts of approved complexes" ON public.sport_courts FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.sport_complexes WHERE id = complex_id AND is_approved = true)
);
CREATE POLICY "Owners can manage their courts" ON public.sport_courts FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.sport_complexes sc 
    JOIN public.profiles p ON sc.owner_id = p.id 
    WHERE sc.id = complex_id AND p.user_id = auth.uid()
  )
);
CREATE POLICY "Admins can manage all courts" ON public.sport_courts FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sport_complexes_updated_at BEFORE UPDATE ON public.sport_complexes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sport_courts_updated_at BEFORE UPDATE ON public.sport_courts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();