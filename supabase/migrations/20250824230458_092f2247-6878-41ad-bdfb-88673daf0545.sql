-- Create reservations table
CREATE TABLE public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  complex_id UUID REFERENCES public.sport_complexes(id) ON DELETE CASCADE,
  court_id UUID REFERENCES public.sport_courts(id) ON DELETE CASCADE,
  reservation_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  total_price NUMERIC NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('mercado_pago', 'transfer', 'cash')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'confirmed', 'paid', 'cancelled')),
  deposit_amount NUMERIC DEFAULT 0,
  deposit_paid BOOLEAN DEFAULT FALSE,
  mercadopago_payment_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure no overlapping reservations for the same court
  CONSTRAINT no_overlapping_reservations UNIQUE (court_id, reservation_date, start_time, end_time)
);

-- Create available time slots table
CREATE TABLE public.court_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id UUID REFERENCES public.sport_courts(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Sunday, 6 = Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT valid_time_range CHECK (start_time < end_time)
);

-- Create payment transactions table
CREATE TABLE public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID REFERENCES public.reservations(id) ON DELETE CASCADE,
  payment_method TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  external_payment_id TEXT, -- For MercadoPago or bank transfer reference
  payment_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.court_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reservations
CREATE POLICY "Users can view their own reservations" ON public.reservations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reservations" ON public.reservations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reservations" ON public.reservations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Complex owners can view reservations for their courts" ON public.reservations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sport_complexes sc 
      JOIN profiles p ON sc.owner_id = p.id 
      WHERE sc.id = reservations.complex_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Complex owners can update reservations for their courts" ON public.reservations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM sport_complexes sc 
      JOIN profiles p ON sc.owner_id = p.id 
      WHERE sc.id = reservations.complex_id AND p.user_id = auth.uid()
    )
  );

-- RLS Policies for court availability
CREATE POLICY "Anyone can view court availability" ON public.court_availability
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sport_courts sc 
      JOIN sport_complexes comp ON sc.complex_id = comp.id 
      WHERE sc.id = court_availability.court_id AND comp.is_approved = true
    )
  );

CREATE POLICY "Complex owners can manage their court availability" ON public.court_availability
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM sport_courts sc 
      JOIN sport_complexes comp ON sc.complex_id = comp.id 
      JOIN profiles p ON comp.owner_id = p.id 
      WHERE sc.id = court_availability.court_id AND p.user_id = auth.uid()
    )
  );

-- RLS Policies for payment transactions
CREATE POLICY "Users can view their own payment transactions" ON public.payment_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM reservations r 
      WHERE r.id = payment_transactions.reservation_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create payment transactions for their reservations" ON public.payment_transactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM reservations r 
      WHERE r.id = payment_transactions.reservation_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Complex owners can view payment transactions for their courts" ON public.payment_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM reservations r 
      JOIN sport_complexes sc ON r.complex_id = sc.id 
      JOIN profiles p ON sc.owner_id = p.id 
      WHERE r.id = payment_transactions.reservation_id AND p.user_id = auth.uid()
    )
  );

-- Add triggers for updated_at
CREATE TRIGGER update_reservations_updated_at
  BEFORE UPDATE ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_court_availability_updated_at
  BEFORE UPDATE ON public.court_availability
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payment_transactions_updated_at
  BEFORE UPDATE ON public.payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some default availability (9 AM to 10 PM, Monday to Sunday)
INSERT INTO public.court_availability (court_id, day_of_week, start_time, end_time)
SELECT 
  sc.id as court_id,
  dow as day_of_week,
  '09:00'::time as start_time,
  '22:00'::time as end_time
FROM sport_courts sc
CROSS JOIN generate_series(0, 6) as dow;