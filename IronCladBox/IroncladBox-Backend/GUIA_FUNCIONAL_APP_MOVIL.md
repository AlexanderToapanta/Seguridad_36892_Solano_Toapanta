# Guía funcional de la aplicación web IroncladBox

Este documento resume cómo funciona la aplicación web desde el punto de vista de pantallas, navegación y funcionalidades visibles para el usuario. Está pensado como base para construir una versión móvil equivalente.

## 1. Objetivo de la aplicación

La aplicación está orientada a la gestión y uso diario de un gimnasio CrossFit. Permite a visitantes conocer el box, a atletas gestionar su experiencia de entrenamiento y a entrenadores o administradores administrar contenidos y operaciones internas.

## 2. Estructura general

La aplicación se divide en dos grandes bloques:

1. **Sitio público**: información comercial y captación de usuarios.
2. **Área privada**: panel personalizado según el rol del usuario.

Los roles principales son:

1. **Administrador**
2. **Entrenador**
3. **Atleta**

Cada rol ve un menú distinto y accede a funciones específicas.

## 3. Pantallas del sitio público

### 3.1 Inicio / Landing

Es la primera pantalla visible para cualquier visitante. Su función es presentar el gimnasio y dirigir al usuario hacia el registro o el acceso.

Incluye estas secciones:

1. **Barra de navegación** con accesos a Nosotros, Clases, Entrenadores, Membresías, Contacto e Inicio de sesión.
2. **Hero principal** con mensaje de bienvenida y botones de acción.
3. **Sección “Sobre nosotros”** con una breve descripción del gimnasio y métricas destacadas.
4. **Sección de clases** con tarjetas cargadas dinámicamente.
5. **Sección de entrenadores** con perfiles y especialidades.
6. **Sección de membresías** con planes disponibles.
7. **Sección de contacto** con información del box, redes sociales, formulario y mapa.
8. **Pie de página** con enlaces rápidos y horarios.

### 3.2 Login

Pantalla para iniciar sesión con correo y contraseña.

Comportamiento principal:

1. Valida credenciales.
2. Muestra mensajes de éxito o error.
3. Redirige al dashboard después de autenticar.
4. Si ya existe una sesión activa, muestra un modal para evitar iniciar con otro usuario sin cerrar la sesión actual.

### 3.3 Registro

Pantalla para crear una cuenta nueva, pensada principalmente para atletas.

Incluye:

1. Datos personales: nombre, apellido, correo y teléfono.
2. Contraseña y confirmación.
3. Selección de membresía antes de completar el registro.
4. Datos físicos opcionales como peso y altura.

Validaciones visibles:

1. La contraseña debe cumplir criterios mínimos de seguridad.
2. Las contraseñas deben coincidir.
3. Debe elegirse una membresía.
4. El teléfono es obligatorio.

## 4. Área privada / Dashboard

Después del login, el usuario entra a un dashboard único que cambia de contenido según su rol.

### 4.1 Estructura común del dashboard

Todos los roles comparten esta estructura:

1. **Sidebar lateral** con el menú de navegación.
2. **Cabecera superior** con nombre, rol y foto de perfil.
3. **Área principal de contenido** donde se cargan las vistas.
4. **Botón de cerrar sesión**.

### 4.2 Funciones comunes del dashboard

1. Mostrar la identidad del usuario autenticado.
2. Permitir cambiar la foto de perfil.
3. Navegar entre vistas sin salir del panel.
4. Cerrar sesión.
5. En móvil, el menú lateral se comporta como un panel que puede abrirse y cerrarse.

## 5. Vistas por rol

### 5.1 Administrador

El administrador tiene la visión más completa y puede gestionar casi todo el contenido operativo.

Vistas disponibles:

1. **Dashboard**: resumen general.
2. **Membresías**: alta, edición, eliminación y administración de planes.
3. **Entrenadores**: gestión de perfiles y estado de entrenadores.
4. **Calendario WOD**: visualización de programación.
5. **Crear WOD**: alta de nuevos entrenamientos o sesiones.
6. **Atletas**: gestión de usuarios atletas y su estado.
7. **Ejercicios**: catálogo y administración de ejercicios.

Acciones típicas del administrador:

1. Crear, editar o eliminar membresías.
2. Crear, editar o desactivar entrenadores.
3. Crear, editar o eliminar clases y horarios.
4. Revisar atletas y su estado general.
5. Gestionar ejercicios con imágenes.
6. Acceder a herramientas de mantenimiento.

### 5.2 Entrenador

El entrenador tiene acceso a la gestión deportiva y a su relación con atletas y WODs.

Vistas disponibles:

1. **Dashboard**: panel inicial.
2. **Calendario WOD**: agenda de entrenamientos.
3. **Crear WOD**: crear nuevas sesiones.
4. **Mis Atletas**: listado de atletas asociados o visibles para seguimiento.
5. **Ejercicios**: consulta y gestión del catálogo de ejercicios.
6. **Mi perfil**: datos personales y foto.

Acciones típicas del entrenador:

1. Crear y editar WODs.
2. Crear horarios asociados a un WOD.
3. Ver atletas inscritos en horarios.
4. Cancelar horarios cuando sea necesario.
5. Mantener actualizado el catálogo de ejercicios.
6. Gestionar su perfil personal.

### 5.3 Atleta

El atleta consume la programación, consulta su progreso y administra su experiencia como miembro.

Vistas disponibles:

1. **Dashboard**: resumen inicial.
2. **Mis WODs**: horarios en los que está inscrito.
3. **Calendario WOD**: agenda general del mes.
4. **Mi progreso**: evolución personal y marcas.
5. **Ejercicios**: listado de ejercicios y, según el flujo, registro de progreso.
6. **Membresía**: estado de su plan.
7. **Mi perfil**: datos personales y foto.

Acciones típicas del atleta:

1. Inscribirse a horarios disponibles.
2. Cancelar una inscripción.
3. Ver sus horarios activos.
4. Registrar o actualizar marcas de progreso.
5. Consultar estadísticas y rachas de asistencia.
6. Revisar el estado de su membresía.
7. Cambiar su foto de perfil.

## 6. Funcionalidades transversales

### 6.1 Autenticación y sesión

La aplicación controla el acceso mediante sesión autenticada.

El comportamiento visible incluye:

1. Redirección automática al login si no hay sesión válida.
2. Verificación de sesión al entrar al dashboard.
3. Posibilidad de cerrar sesión desde cualquier área privada.

### 6.2 Carga dinámica de información

Varias pantallas se alimentan de información que se carga dinámicamente, sin necesidad de recargar toda la app.

Se usa para:

1. Clases.
2. Entrenadores.
3. Membresías.
4. Ejercicios.
5. Programación de WODs.

### 6.3 Contacto desde la web pública

La pantalla de contacto permite que un visitante envíe un mensaje al gimnasio.

Incluye:

1. Formulario con nombre, correo, teléfono y mensaje.
2. Validación mínima del contenido.
3. Información de ubicación y horarios.
4. Enlaces a redes sociales.
5. Mapa embebido.

### 6.4 Perfil del usuario

En el área privada, el usuario puede cambiar su foto de perfil.

Esto da una sensación de personalización y hace que el dashboard sea más cercano a una app móvil moderna.

## 7. Pantallas recomendadas para una app móvil equivalente

Si se va a construir una versión móvil, estas serían las pantallas mínimas a reproducir:

1. **Inicio público**.
2. **Login**.
3. **Registro**.
4. **Dashboard según rol**.
5. **Calendario de WODs**.
6. **Detalle de WOD o horario**.
7. **Ejercicios**.
8. **Membresía**.
9. **Progreso personal**.
10. **Perfil de usuario**.
11. **Contacto**.

## 8. Flujo resumido de uso

1. El visitante entra al sitio público y revisa clases, entrenadores y membresías.
2. Si quiere entrar al sistema, inicia sesión o se registra.
3. Según su rol, accede a un dashboard distinto.
4. Desde el panel puede consultar, administrar o registrar información relacionada con entrenamiento y membresía.
5. El usuario puede cerrar sesión en cualquier momento.

## 9. Resumen para diseño móvil

La app web está pensada como un producto con dos capas claras: captación pública y operación privada. Para móvil conviene mantener esa lógica, pero simplificando la navegación en una estructura de pestañas, menú lateral o barra inferior según el rol.

La clave funcional es esta:

1. **Visitante**: descubre el gimnasio y deja contacto.
2. **Atleta**: consulta, se inscribe, registra progreso y revisa su membresía.
3. **Entrenador**: administra WODs, horarios, ejercicios y atletas.
4. **Administrador**: controla el contenido completo y la operación general.
