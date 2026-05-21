# GECOTEX Productividad

Sistema web de gestión de productividad y bonus para **GECOTEX INTERNACIONAL, S.L.** — agencia de aduanas con sedes en Barcelona, Valencia y el aeropuerto de Barcelona.

Mide la productividad de los operarios en **Unidades Ponderadas (UP)**, calcula KPIs, gestiona objetivos mensuales y calcula el Factor K para el sistema de bonificaciones.

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Backend | Python 3.10+ · FastAPI · SQLAlchemy · SQLite |
| Frontend | React 18 · Vite · Tailwind CSS · Recharts |
| Auth | JWT (8h expiración) · bcrypt |
| Excel | openpyxl (exportación) · pandas (importación) |
| PDF | reportlab |

---

## Requisitos previos

- **Python 3.10+** — [python.org](https://python.org)
- **Node.js 18+** — [nodejs.org](https://nodejs.org)
- (Opcional) `pip` y `npm` actualizados

---

## Instalación y arranque

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

El backend arranca en **http://localhost:8000**

Los datos de demostración se cargan automáticamente al primer arranque.

Documentación API (Swagger UI): **http://localhost:8000/docs**

### Frontend

```bash
cd frontend
npm install
npm run dev
```

La aplicación abre en **http://localhost:5173**

---

## Credenciales de demo

| Rol | Email | Contraseña |
|-----|-------|-----------|
| Admin | admin@gecotex.es | admin123 |
| Director | jesus@gecotex.es | demo123 |
| Coordinador | sergio@gecotex.es | demo123 |
| Operario | cristian@gecotex.es | demo123 |
| Operario | maria@gecotex.es | demo123 |
| Operario | jorge@gecotex.es | demo123 |
| Operario | silvia@gecotex.es | demo123 |
| Operario | ana@gecotex.es | demo123 |

---

## Roles y accesos

### Operario
- Dashboard personal con KPIs, Factor K y % bonus
- Registrar y editar sus propios expedientes
- Cronómetro de tiempo real por expediente
- Ver sus objetivos del mes

### Coordinador
- Todo lo del operario, más:
- Dashboard global del equipo con ranking
- Ver y gestionar todos los expedientes
- Tabla maestra de tipos de DUA e incrementadores
- Configurar objetivos mensuales por operario
- Importar ficheros Excel de Tarictrans

### Director
- Todo lo del coordinador, más:
- Configurar parámetros de bonus (Factor K, pesos)
- Ver cálculos de Factor K y % bonus por operario
- Ratio de suficiencia del equipo (semáforo)
- Exportar todos los informes

### Admin
- Acceso total
- Gestión de usuarios (crear, editar, desactivar)
- Configuración general de la aplicación

---

## Estructura del proyecto

```
gecotex-productividad/
├── README.md
├── docker-compose.yml
├── backend/
│   ├── main.py              ← Entrada FastAPI + arranque
│   ├── config.py            ← Configuración (env vars)
│   ├── database.py          ← SQLAlchemy + SQLite
│   ├── auth.py              ← JWT + bcrypt
│   ├── seed.py              ← Datos de demostración
│   ├── models/              ← Modelos SQLAlchemy
│   ├── schemas/             ← Pydantic schemas
│   ├── services/            ← Lógica de negocio
│   │   ├── calculo_up.py    ← Cálculo UP por expediente
│   │   ├── calculo_kpis.py  ← KPIs de productividad
│   │   ├── calculo_bonus.py ← Factor K y % bonus
│   │   ├── importador_excel.py
│   │   └── generador_informes.py
│   ├── routers/             ← Endpoints FastAPI
│   └── requirements.txt
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    └── src/
        ├── App.jsx
        ├── api/client.js    ← Axios + interceptores JWT
        ├── context/         ← Auth + Cronómetro
        ├── components/      ← KpiCard, Semaforo, Layout...
        ├── pages/           ← 13 páginas
        └── utils/           ← calculos.js, formatters.js
```

---

## Lógica de negocio clave

### Cálculo de UP por expediente
```
UP = up_base + (partidas_adicionales × 0.10) + Σ(up_adicional_incrementadores)
```

### Factor K y % Bonus
```
K = UP_mes / objetivo_UP
% bonus_individual = tabla_factor_k[K] × peso_productividad_individual
```

| Rango K | % Bonus |
|---------|---------|
| 0 – 0.70 | 0% |
| 0.70 – 0.85 | 50% |
| 0.85 – 1.00 | 75% |
| 1.00 – 1.20 | 100% |
| > 1.20 | 100% + (K-1) |

### Ratio de suficiencia del equipo
```
Ratio = UP_oferta_mes / UP_demanda_mes
```
- Rojo: < 0.90 → equipo insuficiente
- Naranja: 0.90 – 1.10 → capacidad ajustada
- Verde: ≥ 1.10 → capacidad suficiente

---

## Variables de entorno (opcional)

Crea `backend/.env` para personalizar:

```env
SECRET_KEY=tu-clave-secreta-segura
DATABASE_URL=sqlite:///./gecotex.db
ACCESS_TOKEN_EXPIRE_HOURS=8
```

---

## Docker (opcional)

```bash
docker-compose up --build
```

Accede a **http://localhost:5173** (frontend) y **http://localhost:8000** (API).
