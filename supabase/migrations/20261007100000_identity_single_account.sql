-- Una persona, una cuenta: el teléfono verificado es la identidad de toda cuenta.
-- El perfil toma el teléfono solo de auth.users (verificado por OTP), nunca de metadata.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, phone, role, rating)
  VALUES (
    NEW.id,
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'full_name', '')), ''),
    NEW.email,
    NULLIF(NEW.phone, ''),
    'passenger',
    0
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.sync_profile_phone()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles SET phone = NULLIF(NEW.phone, '') WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_phone_changed ON auth.users;
CREATE TRIGGER on_auth_user_phone_changed
  AFTER UPDATE OF phone ON auth.users
  FOR EACH ROW
  WHEN (OLD.phone IS DISTINCT FROM NEW.phone)
  EXECUTE FUNCTION public.sync_profile_phone();

-- auth.users es la fuente de verdad: los teléfonos de perfil que no están verificados allí se limpian.
UPDATE public.profiles p
SET phone = NULLIF(u.phone, '')
FROM auth.users u
WHERE u.id = p.id
  AND p.phone IS DISTINCT FROM NULLIF(u.phone, '');

DO $$
DECLARE
  dup_count integer;
BEGIN
  SELECT count(*) INTO dup_count FROM (
    SELECT phone FROM public.profiles
    WHERE phone IS NOT NULL AND phone <> ''
    GROUP BY phone HAVING count(*) > 1
  ) d;
  IF dup_count > 0 THEN
    RAISE EXCEPTION 'Hay % teléfonos repetidos en profiles. Resuélvelos antes de aplicar esta migración.', dup_count;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_unique
  ON public.profiles (phone)
  WHERE phone IS NOT NULL AND phone <> '';
