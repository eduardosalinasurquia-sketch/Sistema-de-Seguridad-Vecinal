# Sistema de Seguridad Vecinal

Aplicación web para registrar, priorizar y gestionar alertas de seguridad vecinal. Permite relacionar incidentes con vecinos, barrios y autoridades responsables, manteniendo un historial operativo en SQLite.

## Qué hace el sistema

- Registra alertas con nivel rojo, naranja o amarillo.
- Guarda tipo de incidente, descripción, ubicación GPS y estado.
- Administra barrios, vecinos y autoridades.
- Permite que un vecino comente una alerta.
- Asigna una alerta a una autoridad y controla su atención.
- Valida coordenadas, estados, IDs y relaciones antes de guardar.
- Presenta un panel web con navegación por módulo y CRUD completo.

## Arquitectura

```text
Navegador
   │  HTML/Jade + JavaScript (fetch)
   ▼
Express / Node.js
   ├── app.js              configuración y middleware
   ├── routes/alerts.js    CRUD de alertas
   ├── routes/related.js   CRUD relacional
   └── db.js               conexión, esquema y restricciones SQLite
          ▼
   data/seguridad.db
```

El frontend actual usa vistas Jade y JavaScript del navegador. La API REST está separada de la presentación, por lo que puede conectarse posteriormente una aplicación React sin cambiar el modelo de datos.

## Estructura principal

- `app.js`: configura Express y monta las rutas.
- `db.js`: abre `data/seguridad.db`, crea las tablas y activa las relaciones de SQLite.
- `routes/alerts.js`: CRUD específico de alertas con validaciones y paginación.
- `routes/related.js`: CRUD de barrios, vecinos, autoridades, comentarios y asignaciones.
- `views/index.jade`: panel visual con los formularios.
- `public/javascripts/alerts.js`: conecta los formularios con la API mediante `fetch` y carga los datos relacionados en los selectores.
- `data/seguridad.db`: archivo físico de la base de datos.

## Modelo de datos

### `alerts`

Es la tabla principal. `code` guarda el nivel de emergencia (`RED`, `ORANGE` o `YELLOW`), `category` guarda el tipo de incidente, `description` explica lo ocurrido, `latitude` y `longitude` guardan la ubicación, y `status` controla el avance (`OPEN`, `IN_PROGRESS`, `RESOLVED` o `DISMISSED`).

### `neighborhoods`

Guarda los barrios con `name` y `address`.

### `residents`

Guarda vecinos y los relaciona con un barrio mediante `neighborhood_id`:

```text
residents.neighborhood_id -> neighborhoods.id
```

### `authorities`

Guarda la autoridad responsable, su institución, teléfono y disponibilidad (`active`).

### `alert_comments`

Relaciona un comentario con una alerta y con el vecino que lo escribió:

```text
alert_comments.alert_id    -> alerts.id
alert_comments.resident_id -> residents.id
```

### `alert_assignments`

Relaciona una alerta con una autoridad y registra el avance de la atención:

```text
alert_assignments.alert_id     -> alerts.id
alert_assignments.authority_id -> authorities.id
```

Sus estados son `ASSIGNED`, `ACCEPTED`, `COMPLETED` y `CANCELLED`.

## Flujo de uso

1. Se crea un barrio.
2. Se registra un vecino y se selecciona su barrio.
3. Se registra una alerta con nivel, incidente, descripción y ubicación.
4. El vecino puede escribir un comentario seleccionando la alerta.
5. Se registra una autoridad.
6. La alerta se asigna a una autoridad.
7. La asignación y la alerta se actualizan hasta resolver el incidente.

Los formularios muestran nombres y descripciones, pero envían los `id` internamente para conservar las relaciones.

## API

Autenticación:

```text
POST /api/auth/register
POST /api/auth/login
```

El registro devuelve información del usuario y el login devuelve JSON; además, el servidor coloca el JWT en una cookie `HttpOnly` llamada `auth_token`. No se usa `localStorage`. Para clientes externos, también se puede enviar:

```text
Authorization: Bearer <token>
```

Las contraseñas nunca se guardan en texto plano: se almacenan con `bcryptjs`. La cookie/JWT expira en 3 horas y la clave debe configurarse con `JWT_SECRET` en producción. La ruta `/` redirige a `/login` cuando no existe una sesión válida.

Alertas:

```text
GET    /api/alerts
GET    /api/alerts/:id
POST   /api/alerts
PUT    /api/alerts/:id
DELETE /api/alerts/:id
```

Recursos relacionados:

```text
/api/neighborhoods
/api/residents
/api/authorities
/api/comments
/api/assignments
```

Cada recurso relacionado tiene `GET`, `GET /:id`, `POST`, `PUT /:id` y `DELETE /:id`.

## Instalación para programadores

Requisitos:

- Node.js 18 o superior.
- npm 9 o superior.
- Git.

Instalación local:

```bash
git clone https://github.com/eduardosalinasurquia-sketch/Sistema-De-Seguridad-Vecinal.git
cd Sistema-De-Seguridad-Vecinal
npm install
npm start
```

La aplicación queda disponible en `http://localhost:3000`. La base `data/seguridad.db` y sus tablas se inicializan automáticamente al arrancar.

## Despliegue

En cualquier servidor Node.js:

```bash
npm ci --omit=dev
PORT=3000 npm start
```

En Windows PowerShell:

```powershell
npm ci --omit=dev
$env:PORT = 3000
npm start
```

Para producción se recomienda ejecutar el proceso detrás de un proxy HTTPS (por ejemplo Nginx), conservar una copia de `data/seguridad.db` y configurar `PORT` mediante variables de entorno. El proyecto no contiene credenciales ni servicios externos obligatorios.

## Verificación rápida

```bash
curl http://localhost:3000/api/alerts
```

Para crear una alerta usa `POST /api/alerts` con el JSON mostrado arriba. Los endpoints de comentarios y asignaciones requieren que existan previamente la alerta, el vecino y la autoridad relacionados.

## Estado del proyecto

El MVP incluye persistencia SQLite, validaciones y CRUD. Las notificaciones push, mapa interactivo, autenticación y tiempo real pueden incorporarse como siguientes módulos.

## Ejemplo de creación de una alerta

```json
{
  "code": "RED",
  "category": "Robo",
  "description": "Robo reportado cerca del barrio",
  "latitude": -12.0464,
  "longitude": -77.0428,
  "status": "OPEN"
}
```
