-- TRIVE APP - Database Setup for Supabase
-- Copy and paste this entire script in the SQL Editor of your Supabase dashboard

-- 1. PROFILES TABLE (User Profiles)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20),
  avatar_url VARCHAR(500),
  role VARCHAR(20) DEFAULT 'passenger', -- 'passenger' or 'driver'
  rating DECIMAL(3,2) DEFAULT 0,
  total_trips INT DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0,
  is_driver_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. ROUTES TABLE (Routes/Trips)
CREATE TABLE IF NOT EXISTS routes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  origin VARCHAR(255) NOT NULL,
  destination VARCHAR(255) NOT NULL,
  departure_time TIMESTAMP NOT NULL,
  arrival_time TIMESTAMP NOT NULL,
  price_per_seat DECIMAL(10,2) NOT NULL,
  total_seats INT NOT NULL DEFAULT 5,
  available_seats INT NOT NULL DEFAULT 5,
  vehicle_make VARCHAR(100),
  vehicle_model VARCHAR(100),
  vehicle_year INT,
  vehicle_plate VARCHAR(20),
  vehicle_color VARCHAR(50),
  vehicle_type VARCHAR(50),
  description TEXT,
  status VARCHAR(20) DEFAULT 'scheduled', -- 'scheduled', 'in_progress', 'completed', 'cancelled'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. BOOKINGS TABLE (Reservations)
CREATE TABLE IF NOT EXISTS bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  passenger_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  seat_number INT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50), -- 'card', 'cash', 'wallet'
  payment_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'refunded'
  booking_status VARCHAR(20) DEFAULT 'confirmed', -- 'confirmed', 'cancelled'
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. DRIVERS TABLE (Driver Information)
CREATE TABLE IF NOT EXISTS drivers (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  license_number VARCHAR(50) UNIQUE NOT NULL,
  license_expiry DATE NOT NULL,
  vehicle_registration VARCHAR(100),
  vehicle_insurance_expiry DATE,
  verified BOOLEAN DEFAULT FALSE,
  total_trips INT DEFAULT 0,
  total_earnings DECIMAL(10,2) DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. REVIEWS TABLE (User Reviews)
CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_routes_driver_id ON routes(driver_id);
CREATE INDEX IF NOT EXISTS idx_routes_departure_time ON routes(departure_time);
CREATE INDEX IF NOT EXISTS idx_routes_origin_destination ON routes(origin, destination);
CREATE INDEX IF NOT EXISTS idx_routes_vehicle_type ON routes(vehicle_type);
CREATE INDEX IF NOT EXISTS idx_bookings_route_id ON bookings(route_id);
CREATE INDEX IF NOT EXISTS idx_bookings_passenger_id ON bookings(passenger_id);
CREATE UNIQUE INDEX IF NOT EXISTS unique_route_seat_confirmed ON bookings(route_id, seat_number) WHERE booking_status != 'cancelled';
CREATE INDEX IF NOT EXISTS idx_reviews_booking_id ON reviews(booking_id);

-- Enable RLS (Row Level Security) for security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
-- Profiles: Users can see their own profile and all profiles for discovery
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Anyone can view all profiles" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Routes: Anyone can view routes, drivers can create/update their own
CREATE POLICY "Anyone can view routes" ON routes
  FOR SELECT USING (true);

CREATE POLICY "Drivers can create routes" ON routes
  FOR INSERT WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Drivers can update their own routes" ON routes
  FOR UPDATE USING (auth.uid() = driver_id);

-- Bookings: Users can only see their own bookings
CREATE POLICY "Users can view their own bookings" ON bookings
  FOR SELECT USING (auth.uid() = passenger_id);

CREATE POLICY "Drivers can view bookings for their routes" ON bookings
  FOR SELECT USING (
    auth.uid() IN (
      SELECT driver_id FROM routes WHERE routes.id = bookings.route_id
    )
  );

CREATE POLICY "Users can view bookings for available routes" ON bookings
  FOR SELECT USING (
    passenger_id::text = auth.uid() OR
    auth.uid() = (
      SELECT driver_id::text FROM routes WHERE routes.id = bookings.route_id
    ) OR
    EXISTS (
      SELECT 1 FROM routes WHERE routes.id = bookings.route_id AND routes.status = 'scheduled'
    )
  );

CREATE POLICY "Users can create bookings" ON bookings
  FOR INSERT WITH CHECK (auth.uid() = passenger_id);

-- Messages: secure chat data with row level security if the table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'messages' AND relkind = 'r') THEN
    EXECUTE 'ALTER TABLE messages ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view their messages" ON messages';
    EXECUTE 'CREATE POLICY "Users can view their messages" ON messages FOR SELECT USING (auth.uid() = from_user_id OR auth.uid() = to_user_id)';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert their messages" ON messages';
    EXECUTE 'CREATE POLICY "Users can insert their messages" ON messages FOR INSERT WITH CHECK (auth.uid() = from_user_id AND from_user_id <> to_user_id)';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update their messages" ON messages';
    EXECUTE 'CREATE POLICY "Users can update their messages" ON messages FOR UPDATE USING (auth.uid() = from_user_id) WITH CHECK (auth.uid() = from_user_id)';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete their messages" ON messages';
    EXECUTE 'CREATE POLICY "Users can delete their messages" ON messages FOR DELETE USING (auth.uid() = from_user_id)';
  END IF;
END;
$$;

-- Seed data (commented out - create users via Auth first, then create profiles)
-- After creating users in Supabase Auth, uncomment and update the UUIDs below
/*
INSERT INTO profiles (id, name, email, phone, role, rating, total_trips)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440000'::uuid, 'Juan Conductor', 'juan@test.com', '+57 310 234 5678', 'driver', 4.9, 45),
  ('550e8400-e29b-41d4-a716-446655440001'::uuid, 'María Pasajera', 'maria@test.com', '+57 320 123 4567', 'passenger', 4.8, 12);

INSERT INTO routes (driver_id, origin, destination, departure_time, arrival_time, price_per_seat, total_seats, available_seats, vehicle_make, vehicle_model, vehicle_year, vehicle_plate, vehicle_color, description)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440000'::uuid, 'Puerto Tejada', 'Cali', NOW() + INTERVAL '3 hours', NOW() + INTERVAL '4 hours', 5500, 5, 3, 'Nissan', 'Urvan', 2023, 'PTX-234', 'Gris', 'Viaje cómodo y seguro'),
  ('550e8400-e29b-41d4-a716-446655440000'::uuid, 'Cali', 'Bogotá', NOW() + INTERVAL '8 hours', NOW() + INTERVAL '14 hours', 45000, 5, 2, 'Nissan', 'Urvan', 2023, 'PTX-235', 'Blanco', 'Ruta directa');
*/
