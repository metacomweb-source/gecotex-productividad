from sqlalchemy import Column, Integer, Float, Text, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum


class EstadoSesionEnum(str, enum.Enum):
    activa = "activa"
    pausada = "pausada"
    completada = "completada"


class SesionTrabajo(Base):
    __tablename__ = "sesiones_trabajo"

    id = Column(Integer, primary_key=True, index=True)
    expediente_id = Column(Integer, ForeignKey("expedientes.id"), nullable=False)
    operario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    inicio = Column(DateTime, nullable=False)
    fin = Column(DateTime, nullable=True)
    duracion_minutos = Column(Float, nullable=True)
    estado = Column(Enum(EstadoSesionEnum), default=EstadoSesionEnum.activa)
    notas = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    expediente = relationship("Expediente", back_populates="sesiones")
    operario = relationship("Usuario", back_populates="sesiones")
