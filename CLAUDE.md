# GECOTEX Productividad — Estado del Proyecto

Aplicación web full-stack para medir la productividad de operarios de aduanas de GECOTEX INTERNACIONAL, S.L. mediante Unidades Ponderadas (UP), KPIs y bonificaciones semestrales con evaluación 360°.

---

## Entorno de Desarrollo Local

- **Python**: 3.14.5 (importante: NO usar pandas ni reportlab — no compilan en 3.14)
- **Node**: 24.15.0 | **npm**: 11.12.1
- **OS**: Windows 11 PowerShell
- **Ruta del proyecto**: `C:\Users\metac\Desktop\projectes\gecotex-productividad\`
  - ⚠️ La ruta de trabajo en Claude Code es `C:\Users\Usuario\OneDrive\Escriptori\Metacom Code\Gecotex\` (misma repo, diferente usuario)

### Arrancar backend

```powershell
cd C:\Users\metac\Desktop\projectes\gecotex-productividad\backend
python -m uvicorn main:app --reload --port 8000
```

URL: http://localhost:8000 | Swagger: http://localhost:8000/docs

### Arrancar frontend

```powershell
cd C:\Users\metac\Desktop\projectes\gecotex-productividad\frontend
npm run dev
```

URL: http://localhost:5173

---

## Despliegue en Producción

### Arquitectura de despliegue

```
GitHub repo (público)
  metacomweb-source/gecotex-productividad
  branch: main
       │
       ├──► Railway (backend FastAPI)
       │      Auto-deploy on push to main
       │      URL: https://gecotex-productividad-production.up.railway.app
       │      Health check: GET /health
       │
       └──► Vercel (frontend React/Vite)
              Auto-deploy on push to main
              URL: https://gecotex-productividad.vercel.app (o similar)
              Owner: cuenta Vercel "metacomweb"
```

### GitHub

- **Repo**: `https://github.com/metacomweb-source/gecotex-productividad` (público)
- **Cuenta GitHub del repo**: `metacomweb-source`
- **Branch principal**: `main`
- El repo es **público** para que Vercel Hobby plan permita auto-deploy desde cualquier cuenta

### Railway (backend)

- Auto-deploy en cada push a `main`
- Build command: Railway detecta `requirements.txt` automáticamente
- Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Variables de entorno configuradas en Railway dashboard
- **PHP/Python**: usa Python 3.x disponible en Railway (no 3.14 local)
- Logs: desde Railway dashboard → proyecto → "Deployments" → logs

**Problemas conocidos Railway:**
- Si arranca pero falla el healthcheck → revisar logs de startup en Railway
- Siempre verificar que no haya ImportError en los routers antes de hacer push

### Vercel (frontend)

- Auto-deploy en cada push a `main`
- Configuración en `vercel.json` en la **raíz del repo**:

```json
{
  "buildCommand": "cd frontend && npm install && npm run build",
  "outputDirectory": "frontend/dist",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**⚠️ IMPORTANTE**: `rootDirectory` NO es una propiedad válida de `vercel.json` — causa error de schema. Usar `buildCommand` con `cd frontend &&` en su lugar.

- Owner: cuenta Vercel `metacomweb`
- Plan: Hobby — no permite colaboración en repos privados; por eso el repo es público
- Variable de entorno en Vercel: `VITE_API_URL` = URL de Railway

### Workflow de deploy

```powershell
# Desde C:\Users\Usuario\OneDrive\Escriptori\Metacom Code\Gecotex
git add .
git commit -m "descripción del cambio"
git push origin main
# → Railway y Vercel despliegan automáticamente (1-3 min)
```

---

## Login y Autenticación

El sistema usa **bcrypt** para contraseñas y **JWT** para sesión.

### Credenciales de Demo

| Email | Contraseña | Rol |
|---|---|---|
| admin@gecotex.es | admin123 | admin |
| jesus@gecotex.es | demo123 | director |
| sergio@gecotex.es | demo123 | coordinador |
| cristian@gecotex.es | demo123 | operario |
| maria@gecotex.es | demo123 | operario |
| jorge@gecotex.es | demo123 | operario |
| silvia@gecotex.es | demo123 | operario |
| ana@gecotex.es | demo123 | operario |

---

## Estructura de Directorios

```
gecotex-productividad/
├── vercel.json               # Config Vercel (en raíz)
├── backend/
│   ├── main.py               # FastAPI app, lifespan, CORS, routers
│   ├── config.py             # Settings (pydantic-settings), JWT config
│   ├── database.py           # SQLAlchemy engine + SessionLocal + Base
│   ├── auth.py               # bcrypt hash/verify, JWT create/decode
│   ├── seed.py               # Datos iniciales
│   ├── requirements.txt
│   ├── models/
│   │   ├── usuario.py        # RolEnum + salario_bruto_anual + pct_maximo_bonus
│   │   ├── tipo_dua.py
│   │   ├── incrementador.py
│   │   ├── expediente.py
│   │   ├── sesion_trabajo.py
│   │   ├── objetivo_mes.py
│   │   ├── parametros_bonus.py   # LEGACY — ya no se usa activamente
│   │   ├── config_bonus_global.py  # NUEVO: config semestral (pesos, tramos, etc.)
│   │   ├── factores_evaluacion.py  # NUEVO: factores areas 2/3/4
│   │   ├── evaluaciones_bonus.py   # NUEVO: evaluación por empleado × semestre
│   │   ├── respuestas_factores.py  # NUEVO: notas auto+dirección por factor
│   │   ├── notificacion.py
│   │   ├── importacion_excel.py
│   │   └── __init__.py
│   ├── schemas/
│   │   ├── usuario.py
│   │   ├── expediente.py
│   │   ├── kpis.py
│   │   └── otros.py          # Incluye schemas del nuevo sistema bonus semestral
│   ├── services/
│   │   ├── calculo_up.py
│   │   ├── calculo_kpis.py
│   │   ├── calculo_bonus.py  # REESCRITO: sistema semestral 4 áreas
│   │   ├── importador_excel.py
│   │   └── generador_informes.py  # Incluye generar_informe_bonus_semestral()
│   └── routers/
│       ├── auth.py
│       ├── usuarios.py
│       ├── expedientes.py
│       ├── sesiones.py
│       ├── tipos_dua.py
│       ├── incrementadores.py
│       ├── objetivos.py
│       ├── kpis.py
│       ├── bonus.py          # REESCRITO: endpoints sistema semestral
│       ├── importacion.py
│       ├── informes.py       # /bonus-anual devuelve 410 (reemplazado por semestral)
│       └── notificaciones.py
└── frontend/
    ├── package.json          # React 18, Vite, Tailwind, Recharts, Axios, Router v6
    ├── vite.config.js        # proxy /api → localhost:8000
    ├── tailwind.config.js    # colores gecotex.* definidos aquí
    └── src/
        ├── App.jsx           # Routes con ProtectedRoute por rol
        ├── api/client.js     # Axios + interceptor JWT + bonusApi completo
        ├── context/
        │   ├── AuthContext.jsx
        │   └── CronometroContext.jsx
        ├── components/
        │   ├── Layout.jsx
        │   ├── ErrorBoundary.jsx
        │   ├── Cronometro.jsx
        │   └── ...
        └── pages/
            ├── Login.jsx
            ├── DashboardOperario.jsx   # Incluye tarjeta "Mi Evaluación"
            ├── DashboardEquipo.jsx
            ├── Expedientes.jsx
            ├── ExpedienteDetalle.jsx
            ├── ExpedienteForm.jsx
            ├── ImportacionExcel.jsx
            ├── TablaMaestraDUAs.jsx
            ├── Objetivos.jsx
            ├── Bonus.jsx               # Redirige a /evaluaciones-bonus
            ├── MiEvaluacion.jsx        # NUEVO: autoevaluación del empleado
            ├── EvaluacionesBonus.jsx   # NUEVO: tabla director
            ├── FormularioEvalDir.jsx   # NUEVO: evaluación por la dirección
            ├── ConfigBonus.jsx         # NUEVO: config sistema bonus (admin)
            ├── Empleados.jsx
            ├── Informes.jsx
            └── Configuracion.jsx
```

---

## Sistema de Bonus Semestral (NUEVO — implementado)

### Descripción

El sistema de bonus se basa en 4 áreas de evaluación:

| Área | Descripción | Cómo se calcula |
|---|---|---|
| Área 1 | Productividad DUAs | Automático: Factor K, % SLA, % Registro completo |
| Área 2 | Calidad Operativa | Evaluación auto (30%) + dirección (70%) |
| Área 3 | Gecotex Corporate | Evaluación auto + dirección |
| Área 4 | Digitalización | Evaluación auto + dirección |

### Fórmula del bonus

```
Puntuación total = A1×peso1 + A2×peso2 + A3×peso3 + A4×peso4
% bonus = tabla_tramos_escalonados(puntuación_total)
Bonus € = (salario_anual × pct_max_bonus × % bonus × factor_equipo) / 2
```

### Endpoints API principales

```
GET    /bonus/config/{año}/{semestre}     → config del período
POST   /bonus/config                     → crear config
PUT    /bonus/config/{id}                → actualizar config
GET    /bonus/factores                   → lista factores áreas 2/3/4
POST   /bonus/factores                   → crear factor
PUT    /bonus/factores/{id}              → editar factor
DELETE /bonus/factores/{id}             → desactivar factor
POST   /bonus/evaluaciones/iniciar       → crear evaluaciones período
GET    /bonus/evaluaciones/{año}/{semestre} → lista evaluaciones
GET    /bonus/evaluaciones/mia           → mi evaluación (empleado)
GET    /bonus/evaluaciones/{id}          → detalle evaluación
PUT    /bonus/evaluaciones/{id}/auto     → guardar autoevaluación
PUT    /bonus/evaluaciones/{id}/dir      → guardar evaluación dirección
POST   /bonus/evaluaciones/{id}/cerrar   → cerrar evaluación
GET    /bonus/factor-equipo/{año}/{semestre} → estado factor equipo
GET    /bonus/resumen/{año}/{semestre}   → resumen período
GET    /bonus/exportar/{año}/{semestre}  → Excel descargable
```

### Páginas frontend nuevas

- `/mi-evaluacion` — operario ve su evaluación, rellena autoevaluación
- `/evaluaciones-bonus` — director ve tabla de todas las evaluaciones
- `/evaluaciones-bonus/:id` — director rellena evaluación de un empleado
- `/config-bonus` — admin configura parámetros (solo admin)

---

## Rutas API — Prefijo `/api/v1`

```
POST   /auth/login
GET    /auth/me
GET    /expedientes
POST   /expedientes
GET    /kpis/operario/{id}
GET    /kpis/equipo
GET    /kpis/ranking
GET    /kpis/suficiencia
GET    /informes/productividad-mensual  → Excel
GET    /informes/expedientes            → Excel
GET    /informes/bonus-anual            → 410 Gone (reemplazado por sistema semestral)
```

---

## Lógica de Negocio

### Cálculo UP
```
UP = up_base + (max(0, num_partidas - tramo_partidas_min) × 0.10) + Σ(up_adicional de cada incrementador)
```

### Factor K y Bonus (sistema ANTIGUO — mantenido en KPIs)
```
K = UP_mes / objetivo_UP
```

### Ratio Suficiencia (semáforo equipo)
```
Ratio = UP_oferta / UP_demanda
< 0.90 → rojo | 0.90–1.10 → naranja | ≥ 1.10 → verde
```

---

## Permisos por Rol

| Acción | operario | coordinador | director | admin |
|---|---|---|---|---|
| Ver sus expedientes | ✓ | ✓ | ✓ | ✓ |
| Ver todos los expedientes | — | ✓ | ✓ | ✓ |
| Crear/editar expedientes | ✓ | ✓ | ✓ | ✓ |
| Gestionar DUAs/incrementadores | — | ✓ | ✓ | ✓ |
| Ver KPIs equipo/ranking | — | ✓ | ✓ | ✓ |
| Mi evaluación (autoevaluar) | ✓ | ✓ | ✓ | ✓ |
| Evaluar equipo (dirección) | — | — | ✓ | ✓ |
| Configurar bonus/objetivos | — | — | ✓ | ✓ |
| Config sistema bonus (admin) | — | — | — | ✓ |
| Gestionar usuarios | — | — | — | ✓ |

---

## Compatibilidades Críticas — NO cambiar

### Python 3.14 — paquetes incompatibles
- **pandas**: NO — usa `openpyxl` puro
- **reportlab**: NO — informes como Excel con `openpyxl`
- **passlib**: NO — usar `bcrypt` directo en `auth.py`

### FastAPI 0.136 + Starlette 1.0 — lifespan obligatorio
```python
# CORRECTO — no cambiar a @app.on_event:
from contextlib import asynccontextmanager
@asynccontextmanager
async def lifespan(app: FastAPI):
    create_tables()
    yield
app = FastAPI(..., lifespan=lifespan)
```

### WPML / wp_icl_translations
La columna `needs_update` **no existe** en esta versión de WPML — no hacer UPDATE de esa columna.

---

## Bug Conocido: React Error #310

**Síntoma:** "Minified React error #310" (Rendered more hooks than during the previous render) aparece en algunas páginas al navegar. Al hacer click en "Reintentar" en la pantalla de error, la página carga correctamente.

**Estado:** Sin resolver — causa raíz no identificada con certeza.

**Diagnóstico:**
- El error #310 significa que React detectó más hooks en un render que en el anterior
- Sucede de forma intermitente al navegar (no en cada carga)
- El retry (ErrorBoundary remonta el componente limpio) lo soluciona
- Posible causa: transición del estado de autenticación (`usuario` carga desde localStorage → se verifica con la API) provoca un estado intermedio que confunde el árbol de fibras de React
- Las páginas nuevas del sistema bonus (MiEvaluacion, EvaluacionesBonus, ConfigBonus) tienen todos los hooks al nivel superior, sin condicionales

**Workaround actual:**
- `ErrorBoundary.jsx` captura el error y muestra botón "Reintentar" que remonta el componente
- El usuario solo tiene que hacer click en "Reintentar" una vez

**Para investigar más:**
- Verificar si el error ocurre específicamente durante la carga inicial (antes de que `authApi.me()` complete)
- Añadir `key={usuario?.id}` en `<Layout>` en App.jsx podría forzar remontaje limpio al cambiar auth state
- Revisar `DashboardOperario.jsx` — se añadió `bonusApi.miEvaluacion()` dentro de un useEffect existente; si falla silenciosamente puede afectar renders subsiguientes

---

## Correcciones Recientes (sesión actual)

### Backend
- `backend/routers/informes.py`: eliminado import de `calcular_bonus_operario` (función eliminada en reescritura del bonus) que causaba `ImportError` al arrancar Railway

### Frontend
- `frontend/src/pages/Bonus.jsx`: reemplazado por redirect a `/evaluaciones-bonus`
- `frontend/src/pages/ConfigBonus.jsx`: rediseño completo — layout 2 columnas (config + simulador en vivo), 5 bloques acordeón con colores, barra apilada de pesos, escala visual de tramos, edición de `config_area1` (nuevo — antes no incluido), simulador en tiempo real
- `frontend/src/components/Layout.jsx`: añadidos "Mi Evaluación" y "Config. Bonus" en sidebar
- `frontend/src/pages/DashboardOperario.jsx`: añadida tarjeta de evaluación semestral
- `frontend/src/App.jsx`: añadidas rutas para las 4 páginas nuevas del bonus semestral

### Sistema nuevo bonus semestral (modelos + lógica + UI)
Implementado completamente en esta sesión:
- 4 modelos nuevos: `ConfigBonusGlobal`, `FactorEvaluacion`, `EvaluacionBonus`, `RespuestaFactor`
- `services/calculo_bonus.py` reescrito
- `routers/bonus.py` reescrito con ~15 endpoints
- 4 páginas frontend nuevas + modificaciones en 5 existentes

---

## Estado de la BD (gecotex.db)

Seed incluye:
- 8 usuarios con bcrypt
- 7 tipos DUA + 8 incrementadores
- Parámetros bonus 2024/2025 (legacy) + ConfigBonusGlobal 2026/S1 (nuevo)
- 11 FactoresEvaluacion para áreas 2/3/4
- Evaluación demo en estado 'completada' para Cristian
- Evaluación demo en estado 'auto_evaluacion' para María
- ~200 expedientes

**Reset BD:** borrar `backend/gecotex.db` y reiniciar uvicorn.

---

## Notas del Servidor implica.eu (cliente WordPress)

Ver CLAUDE.md raíz del directorio padre para instrucciones completas de SSH, WP-CLI, WPML, y Elementor para el cliente implica.eu.
