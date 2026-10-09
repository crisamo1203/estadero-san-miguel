CREATE TYPE public.app_role AS ENUM ('admin', 'staff');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  usuario text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "own or admin roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "own or admin profile" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, usuario) VALUES (NEW.id, split_part(NEW.email, '@', 1));
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin'), (NEW.id, 'staff');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.set_staff(_user_id uuid, _aprobado boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Solo administradores'; END IF;
  IF _user_id = auth.uid() THEN RAISE EXCEPTION 'No puedes cambiar tu propio acceso'; END IF;
  IF _aprobado THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'staff') ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = _user_id AND role = 'staff';
  END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public.set_staff(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_staff(uuid, boolean) TO authenticated;

DROP POLICY "staff all productos" ON public.productos;
CREATE POLICY "staff read productos" ON public.productos FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'staff'));
CREATE POLICY "admin insert productos" ON public.productos FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin update productos" ON public.productos FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin delete productos" ON public.productos FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY "staff read ventas" ON public.ventas;
CREATE POLICY "staff read ventas" ON public.ventas FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'staff'));
DROP POLICY "staff read vd" ON public.ventas_detalle;
CREATE POLICY "staff read vd" ON public.ventas_detalle FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'staff'));
DROP POLICY "staff read compras" ON public.compras;
CREATE POLICY "staff read compras" ON public.compras FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'staff'));
DROP POLICY "staff read cd" ON public.compras_detalle;
CREATE POLICY "staff read cd" ON public.compras_detalle FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'staff'));

CREATE OR REPLACE FUNCTION public.registrar_venta(_items jsonb, _metodo text, _recibido numeric)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; it jsonb; p public.productos; u int; pr numeric; tot numeric := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'staff') THEN RAISE EXCEPTION 'Usuario no aprobado'; END IF;
  IF _metodo NOT IN ('efectivo','nequi','daviplata','tarjeta') THEN RAISE EXCEPTION 'Método inválido'; END IF;
  INSERT INTO ventas(metodo_pago, usuario_id) VALUES (_metodo, auth.uid()) RETURNING id INTO v_id;
  FOR it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    SELECT * INTO p FROM productos WHERE id = (it->>'producto_id')::uuid FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Producto no existe'; END IF;
    IF (it->>'cantidad')::int <= 0 THEN RAISE EXCEPTION 'Cantidad inválida'; END IF;
    IF it->>'tipo' = 'canasta' THEN u := (it->>'cantidad')::int * p.unidades_por_canasta; pr := p.precio_canasta;
    ELSE u := (it->>'cantidad')::int; pr := p.precio_unidad; END IF;
    INSERT INTO ventas_detalle(venta_id, producto_id, tipo, cantidad, unidades_totales, precio, subtotal)
    VALUES (v_id, p.id, it->>'tipo', (it->>'cantidad')::int, u, pr, pr * (it->>'cantidad')::int);
    UPDATE productos SET stock_unidades = stock_unidades - u WHERE id = p.id;
    tot := tot + pr * (it->>'cantidad')::int;
  END LOOP;
  UPDATE ventas SET total = tot, recibido = _recibido,
    cambio = CASE WHEN _metodo = 'efectivo' AND _recibido IS NOT NULL THEN _recibido - tot END
  WHERE id = v_id;
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.registrar_compra(_proveedor text, _items jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c_id uuid; it jsonb; p public.productos; u int; cst numeric; tot numeric := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'staff') THEN RAISE EXCEPTION 'Usuario no aprobado'; END IF;
  INSERT INTO compras(proveedor, usuario_id) VALUES (coalesce(nullif(trim(_proveedor),''),'Sin proveedor'), auth.uid()) RETURNING id INTO c_id;
  FOR it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    SELECT * INTO p FROM productos WHERE id = (it->>'producto_id')::uuid FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Producto no existe'; END IF;
    IF (it->>'cantidad')::int <= 0 THEN RAISE EXCEPTION 'Cantidad inválida'; END IF;
    u := CASE WHEN it->>'tipo' = 'canasta' THEN (it->>'cantidad')::int * p.unidades_por_canasta ELSE (it->>'cantidad')::int END;
    cst := coalesce((it->>'costo')::numeric, 0);
    INSERT INTO compras_detalle(compra_id, producto_id, tipo, cantidad, unidades_totales, costo, subtotal)
    VALUES (c_id, p.id, it->>'tipo', (it->>'cantidad')::int, u, cst, cst * (it->>'cantidad')::int);
    UPDATE productos SET stock_unidades = stock_unidades + u WHERE id = p.id;
    tot := tot + cst * (it->>'cantidad')::int;
  END LOOP;
  UPDATE compras SET total = tot WHERE id = c_id;
  RETURN c_id;
END $$;