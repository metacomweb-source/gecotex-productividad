import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import create_tables, SessionLocal
from config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_tables()
    db = SessionLocal()
    try:
        from seed import cargar_seed
        cargar_seed(db)
    except Exception as e:
        print(f"[seed] Error no fatal: {e}")
    finally:
        db.close()
    from patch_factores import patch as patch_factores
    patch_factores()
    from patch_objetivos import patch as patch_objetivos
    patch_objetivos()
    yield


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="Sistema de gestión de productividad y bonus para GECOTEX INTERNACIONAL, S.L.",
    lifespan=lifespan,
)

_default_origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
]
_extra = os.getenv("ALLOWED_ORIGINS", "")
_allowed_origins = _default_origins + [o.strip() for o in _extra.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from routers import auth, usuarios, expedientes, sesiones, tipos_dua, incrementadores, objetivos, kpis, bonus, importacion, informes, notificaciones, configuracion, dashboard, clientes, empleados_dashboard

app.include_router(auth.router, prefix="/api/v1")
app.include_router(usuarios.router, prefix="/api/v1")
app.include_router(expedientes.router, prefix="/api/v1")
app.include_router(sesiones.router, prefix="/api/v1")
app.include_router(tipos_dua.router, prefix="/api/v1")
app.include_router(incrementadores.router, prefix="/api/v1")
app.include_router(objetivos.router, prefix="/api/v1")
app.include_router(kpis.router, prefix="/api/v1")
app.include_router(bonus.router, prefix="/api/v1")
app.include_router(importacion.router, prefix="/api/v1")
app.include_router(informes.router, prefix="/api/v1")
app.include_router(notificaciones.router, prefix="/api/v1")
app.include_router(configuracion.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")
app.include_router(clientes.router, prefix="/api/v1")
app.include_router(empleados_dashboard.router, prefix="/api/v1")


@app.get("/")
def root():
    return {"message": "GECOTEX Productividad API", "version": "1.0.0", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "ok"}
