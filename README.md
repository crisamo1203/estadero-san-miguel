# Estadero San Miguel

App web (PWA) para la caja de un estadero: punto de venta con tarjetas por marca, inventario en unidades y canastas, registro de compras a proveedores, cierre de caja diario y gestión de usuarios.

- **Caja** — tarjetas de productos por marca, carrito flotante y cobro en efectivo con cambio.
- **Inventario** — stock en unidades y canastas con aviso cuando queda poco.
- **Compras** — registro de compras a proveedores y actualización de stock.
- **Cierre** — totales del día por forma de pago y botellas por marca.
- **Usuarios** — solo un administrador crea empleados, cambia PIN o desactiva cuentas.

## Desarrollo

```sh
npm i
npm run dev
```

## Estructura de datos

Las tablas y funciones del backend (producto, ventas, compras, usuarios) están en `drizzle/migrations/`. Los datos reales de productos, ventas y usuarios se exportan por aparte desde el panel del respaldo, no viajan con el código.

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c8298ea1-4f17-4a31-a328-e3f8f89c0356).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.
