from sqlalchemy import Column, Integer, Float, DateTime, JSON, UniqueConstraint
from sqlalchemy.sql import func
from database import Base


class ParametrosBonus(Base):
    __tablename__ = "parametros_bonus"

    id = Column(Integer, primary_key=True, index=True)
    año = Column(Integer, nullable=False)
    objetivo_crecimiento_facturacion = Column(Float, default=0.15)
    factor_disponibilidad = Column(Float, default=0.70)
    antiguedad_minima_meses = Column(Integer, default=12)
    peso_productividad_individual = Column(Float, default=0.40)
    peso_resultado_global = Column(Float, default=0.60)
    tabla_factor_k = Column(JSON, default=list)
    created_at = Column(DateTime, server_default=func.now())

    __table_args__ = (UniqueConstraint("año", name="uq_parametros_año"),)


DEFAULT_TABLA_FACTOR_K = [
    {"k_min": 0, "k_max": 0.70, "porcentaje_bonus": 0},
    {"k_min": 0.70, "k_max": 0.85, "porcentaje_bonus": 0.50},
    {"k_min": 0.85, "k_max": 1.00, "porcentaje_bonus": 0.75},
    {"k_min": 1.00, "k_max": 1.20, "porcentaje_bonus": 1.00},
    {"k_min": 1.20, "k_max": None, "porcentaje_bonus": "1.00 + (K-1)"},
]
