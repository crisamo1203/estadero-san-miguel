CREATE TABLE public.productos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  marca_color text NOT NULL DEFAULT 'neutral',
  precio_unidad numeric(12,2) NOT NULL DEFAULT 0,
  precio_canasta numeric(12,2) NOT NULL DEFAULT 0,
  costo_unidad numeric(12,2) NOT NULL DEFAULT 0,
  unidades_por_canasta int NOT NULL DEFAULT 30,
  stock_unidades int NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.productos TO authenticated;
GRANT ALL ON public.productos TO service_role;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff all productos" ON public.productos FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.ventas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  total numeric(12,2) NOT NULL DEFAULT 0,
  metodo_pago text NOT NULL,
  recibido numeric(12,2),
  cambio numeric(12,2),
  usuario_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.ventas TO authenticated;
GRANT ALL ON public.ventas TO service_role;
ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read ventas" ON public.ventas FOR SELECT TO authenticated USING (true);

CREATE TABLE public.ventas_detalle (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venta_id uuid NOT NULL REFERENCES public.ventas(id) ON DELETE CASCADE,
  producto_id uuid NOT NULL REFERENCES public.productos(id),
  tipo text NOT NULL CHECK (tipo IN ('unidad','canasta')),
  cantidad int NOT NULL,
  unidades_totales int NOT NULL,
  precio numeric(12,2) NOT NULL,
  subtotal numeric(12,2) NOT NULL
);
GRANT SELECT ON public.ventas_detalle TO authenticated;
GRANT ALL ON public.ventas_detalle TO service_role;
ALTER TABLE public.ventas_detalle ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read vd" ON public.ventas_detalle FOR SELECT TO authenticated USING (true);

CREATE TABLE public.compras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proveedor text NOT NULL,
  total numeric(12,2) NOT NULL DEFAULT 0,
  usuario_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.compras TO authenticated;
GRANT ALL ON public.compras TO service_role;
ALTER TABLE public.compras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read compras" ON public.compras FOR SELECT TO authenticated USING (true);

CREATE TABLE public.compras_detalle (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  compra_id uuid NOT NULL REFERENCES public.compras(id) ON DELETE CASCADE,
  producto_id uuid NOT NULL REFERENCES public.productos(id),
  tipo text NOT NULL CHECK (tipo IN ('unidad','canasta')),
  cantidad int NOT NULL,
  unidades_totales int NOT NULL,
  costo numeric(12,2) NOT NULL DEFAULT 0,
  subtotal numeric(12,2) NOT NULL DEFAULT 0
);
GRANT SELECT ON public.compras_detalle TO authenticated;
GRANT ALL ON public.compras_detalle TO service_role;
ALTER TABLE public.compras_detalle ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read cd" ON public.compras_detalle FOR SELECT TO authenticated USING (true);

-- items: [{producto_id, tipo, cantidad}]
CREATE OR REPLACE FUNCTION public.registrar_venta(_items jsonb, _metodo text, _recibido numeric)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; it jsonb; p public.productos; u int; pr numeric; tot numeric := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
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
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
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

REVOKE EXECUTE ON FUNCTION public.registrar_venta(jsonb, text, numeric) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.registrar_compra(text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_venta(jsonb, text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_compra(text, jsonb) TO authenticated;

INSERT INTO public.productos (nombre, marca_color, precio_unidad, precio_canasta, costo_unidad, stock_unidades) VALUES
 ('Poker', 'poker', 3500, 95000, 2600, 65),
 ('Águila', 'aguila', 3500, 95000, 2600, 90),
 ('Club Colombia', 'club', 4500, 125000, 3300, 24);