# Frontend — AndesExpress

Interfaz web de AndesExpress para radicar envíos, rastrearlos, cotizar tarifas y ver el estado de los servicios. Está hecha con **Vite 5 + React 18 + TypeScript** y no tiene otras dependencias.

## Requisitos

- **Node.js 18 o superior** (lo exige Vite 5) y npm.
- Conexión a internet: los selectores de departamento y municipio consultan **API Colombia** en vivo.
- Los microservicios que use cada pantalla, corriendo en local (ver [Servicios que necesita](#servicios-que-necesita)).

## Cómo iniciarlo

Desde la carpeta `frontend/`:

```bash
npm install     # solo la primera vez, o cuando cambie package.json
npm run dev     # servidor de desarrollo
```

Abre **http://localhost:5173** en el navegador.

## Servicios que necesita

El navegador nunca habla directo con los backends. Todo pasa por el **proxy de Vite** (`vite.config.ts`), así que no hace falta configurar CORS en ningún microservicio:

| Ruta del proxy | Servicio | Dirección |
|---|---|---|
| `/svc/orders` | Orders | `http://127.0.0.1:8082` |
| `/svc/coverage` | Coverage | `http://127.0.0.1:8081` |
| `/svc/notifications` | Notifications | `http://127.0.0.1:8033` |
| `/svc/geo` | API Colombia | `https://api-colombia.com/api/v1` |

Lo que usa cada pestaña:

| Pestaña | Ruta | Necesita |
|---|---|---|
| 01 · Despachar | `#/despachar` | Orders + Coverage (Orders llama a Coverage para validar el destino) |
| 02 · Rastrear | `#/rastrear/{id}` | Orders (estado del pedido) + Notifications (avisos al cliente) |
| 03 · Cotizar | `#/cotizar` | Coverage |
| 04 · Red | `#/red` | Ninguno en particular: muestra cuáles servicios responden |

Si un servicio está apagado, la pantalla que lo usa muestra el error, pero el resto sigue funcionando.

### Levantar los backends

Cada servicio tiene su README con los detalles. En resumen, en terminales separadas:

```bash
# Coverage (puerto 8081)
cd coverage-service && ./gradlew bootRun

# Orders (puerto 8082), con Postgres local en Docker
cd orders-service && docker-compose up -d && ./mvnw spring-boot:run -Dspring-boot.run.profiles=prod

# Notifications (puerto 8033), necesita credenciales de AWS Learner Lab y el contenedor de SQS local en 4566
cd notifications-service && ./mvnw spring-boot:run
```

## Tipo de envío

El formulario de **Despachar** incluye el campo **Servicio** (Estándar o Exprés), que se envía a Orders como `shippingType`. Es **informativo**: la tarifa depende solo de la zona y del peso. Para que Orders lo guarde y lo devuelva, tiene que correr la versión que incluye ese campo (rama `feat/orders-readme-gaps` o posterior). Con una versión anterior, Orders lo ignora y en Rastrear aparece `—`.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga en caliente, en el puerto 5173 |
| `npm run typecheck` | Revisa los tipos de TypeScript sin generar archivos |
| `npm run build` | Revisa tipos y genera la versión de producción en `dist/` |
| `npm run preview` | Sirve `dist/` en el puerto 4173, con el mismo proxy (correr `build` antes) |

No hay test runner ni linter configurados; la verificación es `npm run typecheck`.

## Problemas comunes

| Síntoma | Causa probable |
|---|---|
| Los selectores de departamento y municipio salen vacíos o con error | No hay internet, o API Colombia no responde |
| "Coverage no disponible" o `503` al radicar | Coverage no está corriendo en el puerto 8081 |
| Error de red en Despachar o Rastrear | Orders no está corriendo en el puerto 8082 |
| Rastrear no muestra avisos | Notifications no está corriendo en el puerto 8033 |
| `Port 5173 is in use` | Ya hay otro `npm run dev` abierto; ciérralo o usa el puerto que Vite proponga |

## Estructura

```
src/
├── api/          → llamadas HTTP (todas pasan por api/http.ts), tipos y API Colombia
├── components/   → piezas visuales reutilizables
├── features/     → una carpeta por pestaña: dispatch, track, quote, network
├── hooks/        → rutas por hash, polling, departamentos
├── lib/          → formatos, etiquetas e identificadores
└── styles/       → tokens y estilos globales
```
