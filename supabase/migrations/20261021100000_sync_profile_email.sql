-- Espejo del patrón ya usado para teléfono (20261007100000_identity_single_account.sql):
-- profiles.email se sincroniza desde auth.users.email, pero solo cuando el cambio ya
-- quedó confirmado (Supabase no actualiza auth.users.email hasta que el usuario hace
-- clic en el enlace que le llega al correo nuevo). Nunca se escribe directo desde el cliente.
CREATE OR REPLACE FUNCTION public.sync_profile_email()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles SET email = NEW.email WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_email_changed ON auth.users;
CREATE TRIGGER on_auth_user_email_changed
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  WHEN (OLD.email IS DISTINCT FROM NEW.email)
  EXECUTE FUNCTION public.sync_profile_email();
