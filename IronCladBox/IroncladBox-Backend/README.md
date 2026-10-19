# IroncladBox CrossFit - Quito

Página web completa para el gimnasio CrossFit IroncladBox ubicado en Quito, Ecuador.

## Ubicación
[Ver en Google Maps](https://maps.app.goo.gl/pRFAxbzsCvii74r8A)

## Arquitectura
Este proyecto utiliza el patrón **MVC (Modelo-Vista-Controlador)** para una mejor organización y mantenibilidad.

### Estructura del Proyecto
```
/
├── app/
│   ├── controllers/     # Controladores (lógica de negocio)
│   ├── models/         # Modelos (estructura de datos)
│   └── routes/         # Rutas del API
├── public/             # Archivos estáticos (Frontend)
│   ├── css/
│   ├── js/
│   └── images/
├── views/              # Vistas HTML
├── config/             # Configuraciones
├── server.js           # Punto de entrada del servidor
└── package.json
```

## Instalación

1. Instalar dependencias:
```bash
npm install
```

2. Iniciar el servidor:
```bash
npm start
```

O en modo desarrollo:
```bash
npm run dev
```

3. Abrir en el navegador:
```
http://localhost:3000
```

## Tecnologías

- **Backend**: Node.js + Express
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Patrón**: MVC (Modelo-Vista-Controlador)

## Características

- Landing page con información del CrossFit
- Sistema de clases y horarios
- Información de entrenadores
- Formulario de contacto
- Sección de membresías
- Galería de fotos
- Integración con Google Maps
