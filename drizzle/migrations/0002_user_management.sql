ALTER TABLE public.profiles ADD COLUMN nombre text NOT NULL DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN activo boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles r JOIN public.profiles p ON p.id = r.user_id
    WHERE r.user_id = _user_id AND r.role = _role AND p.activo
  )
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, usuario, nombre)
  VALUES (NEW.id, split_part(NEW.email, '@', 1), coalesce(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END $$;

DROP FUNCTION public.set_staff(uuid, boolean);