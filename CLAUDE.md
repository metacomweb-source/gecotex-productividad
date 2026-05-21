# GECOTEX Productividad — Estado del Proyecto

Aplicación web full-stack para medir la productividad de operarios de aduanas de GECOTEX INTERNACIONAL, S.L. mediante Unidades Ponderadas (UP), KPIs y bonificaciones Factor K.

## Entorno de Desarrollo

- **Python**: 3.14.5 (importante: NO usar pandas ni reportlab — no compilan en 3.14)
- **Node**: 24.15.0 | **npm**: 11.12.1
- **OS**: Windows 11 PowerShell

## Cómo arrancar (cada vez que abres el terminal)

### Backend

```powershell
cd C:\Users\metac\Desktop\projectes\gecotex-productividad\backend
# Si 'uvicorn' no se reconoce directamente, usar python -m:
python -m uvicorn main:app --reload --port 8000
```

URL: http://localhost:8000 | Swagger: http://localhost:8000/docs

### Frontend

```powershell
cd C:\Users\metac\Desktop\projectes\gecotex-productividad\frontend
npm run dev
```

URL: http://localhost:5173

## Login y Autenticación

El sistema utiliza **bcrypt** para las contraseñas y **JWT** para la sesión.

### Credenciales de Demo (actualizadas)

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

### Depuración de Login
Si el login falla con "Credenciales incorrectas":
1. Revisa la consola donde corre el backend. Se han añadido logs de `DEBUG` que indican si el usuario fue encontrado y si el hash coincide.
2. Si los logs muestran `Usuario no encontrado`, asegúrate de estar ejecutando el backend desde la carpeta `backend/` para que cargue el archivo `gecotex.db` correcto.

## Estructura de Directorios

```
gecotex-productividad/
├── backend/
│   ├── main.py               # Entrada FastAPI, lifespan, CORS, routers
│   ├── config.py             # Settings (pydantic-settings), JWT config
│   ├── database.py           # SQLAlchemy engine + SessionLocal + Base
│   ├── auth.py               # bcrypt hash/verify, JWT create/decode, dependencies
│   ├── seed.py               # Datos iniciales (8 usuarios, 7 DUAs, 200 expedientes)
│   ├── requirements.txt
│   ├── models/
│   │   ├── usuario.py        # RolEnum: admin, director, coordinador, operario
│   │   ├── tipo_dua.py       # up_base, tiempo_estimado_min, tramo_partidas_min
│   │   ├── incrementador.py  # up_adicional para cada incrementador
│   │   ├── expediente.py     # FK usuario+tipo_dua, JSON servicios_adicionales
│   │   ├── sesion_trabajo.py # Cronómetro: activa/pausada/completada
│   │   ├── objetivo_mes.py   # UNIQUE(operario_id, año, mes)
│   │   ├── parametros_bonus.py  # tabla_factor_k como JSON, UNIQUE(año)
│   │   ├── notificacion.py
│   │   ├── importacion_excel.py  # Log de importaciones
│   │   └── __init__.py       # Importa todos los modelos para create_all()
│   ├── schemas/
│   │   ├── usuario.py
│   │   ├── expediente.py
│   │   ├── kpis.py
│   │   └── otros.py          # Sesion, TipoDua, Incrementador, Objetivo, Bonus, etc.
│   ├── services/
│   │   ├── calculo_up.py     # calcular_up(), calcular_partidas_adicionales()
│   │   ├── calculo_kpis.py   # 7 KPIs: UP, tasa ocupación, IRR, incidencias, tiempos
│   │   ├── calculo_bonus.py  # Factor K lookup, % bonus individual
│   │   ├── importador_excel.py  # openpyxl (NO pandas), mapeo flexible, validación
│   │   └── generador_informes.py  # openpyxl para Excel (NO reportlab)
│   └── routers/
│       ├── auth.py           # POST /login, /logout, GET /me
│       ├── usuarios.py       # CRUD usuarios
│       ├── expedientes.py    # CRUD + filtros
│       ├── sesiones.py       # iniciar/pausar/finalizar cronómetro
│       ├── tipos_dua.py      # CRUD tipos DUA
│       ├── incrementadores.py
│       ├── objetivos.py      # Matriz año×operario
│       ├── kpis.py           # /operario/:id, /equipo, /suficiencia, /ranking
│       ├── bonus.py          # Tabla anual, parámetros
│       ├── importacion.py    # preview + ejecutar + historial
│       ├── informes.py       # Descarga Excel (4 informes)
│       └── notificaciones.py
└── frontend/
    ├── package.json          # React 18, Vite, Tailwind, Recharts, Axios, Router v6
    ├── vite.config.js        # proxy /api → localhost:8000
    ├── tailwind.config.js    # colores gecotex.primary, semaforo.verde/naranja/rojo
    └── src/
        ├── App.jsx           # Routes con ProtectedRoute por rol
        ├── api/client.js     # Axios + interceptor JWT + auto-logout 401
        ├── context/
        │   ├── AuthContext.jsx      # JWT localStorage, helpers isAdmin/isOperario
        │   └── CronometroContext.jsx  # tick 1s, sesionActiva en localStorage
        ├── utils/
        │   ├── calculos.js   # calcularUP() — réplica exacta de la lógica backend
        │   └── formatters.js # fechas ES, minutos→horas, %, colores Factor K
        ├── components/
        │   ├── Layout.jsx    # Sidebar + bottom nav mobile + breadcrumbs
        │   ├── Cronometro.jsx  # Widget flotante HH:MM:SS
        │   ├── KpiCard.jsx, Semaforo.jsx, ProgressBar.jsx, ModalConfirm.jsx
        └── pages/
            ├── Login.jsx
            ├── DashboardOperario.jsx   # 6 KPI cards + gráficos + expedientes recientes
            ├── DashboardEquipo.jsx     # Ratio suficiencia + ranking + mapa calor
            ├── Expedientes.jsx         # Lista + filtros + búsqueda + exportar Excel
            ├── ExpedienteDetalle.jsx   # Timeline + sesiones cronómetro
            ├── ExpedienteForm.jsx      # Formulario con preview UP en tiempo real
            ├── ImportacionExcel.jsx    # Wizard 4 pasos (upload→mapeo→validar→import)
            ├── TablaMaestraDUAs.jsx    # Edición inline DUAs e incrementadores
            ├── Objetivos.jsx           # Matriz operarios × meses
            ├── Bonus.jsx               # Factor K + parámetros bonus
            ├── Empleados.jsx
            ├── Informes.jsx            # Descarga 4 tipos de informes
            └── Configuracion.jsx
```

## Lógica de Negocio

### Cálculo UP
```
UP = up_base + (max(0, num_partidas - tramo_partidas_min) × 0.10) + Σ(up_adicional de cada incrementador)
```

### Factor K y Bonus
```
K = UP_mes / objetivo_UP
% bonus = tabla_factor_k lookup por tramo de K
Tramo K > 1.20: porcentaje = 1.00 + (K - 1.00)
```

### Ratio Suficiencia (semáforo equipo)
```
Ratio = UP_oferta / UP_demanda
< 0.90 → rojo | 0.90–1.10 → naranja | ≥ 1.10 → verde
```

### Capacidad Teórica Mensual
```
CT = (horas_jornada × días_laborables × 60) × factor_disponibilidad / tiempo_up_base_min
```

## Tipos DUA (seed)

| Código | Descripción | UP base | Tiempo (min) |
|---|---|---|---|
| EXP-B | Exportación Básica | 1.0 | 45 |
| EXP-C | Exportación Compleja | 1.5 | 70 |
| IMP-B | Importación Básica | 1.2 | 55 |
| IMP-C | Importación Compleja | 1.8 | 85 |
| TRA | Tránsito | 0.8 | 35 |
| REG | Régimen Especial | 2.0 | 95 |
| REG-ESP | Régimen Especial Complejo | 2.5 | 120 |

## Incrementadores (seed)

| Código | UP adicional |
|---|---|
| INC-PART | +0.10 por partida adicional |
| INC-SOIBRE | +0.30 |
| INC-SAN | +0.50 |
| INC-FAR | +0.50 |
| INC-NAR | +0.20 |
| INC-ROJ | +0.30 |
| INC-RF | +0.40 |
| INC-GAR | +0.25 |

## Permisos por Rol

| Acción | operario | coordinador | director | admin |
|---|---|---|---|---|
| Ver sus expedientes | ✓ | ✓ | ✓ | ✓ |
| Ver todos los expedientes | — | ✓ | ✓ | ✓ |
| Crear/editar expedientes | ✓ | ✓ | ✓ | ✓ |
| Gestionar DUAs/incrementadores | — | ✓ | ✓ | ✓ |
| Ver KPIs equipo/ranking | — | ✓ | ✓ | ✓ |
| Configurar bonus/objetivos | — | — | ✓ | ✓ |
| Gestionar usuarios | — | — | — | ✓ |

## Compatibilidades Críticas (NO cambiar)

### Python 3.14 — paquetes incompatibles eliminados
- **pandas**: NO — intenta compilar extensiones C con MSVC (no instalado). Reemplazado por `openpyxl` puro en `importador_excel.py`.
- **reportlab**: NO — misma razón. Los informes PDF se generan como Excel con `openpyxl`.
- **passlib**: NO — incompatible con bcrypt >= 5.x (`bcrypt.__about__.__version__` no existe). Reemplazado por `bcrypt` directo en `auth.py`.

### FastAPI 0.136 + Starlette 1.0 — patrón lifespan obligatorio
`@app.on_event("startup")` causa recursión infinita en `merged_lifespan`. El `main.py` usa el patrón correcto:
```python
from contextlib import asynccontextmanager
@asynccontextmanager
async def lifespan(app: FastAPI):
    create_tables()
    ...
    yield
app = FastAPI(..., lifespan=lifespan)
```
**No revertir a `@app.on_event`.**

## Estado Actual de la BD (gecotex.db)

Al primer arranque, `seed.py` crea automáticamente:
- 8 usuarios con contraseñas bcrypt
- 7 tipos DUA + 8 incrementadores
- Parámetros bonus 2024 y 2025 con tabla Factor K
- Objetivos mensuales para los últimos 3 meses + mes actual
- ~200 expedientes distribuidos en 3 meses (65% exportación / 35% importación, 60% verde / 25% naranja / 15% rojo)

Si quieres resetear la BD: borrar `backend/gecotex.db` y reiniciar uvicorn.

## Rutas API Principales

Prefijo: `/api/v1`

```
POST   /auth/login              → { access_token, token_type, usuario }
GET    /auth/me                 → usuario actual
GET    /expedientes             → lista paginada (filtros: operario_id, mes, año, canal, tipo_trafico)
POST   /expedientes             → crear expediente
GET    /kpis/operario/{id}      → 7 KPIs del operario (mes, año params)
GET    /kpis/equipo             → KPIs agregados del equipo
GET    /kpis/ranking            → lista operarios ordenados por UP
GET    /kpis/suficiencia        → ratio UP_oferta/UP_demanda
GET    /bonus/tabla/{año}       → tabla bonus anual todos los operarios
POST   /importacion/preview     → columnas + 5 filas preview del Excel
POST   /importacion/ejecutar    → importar con mapeo confirmado
GET    /informes/disponibles    → lista de informes descargables
GET    /informes/descargar/{tipo} → Excel descargable
```

## Correcciones Recientes

### Frontend
- **Solucionado White Screen**: Se ha corregido un `ReferenceError: Timer is not defined` en `DashboardOperario.jsx` añadiendo la importación de `Timer` desde `lucide-react`. La aplicación ahora carga correctamente tras el login.

## Pendiente / Mejoras Futuras

- Informes en PDF (requeriría instalar MSVC o usar WeasyPrint/xhtml2pdf)
- Tests unitarios (pytest)
- Docker (hay un docker-compose.yml esqueleto)
- Notificaciones push en tiempo real (WebSockets)
- Página Configuracion.jsx — funcionalidad básica pendiente de conectar al backend
