from sqlalchemy import Column, Integer, String, Boolean, Float, Text, DateTime, Enum, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum


class EstadoEvaluacionEnum(str, enum.Enum):
    borrador = "borrador"
    auto_evaluacion = "auto_evaluacion"
    evaluacion_dir = "evaluacion_dir"
    completada = "completada"
    cerrada = "cerrada"


class EvaluacionBonus(Base):
    __tablename__ = "evaluaciones_bonus"
    __table_args__ = (UniqueConstraint("empleado_id", "año", "semestre", name="uq_eval_empleado_periodo"),)

    id = Column(Integer, primary_key=True, index=True)
    empleado_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    config_id = Column(Integer, ForeignKey("config_bonus_global.id"), nullable=False)
    año = Column(Integer, nullable=False)
    semestre = Column(Integer, nullable=False)
    estado = Column(Enum(EstadoEvaluacionEnum), default=EstadoEvaluacionEnum.borrador, nullable=False)

    salario_bruto_anual = Column(Float, nullable=True)
    pct_maximo_bonus = Column(Float, default=0.05)

    # Área 1 — calculada automáticamente
    factor_k_promedio = Column(Float, nullable=True)
    pct_sla = Column(Float, nullable=True)
    pct_registro = Column(Float, nullable=True)
    puntuacion_area1 = Column(Float, nullable=True)

    # Área 2
    notas_empleado_area2 = Column(Text, nullable=True)
    notas_director_area2 = Column(Text, nullable=True)
    puntuacion_area2 = Column(Float, nullable=True)

    # Área 3
    notas_empleado_area3 = Column(Text, nullable=True)
    notas_director_area3 = Column(Text, nullable=True)
    puntuacion_area3 = Column(Float, nullable=True)

    # Área 4
    notas_empleado_area4 = Column(Text, nullable=True)
    notas_director_area4 = Column(Text, nullable=True)
    puntuacion_area4 = Column(Float, nullable=True)

    puntuacion_total = Column(Float, nullable=True)
    factor_equipo_aplicado = Column(Boolean, nullable=True)
    porcentaje_tramo = Column(Float, nullable=True)
    bonus_semestral_euros = Column(Float, nullable=True)

    fecha_inicio_auto_eval = Column(DateTime, nullable=True)
    fecha_fin_auto_eval = Column(DateTime, nullable=True)
    fecha_inicio_eval_dir = Column(DateTime, nullable=True)
    fecha_cierre = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    empleado = relationship("Usuario", foreign_keys=[empleado_id])
    respuestas = relationship("RespuestaFactor", back_populates="evaluacion", cascade="all, delete-orphan")
