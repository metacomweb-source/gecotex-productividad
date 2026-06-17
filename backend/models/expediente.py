from sqlalchemy import Column, Integer, String, Boolean, Float, Text, DateTime, Enum, JSON, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum


class CanalEnum(str, enum.Enum):
    verde = "verde"
    naranja = "naranja"
    rojo = "rojo"
    pendiente = "pendiente"


class TipoTraficoCampoEnum(str, enum.Enum):
    exportacion = "exportacion"
    importacion = "importacion"
    regimen_especial = "regimen_especial"


class OrigenEnum(str, enum.Enum):
    manual = "manual"
    importacion_excel = "importacion_excel"


class Expediente(Base):
    __tablename__ = "expedientes"

    id = Column(Integer, primary_key=True, index=True)
    numero_expediente = Column(String, unique=True, nullable=False, index=True)
    operario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    tipo_dua_id = Column(Integer, ForeignKey("tipos_dua.id"), nullable=False)
    cliente_nombre = Column(String, nullable=False)
    tipo_trafico = Column(Enum(TipoTraficoCampoEnum), nullable=False)
    num_partidas = Column(Integer, default=1)
    canal_respuesta = Column(Enum(CanalEnum), default=CanalEnum.pendiente)
    fecha_recepcion_correo = Column(DateTime, nullable=True)
    fecha_apertura_dossier = Column(DateTime, nullable=True)
    fecha_envio_aduana = Column(DateTime, nullable=True)
    fecha_levante = Column(DateTime, nullable=True)
    fecha_envio_facturacion = Column(DateTime, nullable=True)
    servicios_adicionales = Column(JSON, default=list)
    partidas_adicionales_count = Column(Integer, default=0)
    up_calculadas = Column(Float, nullable=True)
    valor_facturacion = Column(Float, nullable=True)
    notas = Column(Text, nullable=True)
    documento_dua_nombre = Column(String, nullable=True)
    origen = Column(Enum(OrigenEnum), default=OrigenEnum.manual)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    operario = relationship("Usuario", back_populates="expedientes", foreign_keys=[operario_id])
    tipo_dua = relationship("TipoDua", back_populates="expedientes")
    sesiones = relationship("SesionTrabajo", back_populates="expediente", cascade="all, delete-orphan")
