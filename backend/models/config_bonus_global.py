from sqlalchemy import Column, Integer, Float, Boolean, Date, DateTime, JSON, UniqueConstraint
from sqlalchemy.sql import func
from database import Base

DEFAULT_TRAMOS = [
    {"p_min": 0.0,  "p_max": 5.0,  "porcentaje": 0.00},
    {"p_min": 5.0,  "p_max": 7.0,  "porcentaje": 0.25},
    {"p_min": 7.0,  "p_max": 8.5,  "porcentaje": 0.60},
    {"p_min": 8.5,  "p_max": 10.1, "porcentaje": 1.00},
]

DEFAULT_CONFIG_AREA1 = {
    "peso_factor_k": 0.50,
    "peso_sla": 0.30,
    "peso_registro": 0.20,
    "sla_horas": 2.0,
    "tabla_conversion_k": [
        {"k_min": 0.00, "k_max": 0.70, "puntuacion": 3.0},
        {"k_min": 0.70, "k_max": 0.85, "puntuacion": 5.0},
        {"k_min": 0.85, "k_max": 1.00, "puntuacion": 7.5},
        {"k_min": 1.00, "k_max": 1.00, "puntuacion": 9.0},
    ],
    "tabla_conversion_pct": [
        {"pct_min": 0,  "pct_max": 60,  "puntuacion": 3.0},
        {"pct_min": 60, "pct_max": 75,  "puntuacion": 5.0},
        {"pct_min": 75, "pct_max": 85,  "puntuacion": 7.0},
        {"pct_min": 85, "pct_max": 95,  "puntuacion": 8.5},
        {"pct_min": 95, "pct_max": 101, "puntuacion": 10.0},
    ],
}


class ConfigBonusGlobal(Base):
    __tablename__ = "config_bonus_global"
    __table_args__ = (UniqueConstraint("año", "semestre", name="uq_config_año_semestre"),)

    id = Column(Integer, primary_key=True, index=True)
    año = Column(Integer, nullable=False)
    semestre = Column(Integer, nullable=False)
    fecha_inicio = Column(Date, nullable=False)
    fecha_fin = Column(Date, nullable=False)
    antiguedad_minima_meses = Column(Integer, default=12)
    factor_equipo_activo = Column(Boolean, default=True)
    factor_equipo_porcentaje = Column(Float, default=0.05)
    factor_equipo_meses_minimos = Column(Integer, default=4)
    peso_area1 = Column(Float, default=0.40)
    peso_area2 = Column(Float, default=0.30)
    peso_area3 = Column(Float, default=0.20)
    peso_area4 = Column(Float, default=0.10)
    peso_auto_evaluacion = Column(Float, default=0.30)
    peso_dir_evaluacion = Column(Float, default=0.70)
    tabla_tramos_escalonados = Column(JSON, default=lambda: DEFAULT_TRAMOS)
    config_area1 = Column(JSON, default=lambda: DEFAULT_CONFIG_AREA1)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
