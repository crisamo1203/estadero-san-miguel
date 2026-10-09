# Estadero San Miguel — App móvil de ventas e inventario

App web instalable (PWA) pensada para celular, con botones grandes y barra inferior fija.

## Acceso
- Pantalla de ingreso con usuario y PIN para el personal del estadero.
- Todas las pantallas quedan protegidas; botón para cerrar sesión.

## Pantallas (barra inferior con 4 pestañas)
1. **POS / Ventas** (inicio): tarjetas de productos con color por marca (Poker amarillo, Águila rojo, Club Colombia dorado). Cada tarjeta: [+1 Botella] y [+1 Canasta]. Carrito flotante con total en pesos y botón gigante "COBRAR". Ventana de cobro: Efectivo, Nequi, Daviplata, Tarjeta; con efectivo calcula la devuelta. Al cobrar se guarda la venta y se descuenta el inventario.
2. **Inventario**: lista compacta, stock tipo "65 Botellas (2 Canastas + 5 Unidades)", alerta si hay menos de 30 unidades. Ventana para agregar productos o editar precios.
3. **Compras**: registrar compra a proveedor (ej. Bavaria), elegir Canastas o Unidades, suma al inventario.
4. **Cierre de caja**: totales del día por método de pago y botellas vendidas por marca.

## Reglas de inventario
- Todo se maneja en unidades. 1 canasta = `unidades_por_canasta` (30 por defecto).
- Precios separados por botella y por canasta.

## Datos de ejemplo
Poker, Águila y Club Colombia con precios y stock inicial (precios inventados, para que los ajustes).

## Detalles técnicos
- Lovable Cloud: tablas `productos`, `ventas`, `ventas_detalle`, `compras`, `compras_detalle` con RLS solo para usuarios autenticados.
- Login: usuario + PIN de 6 dígitos usando correo sintético `usuario@estadero.local` con auto-confirmación (no hay recuperación por correo).
- Ventas/compras se registran con funciones SQL atómicas que insertan cabecera, detalle y ajustan `stock_unidades`.
- PWA: manifest e iconos para "Agregar a pantalla de inicio" (sin service worker, para no romper la vista previa).
- Rutas: `/auth`, y bajo zona protegida `/pos`, `/inventario`, `/compras`, `/cierre`; `/` redirige.
