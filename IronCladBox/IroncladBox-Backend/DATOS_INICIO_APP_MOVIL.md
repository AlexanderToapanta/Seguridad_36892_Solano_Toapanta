# Datos que debería tener al iniciar la aplicación móvil

Este documento resume qué información y qué estados debería conocer la aplicación móvil en el momento de arrancar, para poder cargar la interfaz correcta y decidir qué puede ver o hacer cada usuario.

No entra en detalles de base de datos. Se centra en datos de sesión, perfil, navegación y comportamiento inicial.

## 1. Objetivo del arranque

Cuando la aplicación móvil se abre por primera vez o vuelve a abrirse, debería resolver rápidamente estas preguntas:

1. ¿Hay una sesión activa?
2. ¿Qué rol tiene el usuario?
3. ¿Qué pantalla inicial corresponde?
4. ¿Qué datos básicos se muestran en el encabezado o menú?
5. ¿Qué permisos o acciones dependen del contexto del usuario?

## 2. Datos mínimos que debe conocer al iniciar

### 2.1 Estado de sesión

La app necesita saber si el usuario ya inició sesión o no.

Datos clave:

1. Sesión activa o inactiva.
2. Token o credencial de acceso válida.
3. Fecha de expiración de la sesión.
4. Estado de autenticación confirmado.

Si no hay sesión válida, la app debe mostrar el acceso público o llevar directamente al login.

### 2.2 Identidad del usuario

Si existe sesión, la app debería cargar la identidad básica del usuario.

Datos clave:

1. Nombre.
2. Apellido.
3. Rol.
4. Foto de perfil.
5. Correo electrónico.

Con eso se puede personalizar la cabecera, el menú y la vista inicial.

### 2.3 Rol de usuario

El rol define todo el comportamiento de la app después del inicio.

Roles principales:

1. Administrador.
2. Entrenador.
3. Atleta.

La app debe usar este dato para decidir:

1. Qué menú mostrar.
2. Qué módulos habilitar.
3. Qué contenido cargar primero.
4. Qué acciones bloquear.

## 3. Información inicial que conviene cargar

### 3.1 Datos visuales de la cuenta

Para que la app se sienta lista desde el inicio, conviene cargar:

1. Foto de perfil.
2. Nombre visible.
3. Rol o etiqueta de usuario.
4. Estado de membresía, si aplica.

### 3.2 Resumen inicial del usuario

Según el rol, la app puede mostrar un resumen breve en la pantalla principal.

Ejemplos de resumen:

1. Próximo entrenamiento o WOD.
2. Estado de membresía.
3. Progreso reciente.
4. Accesos rápidos a funciones frecuentes.

### 3.3 Configuración de navegación

La aplicación debe decidir desde el arranque cuál será su estructura de navegación.

Opciones típicas:

1. Barra inferior para pantallas principales.
2. Menú lateral para funciones secundarias.
3. Accesos rápidos en la pantalla de inicio.

## 4. Pantallas que deberían existir desde el inicio

### 4.1 Splash o pantalla de carga

Es la pantalla breve que aparece al abrir la app.

Debe mostrar:

1. Logo de IroncladBox.
2. Nombre de la aplicación.
3. Indicador de carga.

Su función es dar tiempo a verificar sesión y preparar la navegación inicial.

### 4.2 Pantalla pública inicial

Si no hay sesión activa, la app debería mostrar una pantalla de entrada clara.

Debe incluir:

1. Presentación breve del box.
2. Botón para iniciar sesión.
3. Botón para registrarse.
4. Acceso a información básica como contacto o clases.

### 4.3 Pantalla de autenticación

Si el usuario quiere entrar al sistema, debe tener un flujo simple de acceso.

Debe pedir:

1. Correo.
2. Contraseña.

Y permitir:

1. Validar credenciales.
2. Mostrar errores claros.
3. Redirigir al área privada.

## 5. Datos que debe cargar si el usuario ya está autenticado

### 5.1 Menú por rol

La app debería construir el menú según el rol del usuario.

Ejemplo de datos necesarios:

1. Lista de módulos disponibles.
2. Orden de las secciones.
3. Vista inicial por defecto.

### 5.2 Preferencias de usuario

Si la app maneja preferencias, conviene leerlas al inicio.

Pueden incluir:

1. Notificaciones activadas o desactivadas.
2. Preferencia de visualización.
3. Última sección abierta.

### 5.3 Estado funcional del usuario

Especialmente para atletas, la app debería saber si hay condiciones que afecten el acceso a ciertas funciones.

Datos útiles:

1. Membresía activa o vencida.
2. Acceso permitido o restringido.
3. Estado general de la cuenta.

## 6. Datos iniciales por tipo de usuario

### 6.1 Atleta

Al iniciar, la app debería mostrarle al atleta información práctica para entrenar.

Datos recomendados:

1. Nombre y foto.
2. Estado de membresía.
3. Próximos WODs o horarios.
4. Progreso reciente.
5. Racha de asistencia, si se quiere destacar.

### 6.2 Entrenador

Al iniciar, el entrenador debería ver su contexto operativo.

Datos recomendados:

1. Nombre y foto.
2. Agenda o calendario cercano.
3. Accesos a creación de WODs.
4. Lista rápida de atletas o grupos.
5. Entrada al catálogo de ejercicios.

### 6.3 Administrador

Al iniciar, el administrador necesita una visión de control.

Datos recomendados:

1. Nombre y foto.
2. Resumen general de la plataforma.
3. Atajos a membresías, entrenadores, atletas y ejercicios.
4. Vista de calendario o actividad general.

## 7. Datos útiles para la primera experiencia

Si la app se abre por primera vez en un dispositivo, conviene considerar:

1. Mostrar una bienvenida corta.
2. Pedir permisos solo cuando sean necesarios.
3. Explicar brevemente qué puede hacer cada rol.
4. Guardar la sesión para no obligar a iniciar cada vez.

## 8. Permisos y capacidades del dispositivo

En móvil hay funciones que dependen del dispositivo y conviene resolverlas al inicio o cuando se necesiten.

Posibles capacidades:

1. Cámara o galería para foto de perfil.
2. Notificaciones push.
3. Acceso a red estable.
4. Geolocalización, si en el futuro se usa para contexto o contacto.

## 9. Flujo recomendado al arrancar

1. Mostrar splash o carga inicial.
2. Verificar si existe sesión guardada.
3. Si no hay sesión, ir a la pantalla pública o al login.
4. Si hay sesión, cargar nombre, rol, foto y estado principal.
5. Construir el menú correspondiente.
6. Abrir la vista inicial según el rol.

## 10. Lista corta de datos imprescindibles

Si se quisiera reducir todo a lo mínimo, al iniciar la app móvil deberían estar disponibles estos datos:

1. Estado de sesión.
2. Rol del usuario.
3. Nombre y apellido.
4. Foto de perfil.
5. Vista inicial por rol.
6. Estado de membresía, si es atleta.
7. Menú principal permitido.

## 11. Resumen práctico

La app no debería arrancar solo mostrando una pantalla vacía. Debería identificar primero quién es el usuario y qué puede hacer, y a partir de ahí decidir la navegación.

En términos de diseño móvil, lo importante es que al abrir la aplicación ya se tenga claridad sobre:

1. Quién está dentro.
2. Qué rol tiene.
3. Qué información se presenta primero.
4. Qué acciones quedan disponibles.
