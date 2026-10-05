-- Esquema base aproximado de producción (solo lo que las migraciones usan).
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, banned_until timestamptz);
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.role', true), '')::text $$;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id), name text, email text, phone text, avatar_url text,
  role varchar, rating numeric, total_trips int, total_spent numeric, is_driver_verified bool,
  created_at timestamp DEFAULT now(), updated_at timestamp DEFAULT now(), is_driver bool, is_passenger bool,
  driver_active bool, is_admin bool DEFAULT false, driver_verified bool DEFAULT false, driver_verified_at timestamp,
  profile_photo_url text, push_token text, notification_preferences jsonb, membership_type text DEFAULT 'free',
  membership_expiry timestamp, vehicle_photo_url text, last_seen timestamp, balance int DEFAULT 0,
  referral_code text, referred_by text, emergency_contact jsonb, preferred_municipality text
);
CREATE TABLE public.drivers (
  id uuid PRIMARY KEY REFERENCES public.profiles(id), license_number varchar NOT NULL, license_expiry date NOT NULL,
  vehicle_registration varchar, vehicle_insurance_expiry date, verified bool DEFAULT false, total_trips int DEFAULT 0,
  total_earnings numeric DEFAULT 0, average_rating numeric, created_at timestamp DEFAULT now(), updated_at timestamp DEFAULT now()
);
CREATE TABLE public.routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), driver_id uuid REFERENCES public.profiles(id),
  origin varchar, destination varchar, departure_time timestamp, arrival_time timestamp,
  price_per_seat numeric, total_seats int, available_seats int, vehicle_make varchar, vehicle_model varchar,
  vehicle_year int, vehicle_plate varchar, vehicle_color varchar, description text, status varchar DEFAULT 'scheduled',
  created_at timestamp DEFAULT now(), updated_at timestamp DEFAULT now(), vehicle_photo_url text,
  pickup_point varchar, pickup_point_custom bool DEFAULT false, vehicle_type text
);
CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), route_id uuid REFERENCES public.routes(id),
  passenger_id uuid REFERENCES public.profiles(id), seat_number int, price numeric,
  payment_method text DEFAULT 'cash', payment_status text DEFAULT 'pending', booking_status text DEFAULT 'pending',
  notes text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), refund_amount numeric,
  refund_percentage int, cancelled_at timestamptz, cancellation_reason text, dropoff_point text, dropoff_point_custom bool DEFAULT false
);
CREATE UNIQUE INDEX bookings_seat_unique ON public.bookings (route_id, seat_number) WHERE booking_status <> 'cancelled';
CREATE TABLE public.earnings_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), driver_id uuid, booking_id uuid, transaction_type text,
  amount numeric, description text, status text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE TABLE public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid REFERENCES public.profiles(id), amount int,
  type text, wompi_reference text UNIQUE, wompi_transaction_id text, status text, created_at timestamptz DEFAULT now()
);
ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_transactions_type_check CHECK (type IN ('recharge','route_fee'));
ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_transactions_status_check CHECK (status IN ('pending','approved','declined','voided','error'));
CREATE TABLE public.negotiation_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), request_id uuid, driver_id uuid, offer_id uuid, amount int,
  status text CHECK (status IN ('pending','deducted','refunded','cancelled')), deducted_at timestamptz, reason text,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE public.airport_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), passenger_id uuid REFERENCES public.profiles(id),
  driver_id uuid REFERENCES public.profiles(id), origin text, destination text, departure_time timestamp,
  passengers int DEFAULT 1, offered_price int, status text DEFAULT 'pending', accepted_at timestamptz,
  completed_at timestamptz, cancelled_at timestamptz, trip_notes text, price_updated_at timestamptz,
  notes text, created_at timestamptz DEFAULT now()
);
CREATE TABLE public.airport_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), request_id uuid REFERENCES public.airport_requests(id),
  driver_id uuid REFERENCES public.profiles(id), proposed_price int,
  status text CHECK (status IN ('pending','accepted','rejected')), created_at timestamptz DEFAULT now(), responded_at timestamptz
);
CREATE TABLE public.negotiation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), request_id uuid NOT NULL, driver_id uuid NOT NULL,
  passenger_id uuid NOT NULL, message_text text NOT NULL, message_type text, created_at timestamptz NOT NULL DEFAULT now(),
  is_read boolean, sent_by_user_id uuid NOT NULL
);
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, type text, title text, message text, data jsonb,
  is_read boolean DEFAULT false, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), booking_id uuid, reviewer_id uuid, reviewee_id uuid,
  rating int, comment text, recommend bool, created_at timestamptz DEFAULT now()
);
CREATE TABLE public.driver_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), driver_id uuid, document_type varchar, file_path varchar,
  file_name varchar, file_size integer, file_type varchar, uploaded_at timestamp,
  status varchar DEFAULT 'pending', rejection_reason text, verified_at timestamp, expiry_date date,
  created_at timestamp DEFAULT now(), updated_at timestamp DEFAULT now()
);
CREATE TABLE public.trip_messages (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), from_user_id uuid, to_user_id uuid, body text);
CREATE TABLE public.messages (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), from_user_id uuid, to_user_id uuid, body text);
CREATE TABLE public.user_sessions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, session_key text);
CREATE TABLE public.travel_preferences (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid);
CREATE TABLE public.trip_preferences (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, booking_id uuid);
CREATE TABLE public.favorite_routes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid);
CREATE TABLE public.saved_addresses (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid);
CREATE TABLE public.payment_methods (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid);
CREATE TABLE public.user_notification_preferences (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid);
CREATE TABLE public.user_activity (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid);
CREATE TABLE public.admin_actions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), admin_id uuid NOT NULL, action varchar, document_id uuid NOT NULL, reason text, created_at timestamp DEFAULT now());
CREATE TABLE public.driver_payment_methods (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), driver_id uuid);

-- Políticas que existían en producción y que las migraciones reemplazan o eliminan.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY read_all_bookings ON public.bookings FOR SELECT USING (true);
CREATE POLICY update_own_booking ON public.bookings FOR UPDATE USING (auth.uid() = passenger_id);
CREATE POLICY create_own_booking ON public.bookings FOR INSERT WITH CHECK (auth.uid() = passenger_id);
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view routes" ON public.routes FOR SELECT USING (true);
CREATE POLICY "Drivers can create routes" ON public.routes FOR INSERT WITH CHECK (auth.uid() = driver_id);
CREATE POLICY "Drivers can update own routes" ON public.routes FOR UPDATE USING (auth.uid() = driver_id);
ALTER TABLE public.airport_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY passenger_own_requests ON public.airport_requests FOR ALL USING (passenger_id = auth.uid()) WITH CHECK (passenger_id = auth.uid());
CREATE POLICY driver_accept_request ON public.airport_requests FOR UPDATE USING (status = 'pending') WITH CHECK (driver_id = auth.uid());
ALTER TABLE public.airport_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY passenger_accept_offer ON public.airport_offers FOR UPDATE USING (true);
CREATE POLICY driver_create_offer ON public.airport_offers FOR INSERT WITH CHECK (driver_id = auth.uid());
CREATE POLICY passenger_view_offers ON public.airport_offers FOR SELECT USING (true);
ALTER TABLE public.negotiation_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY users_send_negotiation_messages ON public.negotiation_messages FOR INSERT WITH CHECK (sent_by_user_id = auth.uid());
CREATE POLICY users_view_negotiation_messages ON public.negotiation_messages FOR SELECT USING (true);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can write reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);
CREATE POLICY "Reviews are public" ON public.reviews FOR SELECT USING (true);
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_transactions_select ON public.wallet_transactions FOR SELECT USING (auth.uid() = user_id);

-- Permisos por defecto de Supabase sobre el esquema public.
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
-- Privilegios por defecto de Supabase: toda tabla nueva queda accesible; RLS la protege.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;

-- Funciones que existían en producción y que las migraciones revocan o reemplazan.
CREATE OR REPLACE FUNCTION public.increment_wallet_balance(p_user_id uuid, p_amount integer) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN UPDATE profiles SET balance = COALESCE(balance,0) + p_amount WHERE id = p_user_id; END $$;
CREATE OR REPLACE FUNCTION public.create_negotiation_payment(v_offer_id uuid, v_amount integer DEFAULT 5000) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RETURN NULL; END $$;
CREATE OR REPLACE FUNCTION public.approve_document_admin(doc_id uuid, exp_date date DEFAULT NULL) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RETURN true; END $$;
CREATE OR REPLACE FUNCTION public.reject_document_admin(doc_id uuid, reason text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RETURN true; END $$;

-- Triggers de producción que afectan reservas y ganancias (versión equivalente).
CREATE OR REPLACE FUNCTION public.update_route_available_seats() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_route_id uuid; v_total int; v_confirmed int;
BEGIN
  v_route_id := COALESCE(NEW.route_id, OLD.route_id);
  SELECT total_seats INTO v_total FROM routes WHERE id = v_route_id;
  IF v_total IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  SELECT COUNT(*) INTO v_confirmed FROM bookings WHERE route_id = v_route_id AND booking_status = 'confirmed';
  UPDATE routes SET available_seats = GREATEST(0, v_total - v_confirmed), updated_at = NOW() WHERE id = v_route_id;
  RETURN COALESCE(NEW, OLD);
END $$;
CREATE TRIGGER trigger_update_available_seats_on_booking_insert AFTER INSERT ON bookings FOR EACH ROW EXECUTE FUNCTION update_route_available_seats();
CREATE TRIGGER trigger_update_available_seats_on_booking_update AFTER UPDATE ON bookings FOR EACH ROW WHEN (OLD.booking_status IS DISTINCT FROM NEW.booking_status) EXECUTE FUNCTION update_route_available_seats();

CREATE OR REPLACE FUNCTION public.handle_booking_completion() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_driver uuid; v_price numeric;
BEGIN
  IF NEW.payment_status = 'completed' AND OLD.payment_status <> 'completed' THEN
    SELECT r.driver_id, b.price INTO v_driver, v_price FROM bookings b JOIN routes r ON r.id = b.route_id WHERE b.id = NEW.id;
    INSERT INTO earnings_transactions (driver_id, booking_id, transaction_type, amount, description, status)
    VALUES (v_driver, NEW.id, 'trip', v_price, 'Pago de booking completado', 'completed');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trigger_booking_completion AFTER UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION handle_booking_completion();

CREATE OR REPLACE FUNCTION public.trg_booking_confirm_correct_payment_status() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.booking_status = 'confirmed' AND OLD.booking_status <> 'confirmed' THEN
    IF NEW.payment_method NOT IN ('cash','transfer') THEN NEW.payment_method := 'cash'; END IF;
    NEW.payment_status := 'pending';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_booking_confirm_correct_payment_status BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION trg_booking_confirm_correct_payment_status();

-- Disparador de verificación (versión de producción antes de la fase 2l).
CREATE OR REPLACE FUNCTION public.check_all_documents_verified(p_driver_id uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT COUNT(*) = 5 FROM driver_documents WHERE driver_id = p_driver_id AND document_type IN ('cedula','licencia','soat','tecnomecanica','antecedentes') AND status = 'verified' $$;
CREATE OR REPLACE FUNCTION public.update_driver_verification_status() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF check_all_documents_verified(NEW.driver_id) THEN UPDATE profiles SET is_driver_verified = true, role = 'driver' WHERE id = NEW.driver_id; END IF; RETURN NEW; END $$;
CREATE TRIGGER on_document_verified AFTER UPDATE OF status ON driver_documents FOR EACH ROW EXECUTE FUNCTION update_driver_verification_status();

-- Restricción de tipos de notificación tal como estaba en producción (antes de la fase 2o).
ALTER TABLE public.notifications ADD CONSTRAINT notification_type_check CHECK (type IN ('booking','trip_update','driver_arrived','trip_completed','review_pending','message','trip_published','offer_received','offer_accepted','trip_confirmed','trip_started','trip_rated'));

-- Publicación de tiempo real de Supabase (existe en producción).
CREATE PUBLICATION supabase_realtime;
