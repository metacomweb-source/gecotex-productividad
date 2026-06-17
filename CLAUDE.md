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
│   ├── seed.py               # Datos iniciales (incluye clientes + FK)
│   ├── patch_objetivos.py    # Patch startup: recalibra objetivos UP en BD existente
│   ├── patch_factores.py     # Patch startup: añade factores evaluación si no existen
│   ├── requirements.txt
│   ├── models/
│   │   ├── usuario.py        # RolEnum + SedeEnum + salario_bruto_anual + pct_maximo_bonus
│   │   ├── tipo_dua.py
│   │   ├── incrementador.py
│   │   ├── cliente.py        # NUEVO: catálogo de clientes (nombre único, NIF, activo)
│   │   ├── expediente.py     # cliente_id FK nullable + cliente_nombre (texto libre, sync)
│   │   ├── sesion_trabajo.py
│   │   ├── objetivo_mes.py
│   │   ├── parametros_bonus.py   # LEGACY — ya no se usa activamente
│   │   ├── config_bonus_global.py  # config semestral (pesos, tramos, etc.)
│   │   ├── factores_evaluacion.py  # factores areas 2/3/4
│   │   ├── evaluaciones_bonus.py   # evaluación por empleado × semestre
│   │   ├── respuestas_factores.py  # notas auto+dirección por factor
│   │   ├── notificacion.py
│   │   ├── importacion_excel.py
│   │   └── __init__.py
│   ├── schemas/
│   │   ├── usuario.py
│   │   ├── expediente.py     # cliente_id Optional[int] en Base y Update
│   │   ├── kpis.py
│   │   └── otros.py          # Incluye schemas del sistema bonus semestral
│   ├── services/
│   │   ├── calculo_up.py
│   │   ├── calculo_kpis.py
│   │   ├── calculo_bonus.py  # REESCRITO: sistema semestral 4 áreas
│   │   ├── importador_excel.py
│   │   └── generador_informes.py
│   └── routers/
│       ├── auth.py
│       ├── usuarios.py
│       ├── expedientes.py    # filtros: año, mes, canal, tipo_trafico, cliente_id, operario_id
│       ├── clientes.py       # NUEVO: CRUD catálogo clientes (coordinador+)
│       ├── sesiones.py
│       ├── tipos_dua.py
│       ├── incrementadores.py
│       ├── objetivos.py
│       ├── kpis.py
│       ├── bonus.py          # sistema semestral ~15 endpoints
│       ├── dashboard.py      # NUEVO: 9 endpoints para DashboardEquipo
│       ├── importacion.py
│       ├── informes.py       # /bonus-anual devuelve 410 (reemplazado por semestral)
│       └── notificaciones.py
└── frontend/
    ├── package.json          # React 18, Vite, Tailwind, Recharts, Axios, Router v6
    ├── vite.config.js        # proxy /api → localhost:8000
    ├── tailwind.config.js    # colores gecotex.* definidos aquí
    └── src/
        ├── App.jsx           # Routes con ProtectedRoute por rol
        ├── api/client.js     # Axios + interceptor JWT + todos los *Api exports
        ├── context/
        │   ├── AuthContext.jsx
        │   └── CronometroContext.jsx
        ├── components/
        │   ├── Layout.jsx    # Sidebar con todos los NavItems por rol
        │   ├── ErrorBoundary.jsx
        │   ├── Cronometro.jsx
        │   └── ...
        └── pages/
            ├── Login.jsx
            ├── DashboardOperario.jsx   # Tarjeta "Mi Evaluación" + KPIs personales
            ├── DashboardEquipo.jsx     # REDISEÑADO: 8 bloques, filtro sede, export Excel
            ├── Expedientes.jsx         # Filtros: cliente (todos) + empleado (solo admin)
            ├── ExpedienteDetalle.jsx   # Timeline con fechas editables inline
            ├── ExpedienteForm.jsx      # Campo cliente = select desde catálogo
            ├── ExpedienteFormWizard.jsx # Campo cliente = select desde catálogo
            ├── ImportacionExcel.jsx
            ├── TablaMaestraDUAs.jsx
            ├── Objetivos.jsx
            ├── Clientes.jsx            # NUEVO: CRUD catálogo clientes (coordinador+)
            ├── Bonus.jsx               # Redirige a /evaluaciones-bonus
            ├── MiEvaluacion.jsx        # autoevaluación del empleado
            ├── EvaluacionesBonus.jsx   # tabla director
            ├── FormularioEvalDir.jsx   # evaluación por la dirección
            ├── ConfigBonus.jsx         # config sistema bonus (admin) — layout 2 cols + simulador
            ├── Empleados.jsx           # Incluye selector de sede por operario
            ├── Informes.jsx
            └── Configuracion.jsx
```

---

## Modelo de Datos — Puntos Clave

### Usuario — campo `sede`
```python
class SedeEnum(str, Enum):
    barcelona  = "barcelona"
    valencia   = "valencia"
    aeropuerto = "aeropuerto"
```
El campo `sede` es nullable; se asigna desde la página `/empleados`. El Dashboard Equipo usa este campo para filtrar métricas por sede (`?sede=barcelona`).

### Cliente — catálogo centralizado
```python
class Cliente(Base):
    __tablename__ = "clientes"
    id      = Column(Integer, primary_key=True)
    nombre  = Column(String(200), nullable=False, unique=True)
    nif     = Column(String(20), nullable=True)
    activo  = Column(Boolean, default=True)
```
- `Expediente.cliente_id` es FK nullable hacia `clientes.id`
- `Expediente.cliente_nombre` se mantiene como campo de texto (compatibilidad con datos anteriores y dashboard top-clientes). Cuando se guarda con `cliente_id`, el backend sincroniza `cliente_nombre` automáticamente con el nombre del catálogo.
- El seed crea los 20 clientes del catálogo y asigna `cliente_id` a cada expediente generado.

---

## Sistema de Bonus Semestral

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
GET    /bonus/config/{año}/{semestre}
POST   /bonus/config
PUT    /bonus/config/{id}
GET    /bonus/factores
POST   /bonus/factores
PUT    /bonus/factores/{id}
DELETE /bonus/factores/{id}
POST   /bonus/evaluaciones/iniciar
GET    /bonus/evaluaciones/{año}/{semestre}
GET    /bonus/evaluaciones/mia
GET    /bonus/evaluaciones/{id}
PUT    /bonus/evaluaciones/{id}/auto
PUT    /bonus/evaluaciones/{id}/dir
POST   /bonus/evaluaciones/{id}/cerrar
GET    /bonus/factor-equipo/{año}/{semestre}
GET    /bonus/resumen/{año}/{semestre}
GET    /bonus/exportar/{año}/{semestre}  → Excel
```

---

## Dashboard Equipo — `/equipo`

Rediseñado completamente. Acceso: coordinador+. Filtros globales: año, mes, sede.

### 8 bloques

1. **KPIs globales** — TeamCircle + 4 tarjetas mini (UPs, expedientes, Factor K, tiempo respuesta)
2. **Alertas** — operarios bajo rendimiento o con SLA en rojo
3. **Evolución** — AreaChart UPs + BarChart expedientes por mes
4. **Distribución** — PieChart por tipo tráfico + BarChart por tipo DUA
5. **Ranking** — tabla de operarios con fila expandible (detalle KPIs), ordenada por Factor K
6. **Expedientes en curso** — últimos expedientes activos, auto-refresh cada 5 min
7. **Top clientes** — toggle tabla/gráfico, top 10 por UPs o por expedientes
8. **Heatmap + resumen semanal** — actividad por día de la semana con fila TOTAL

### Endpoints dashboard (prefijo `/api/v1/dashboard`, coordinador+)

```
GET /dashboard/kpis-globales      ?año&mes&sede
GET /dashboard/alertas            ?año&mes&sede
GET /dashboard/evolucion          ?año&mes&sede
GET /dashboard/distribucion       ?año&mes&sede
GET /dashboard/expedientes-en-curso ?año&mes&sede
GET /dashboard/top-clientes       ?año&mes&sede&limite
GET /dashboard/proyeccion         ?año&mes&sede
GET /dashboard/resumen-semanal    ?año&mes&sede
GET /dashboard/exportar-excel     ?año&mes&sede  → blob xlsx
```

### Filtrado por sede
Todos los endpoints de dashboard aceptan `?sede=barcelona|valencia|aeropuerto`. Lógica: obtener IDs de operarios con esa sede → filtrar expedientes por `operario_id IN (ids)`.

---

## Expedientes — Funcionalidades Clave

### Filtros en GET /expedientes
```
?año=2026&mes=6&canal=verde&tipo_trafico=exportacion&cliente_id=5&operario_id=3&skip=0&limit=100
```
- `cliente_id`: server-side, todos los roles autenticados
- `operario_id`: server-side, UI visible solo para admin

### Timeline editable inline (ExpedienteDetalle)
Los 5 nodos de la línea temporal (Recepción, Apertura, Envío Aduana, Levante, Facturación) son editables directamente:
- Hover → icono lápiz en el nodo
- Click → popover flotante con `<input type="datetime-local">` pre-relleno
- Guardar / Enter → `PATCH /expedientes/{id}` con solo ese campo, actualiza estado local
- Escape / clic fuera → cierra sin guardar
- Opción "Borrar fecha" para poner el campo a null
- Los deltas entre fases y alertas SLA se recalculan en tiempo real

### Campos de fecha en Expediente
```python
fecha_recepcion_correo    # nodo 0
fecha_apertura_dossier    # nodo 1
fecha_envio_aduana        # nodo 2
fecha_levante             # nodo 3
fecha_envio_facturacion   # nodo 4
```

---

## Rutas API — Prefijo `/api/v1`

```
POST   /auth/login
GET    /auth/me
GET    /expedientes              ?año&mes&canal&tipo_trafico&cliente_id&operario_id
POST   /expedientes
GET    /expedientes/{id}
PUT    /expedientes/{id}
DELETE /expedientes/{id}
GET    /clientes                 ?solo_activos=true
POST   /clientes                 (coordinador+)
PUT    /clientes/{id}            (coordinador+)
DELETE /clientes/{id}            (coordinador+, soft delete)
GET    /kpis/operario/{id}
GET    /kpis/equipo
GET    /kpis/ranking
GET    /kpis/suficiencia
GET    /dashboard/*              (coordinador+, ver sección Dashboard)
GET    /informes/productividad-mensual  → Excel
GET    /informes/expedientes            → Excel
GET    /informes/bonus-anual            → 410 Gone
```

---

## Lógica de Negocio

### Cálculo UP
```
UP = up_base + (max(0, num_partidas - tramo_partidas_min) × 0.10) + Σ(up_adicional de cada incrementador)
```

### Factor K
```
K = UP_mes / objetivo_UP_mes
```
Objetivos calibrados a 11–16 UP/mes por operario (seed + patch_objetivos.py).

### Rendimiento de equipo (semáforo)
```
Ratio = UP_oferta / UP_demanda
< 0.90 → rojo | 0.90–1.10 → naranja | ≥ 1.10 → verde
```
Nota: anteriormente llamado "Suficiencia" — renombrado a "Rendimiento" en la UI.

---

## Permisos por Rol

| Acción | operario | coordinador | director | admin |
|---|---|---|---|---|
| Ver sus expedientes | ✓ | ✓ | ✓ | ✓ |
| Ver todos los expedientes | — | ✓ | ✓ | ✓ |
| Crear/editar expedientes | ✓ | ✓ | ✓ | ✓ |
| Editar fechas en timeline | ✓ | ✓ | ✓ | ✓ |
| Gestionar DUAs/incrementadores | — | ✓ | ✓ | ✓ |
| Gestionar catálogo clientes | — | ✓ | ✓ | ✓ |
| Ver KPIs equipo/ranking/dashboard | — | ✓ | ✓ | ✓ |
| Filtrar expedientes por empleado (UI) | — | — | — | ✓ |
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

### React — Reglas de Hooks en listas
Al renderizar filas expandibles con `.map()`, usar siempre `<Fragment key={id}>` (no `<>`) para que React rastree correctamente el árbol cuando cambia el número de hijos. Sin key en Fragment → React error #310.

---

## Bugs Resueltos

### React Error #310 — ErrorBoundary
**Fix:** `retryKey` en estado + `<React.Fragment key={retryKey}>` al montar children → React desmonta y remonta el árbol limpio al hacer retry.

### React Error #310 — DashboardEquipo ranking
**Fix:** `<Fragment key={op.operario_id}>` en el `.map()` de filas expandibles del ranking.

### cliente_nombre corrupción en sincronización
Cuando `cliente_id` llega al backend, se sobreescribe `cliente_nombre` con el nombre canónico del catálogo antes de persistir. Así el dashboard "Top clientes" (que agrupa por `cliente_nombre`) no queda fragmentado.

---

## Estado de la BD (gecotex.db)

Seed incluye:
- 8 usuarios con bcrypt (5 operarios con sede asignada)
- 7 tipos DUA + 8 incrementadores
- 20 clientes en catálogo
- Parámetros bonus 2024/2025 (legacy) + ConfigBonusGlobal 2026/S1
- 11 FactoresEvaluacion para áreas 2/3/4
- Evaluación demo en estado 'completada' para Cristian
- Evaluación demo en estado 'auto_evaluacion' para María
- ~270 expedientes con `cliente_id` asignado

**Reset BD:** borrar `backend/gecotex.db` y reiniciar uvicorn.

---

## Notas del Servidor implica.eu (cliente WordPress)

Ver CLAUDE.md raíz del directorio padre para instrucciones completas de SSH, WP-CLI, WPML, y Elementor para el cliente implica.eu.
