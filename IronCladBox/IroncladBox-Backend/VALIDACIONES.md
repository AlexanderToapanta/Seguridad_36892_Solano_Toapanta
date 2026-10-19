# Validaciones Implementadas - IronCladBox

**Fecha:** 6 de junio de 2026  
**Total de validaciones implementadas:** 43

---

## 1. Módulo de Validación Reutilizable

**Archivo:** `app/utils/validators.js` (NUEVO)

| Función | Descripción |
|---------|-------------|
| `validateEmail(email)` | Valida formato email con regex |
| `validatePassword(password)` | Mín 8 caracteres, 1 mayúscula, 1 minúscula, 1 número, 1 símbolo |
| `validatePhone(phone)` | Formato numérico 7-20 dígitos, permite +, -, espacios, paréntesis |
| `validateNotEmpty(value, fieldName)` | Campo no vacío tras trim |
| `validateMaxLength(value, max, fieldName)` | Longitud máxima de string |
| `validatePositiveInt(value, fieldName)` | Número entero > 0 |
| `validatePositiveDecimal(value, fieldName, max)` | Número decimal > 0 con tope opcional |
| `validateDate(value, fieldName, options)` | Fecha válida, con opciones: `notFuture`, `notPast`, `minAge`, `maxAge` |
| `validateWeightPeso(peso)` | Peso entre 1-500 kg |
| `validateHeightAltura(altura)` | Altura entre 0.01-3.00 metros |
| `validateIdParam(id)` | ID entero positivo |
| `sanitizeString(value)` | Trim + strip tags HTML |
| `validateHorariosArray(horarios)` | Array de horarios no vacío, cada uno con hora y cupo válido |

---

## 2. Validaciones de Input en Backend

### 2.1 Auth Controller (`app/controllers/authController.js`)

| # | Método | Validación agregada |
|---|--------|---------------------|
| 1 | `register()` | Validación formato **email** con regex |
| 2 | `register()` | Validación **fortaleza de contraseña** (8+ caracteres, mayúscula, número, símbolo) |
| 3 | `register()` | Validación formato **teléfono** |
| 4 | `register()` | Validación **peso** (1-500 kg) y **altura** (0.01-3.00 m) |
| 5 | `register()` | Verificar que **id_membresia** exista y esté activa antes de asignar |
| 6 | `register()` | Validación **longitud máxima** de nombre/apellido (50 caracteres) |
| 7 | `login()` | Validación formato **email** |
| 8 | `login()` | **Eliminados logs** de contraseña en consola |

### 2.2 Admin Controller (`app/controllers/adminController.js`)

| # | Método | Validación agregada |
|---|--------|---------------------|
| 9 | `createMembership` | Validar **nombre** no vacío, **precio > 0**, **duración_días > 0** |
| 10 | `createMembership` | Verificar **nombre único** de membresía |
| 11 | `updateMembership` | Mismas validaciones que create, excluyendo el registro actual |
| 12 | `createTrainer` | Validar campos vacíos (nombre, apellido, email, password), email formato, email único, password fortaleza |
| 13 | `createAthlete` | Validar campos vacíos, email, password fortaleza, **fecha_nacimiento** (válida, no futura, edad 10-100 años), teléfono |
| 14 | `updateAthlete` | Si cambia email, **verificar que no exista** en otro usuario |
| 15 | `assignMembership` | Validar **id_atleta** existe, **fecha_inicio** formato válido |
| 16 | `updateAthleteMembership` | Validar **fecha_inicio** formato válido |

### 2.3 WOD Controller (`app/controllers/wodController.js`)

| # | Método | Validación agregada |
|---|--------|---------------------|
| 17 | `createWOD` | Validar **título** y **descripción** no vacíos, **fecha** no pasada |
| 18 | `createWOD` | Validar **array horarios** no vacío, cada uno con hora y cupo > 0 |
| 19 | `createSchedule` | Validar **hora** no vacía, **cupo_máximo > 0** |

### 2.4 Classes Controller (`app/controllers/classesController.js`)

| # | Método | Validación agregada |
|---|--------|---------------------|
| 20 | `createClass` | Validar **nombre** no vacío, **cupo > 0**, **fecha** no pasada |
| 21 | `createClass` | Verificar que **id_entrenador** exista en BD |
| 22 | `updateClass` | Mismas validaciones que create |

### 2.5 Progreso Controller (`app/controllers/progresoController.js`)

| # | Método | Validación agregada |
|---|--------|---------------------|
| 23 | `actualizarMarca` | Validar que **id_ejercicio** sea entero positivo y exista en BD |
| 24 | `actualizarMarca` | Validar **marca_maxima** como número positivo < 2000, sin NaN |

### 2.6 Contact Controller (`app/controllers/contactController.js`)

| # | Método | Validación agregada |
|---|--------|---------------------|
| 25 | `sendContact` | **Honeypot anti-spam**: rechazo silencioso si campo `website` está lleno |
| 26 | `sendContact` | Validar **longitud mensaje** (mín 10, máx 1000 caracteres) |
| 27 | `sendContact` | Sanitizar strings (trim + strip tags HTML) |
| 28 | `sendContact` | Persistir en tabla `contacto` de la BD |
| 29 | `getAllContacts` | Leer de tabla `contacto` en BD con fallback a modelo en memoria |

---

## 3. Validaciones de Reglas de Negocio

| # | Controlador | Método | Regla implementada |
|---|-----------|--------|--------------------|
| 30 | `membersController` | `cancelMyMembership` | Verificar que tenga **membresía activa** antes de cancelar (no id_membresia NULL, no status != 'activa') |
| 31 | `classesController` | `enrollClass` | Verificar **clase ACTIVA**, no cancelada, no en pasado |
| 32 | `adminController` | `reactivateClass` | Verificar **conflicto de horario** al reactivar una clase cancelada |
| 33 | `wodController` | `marcarAsistencia` | Verificar inscripción estado **ACTIVA**, impedir **doble marcado** (asistio = true) |
| 34 | `adminController` | `deleteTrainer` | Limpiar también **horarios WOD** e inscripciones de horarios asignados |
| 35 | `adminController` | `deleteMembership` | Verificar **atletas vinculados** antes de borrar, con mensaje descriptivo |
| 36 | `adminController` | `updateAthleteStatus` | Al reactivar, verificar **todas** las condiciones: sin_membresia, membresia_inactiva, sin_vigencia, vencida |

---

## 4. Validaciones de Base de Datos

**Archivo:** `database/migration_add_validations.sql` (NUEVO)

| # | Tabla | Constraints agregados |
|---|-------|----------------------|
| 37 | `membresia` | `CHECK (precio > 0)`, `CHECK (duracion_dias > 0)`, `UNIQUE(nombre)`, `created_at`, `updated_at` |
| 38 | `clase` | `CHECK (cupo_maximo > 0)`, `CHECK (duracion > 0)`, `CHECK (estado IN ('ACTIVA','CANCELADA','COMPLETADA'))` |
| 39 | `atleta` | `CHECK (peso IS NULL OR (peso > 0 AND peso < 500))`, `CHECK (altura IS NULL OR (altura > 0 AND altura < 3))`, `CHECK (fecha_fin >= fecha_inicio)` |
| 40 | `inscripcion` | `CHECK (estado IN ('ACTIVA','CANCELADA'))`, `CHECK (id_clase IS NOT NULL OR id_horario IS NOT NULL)` |
| 41 | `wod` | `CHECK (nivel IS NULL OR nivel IN ('Principiante','Intermedio','Avanzado','Todos'))` |
| 42 | `horario_clase` | `CHECK (cupo_maximo > 0)`, `CHECK (estado IN ('ACTIVO','CANCELADO'))` |
| 43 | `progreso_atleta` | `CHECK (marca_maxima > 0)` |
| 44 | FKs | `ON DELETE SET NULL` en: `clase.id_entrenador`, `atleta.id_membresia`, `inscripcion.id_clase`. `ON DELETE RESTRICT` en `usuario.id_rol` |
| 45 | `usuario` | `created_at`, `updated_at` con trigger |
| 46 | `entrenador` | `created_at`, `updated_at` con trigger |
| 47 | `contacto` (NUEVA) | Tabla completa con: `id_contacto`, `nombre`, `email`, `telefono`, `mensaje`, `estado` (PENDIENTE/LEIDO/RESPONDIDO), `CHECK (LENGTH(mensaje) >= 10 AND LENGTH(mensaje) <= 1000)` |

---

## 5. Validaciones de Frontend

| # | Vista | Validación agregada |
|---|-------|---------------------|
| 48 | `register.html` | Campo **"Confirmar Contraseña"** con validación JS de coincidencia en tiempo real |
| 49 | `register.html` | **Indicador de fortaleza** de contraseña (barra de color: rojo → naranja → amarillo → verde) en tiempo real |
| 50 | `register.html` | Validación JS antes de submit: todas las reglas de contraseña + coincidencia con confirmación |
| 51 | `index.html` | **Campo honeypot** oculto (`website`) anti-spam en formulario de contacto |
| 52 | `index.html` | Validación HTML5: `minlength="10"` y `maxlength="1000"` en textarea de mensaje |
| 53 | `index.html` | Validación JS: mensaje mínimo 10 caracteres, rechazo si honeypot lleno |
| 54 | `dashboard.js` | Módulo `DashboardValidators` con funciones `validateNotEmpty`, `validateEmail`, `validatePositiveInt`, `validateForm` para reutilizar en formularios del dashboard |

---

## Archivos Modificados / Creados

| Archivo | Acción | Cambios |
|---------|--------|---------|
| `app/utils/validators.js` | **NUEVO** | 13 funciones de validación reutilizables |
| `database/migration_add_validations.sql` | **NUEVO** | 11 constraints CHECK, 3 UNIQUE, 6 timestamps, 4 FK fixes, 1 tabla nueva |
| `app/controllers/authController.js` | Modificado | 8 validaciones + eliminación de logs de contraseña |
| `app/controllers/adminController.js` | Modificado | 12 validaciones + 5 reglas de negocio |
| `app/controllers/wodController.js` | Modificado | 4 validaciones + 1 regla de negocio |
| `app/controllers/classesController.js` | Modificado | 4 validaciones + 1 regla de negocio |
| `app/controllers/progresoController.js` | Modificado | 2 validaciones |
| `app/controllers/membersController.js` | Modificado | 1 regla de negocio |
| `app/controllers/contactController.js` | Modificado | 5 validaciones + persistencia en BD |
| `views/register.html` | Modificado | 3 validaciones frontend |
| `views/index.html` | Modificado | 3 validaciones frontend |
| `public/js/dashboard.js` | Modificado | Módulo de validación client-side |

---

## Cómo ejecutar la migración de BD

```bash
psql -U postgres -d ironcladbox -f database/migration_add_validations.sql
```
