from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class ObjetivoMes(Base):
    __tablename__ = "objetivos_mes"

    id = Column(Integer, primary_key=True, index=True)
    operario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    año = Column(Integer, nullable=False)
    mes = Column(Integer, nullable=False)
    objetivo_up = Column(Float, nullable=False)
    objetivo_tiempo_respuesta_horas = Column(Float, nullable=True)
    objetivo_tasa_incidencia_max = Column(Float, nullable=True)
    objetivo_tiempo_facturacion_horas = Column(Float, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    operario = relationship("Usuario", back_populates="objetivos")

    __table_args__ = (UniqueConstraint("operario_id", "año", "mes", name="uq_objetivo_operario_mes"),)
