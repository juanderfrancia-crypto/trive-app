-- El alta por OTP no trae nombre en los metadatos y profiles.name es NOT NULL.
-- El usuario completa su nombre después en la app.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, phone, role, rating)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'full_name', '')), ''), 'Nuevo usuario'),
    NEW.email,
    NULLIF(NEW.phone, ''),
    'passenger',
    0
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
