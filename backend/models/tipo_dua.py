from sqlalchemy import Column, Integer, String, Boolean, Float, Text, DateTime, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum


class TipoTraficoEnum(str, enum.Enum):
    exportacion = "exportacion"
    importacion = "importacion"
    regimen_especial = "regimen_especial"


class TipoDua(Base):
    __tablename__ = "tipos_dua"

    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String, unique=True, nullable=False)
    nombre = Column(String, nullable=False)
    descripcion = Column(Text, nullable=True)
    tipo_trafico = Column(Enum(TipoTraficoEnum), nullable=False)
    tramo_partidas_min = Column(Integer, nullable=False)
    tramo_partidas_max = Column(Integer, nullable=True)
    up_base = Column(Float, nullable=False)
    precio_unitario = Column(Float, default=0.0)
    precio_partida_adicional = Column(Float, default=0.0)
    tiempo_estimado_min = Column(Integer, nullable=False)
    tiempo_estimado_max = Column(Integer, nullable=False)
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    expedientes = relationship("Expediente", back_populates="tipo_dua")
