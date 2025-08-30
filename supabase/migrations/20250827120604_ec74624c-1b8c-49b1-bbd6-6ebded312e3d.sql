-- Insert test data for testing complex registration and reservations

-- Create a test owner profile first (this will be a test owner)
INSERT INTO public.profiles (id, user_id, full_name, email, role) 
VALUES (
  gen_random_uuid(),
  'test-owner-user-id',
  'Juan Pérez',
  'owner@test.com',
  'owner'
) 
ON CONFLICT (user_id) DO NOTHING;

-- Get the profile ID for use in complex creation
DO $$
DECLARE
    test_profile_id UUID;
    test_complex_id UUID;
    test_court_id UUID;
BEGIN
    -- Get or create test profile
    INSERT INTO public.profiles (id, user_id, full_name, email, role) 
    VALUES (
        gen_random_uuid(),
        'test-owner-user-id',
        'Juan Pérez',
        'owner@test.com',
        'owner'
    ) 
    ON CONFLICT (user_id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        role = EXCLUDED.role
    RETURNING id INTO test_profile_id;
    
    -- Create test complex
    INSERT INTO public.sport_complexes (
        id,
        owner_id,
        name,
        description,
        address,
        neighborhood,
        phone,
        whatsapp,
        email,
        amenities,
        is_active,
        is_approved,
        latitude,
        longitude
    ) VALUES (
        gen_random_uuid(),
        test_profile_id,
        'Complejo Deportivo Los Andes',
        'Moderno complejo deportivo con canchas de última generación',
        'Av. Belgrano 1234, San Salvador de Jujuy',
        'Centro',
        '388-4567890',
        '5493884567890',
        'info@losandes.com',
        ARRAY['Estacionamiento', 'Vestuarios', 'Duchas', 'Cantina/Bar', 'WiFi']::text[],
        true,
        true,
        -24.1945,
        -65.2965
    )
    RETURNING id INTO test_complex_id;
    
    -- Create test courts
    INSERT INTO public.sport_courts (
        id,
        complex_id,
        name,
        sport,
        players_capacity,
        surface_type,
        has_lighting,
        has_roof,
        hourly_price,
        is_active
    ) VALUES 
    (
        gen_random_uuid(),
        test_complex_id,
        'Cancha Principal',
        'futbol',
        11,
        'Césped sintético',
        true,
        false,
        3500,
        true
    ),
    (
        gen_random_uuid(),
        test_complex_id,
        'Cancha Techada',
        'futbol',
        7,
        'Superficie sintética',
        true,
        true,
        4000,
        true
    )
    RETURNING id INTO test_court_id;
    
    -- Create some availability slots for testing
    INSERT INTO public.court_availability (
        court_id,
        day_of_week,
        start_time,
        end_time,
        is_available
    ) 
    SELECT 
        sc.id,
        generate_series(0, 6) as day_of_week,
        '09:00'::time,
        '22:00'::time,
        true
    FROM public.sport_courts sc 
    WHERE sc.complex_id = test_complex_id;
    
END $$;