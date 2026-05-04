# Guía de pruebas

---

## Pruebas de API con Swagger

FastAPI genera documentación interactiva automáticamente.

1. Inicia el servidor backend
2. Abre `http://localhost:8000/docs`
3. Prueba cada endpoint directamente desde el navegador

---

## Casos de prueba principales

### Registro de paciente
- Enviar formulario sin consentimiento → debe retornar `400`
- Enviar formulario completo válido → debe retornar `201` con `public_code`

### Autenticación
- Petición sin token → debe retornar `401`
- Petición con token de rol insuficiente → debe retornar `403`
- Petición con token válido → debe retornar `200`

### Panel médico
- Confirmar llegada → `arrived: true` guardado en BD
- Asignar habitación → `assigned_room` y `assigned_bed` en BD
- Agregar procedimiento → registro en tabla `procedures`
- Marcar egreso → `discharged_at` en BD

### Módulo acompañante
- Código inexistente → debe mostrar mensaje de error
- Código válido → debe mostrar estado actual del paciente
- Con `share_with_companion: false` → procedimientos no visibles

---

## Herramientas recomendadas

| Herramienta | Uso | Enlace |
|-------------|-----|--------|
| Swagger UI | Pruebas de API | `http://localhost:8000/docs` |
| Postman | Colecciones de pruebas | postman.com |
| pgAdmin | Verificar datos en BD | pgAdmin |
| Playwright | Pruebas end-to-end | playwright.dev |
| k6 | Pruebas de carga | k6.io |

---

## Estándar de documentación

Las pruebas se documentan siguiendo el estándar **IEEE 829** con esta estructura:

| Campo | Descripción |
|-------|-------------|
| ID | Identificador único de la prueba |
| Descripción | Qué se está probando |
| Precondición | Estado inicial requerido |
| Pasos | Acciones a ejecutar |
| Resultado esperado | Qué debe ocurrir |
| Resultado real | Qué ocurrió |
| Estado | Pasa / Falla |