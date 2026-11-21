# AutoFix-Manager

Sistema de gestión para talleres automotrices desarrollado con **Node.js**, **Express**, **Sequelize**, **Handlebars** y **Bootstrap 5**.

## Módulos principales
- **Inicio / Dashboard:** Vista general del taller y acceso rápido a los módulos.
- **Marcas y Vehículos:** Gestión de marcas, vehículos, propietarios, kilometraje y estado en taller.
- **Servicios y Piezas / Repuestos:** Catálogo de servicios y control de inventario con descuento y reintegro automático de stock.
- **Órdenes de Trabajo:** Seguimiento del flujo de la orden, servicios aplicados, piezas utilizadas, evidencias fotográficas (subida con `multer`) y resumen financiero con cálculo de descuentos e impuestos.

## Requisitos e instalación
1. Clonar el repositorio

2. Instalar dependencias:
    npm install

3. Configurar variables de entorno:
    Crea un archivo .env y, si utilizas entorno de pruebas/QA con MySQL, configura .env_qa

4. Iniciar la aplicación:
    npm run dev 

## Tecnologías
- **Backend: Node.js, Express, Sequelize**

- **Frontend: Handlebars (.hbs), Bootstrap 5, CSS personalizado**

- **Subida de archivos: Multer**