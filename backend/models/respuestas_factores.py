from sqlalchemy import Column, Integer, Float, Text, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class RespuestaFactor(Base):
    __tablename__ = "respuestas_factores"
    __table_args__ = (UniqueConstraint("evaluacion_id", "factor_id", name="uq_respuesta_eval_factor"),)

    id = Column(Integer, primary_key=True, index=True)
    evaluacion_id = Column(Integer, ForeignKey("evaluaciones_bonus.id"), nullable=False)
    factor_id = Column(Integer, ForeignKey("factores_evaluacion.id"), nullable=False)
    nota_auto = Column(Float, nullable=True)
    nota_dir = Column(Float, nullable=True)
    nota_final = Column(Float, nullable=True)
    comentario_auto = Column(Text, nullable=True)
    comentario_dir = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    evaluacion = relationship("EvaluacionBonus", back_populates="respuestas")
    factor = relationship("FactorEvaluacion")
