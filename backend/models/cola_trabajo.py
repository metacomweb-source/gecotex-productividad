from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum


class PrioridadColaEnum(str, enum.Enum):
    urgente = "urgente"
    normal = "normal"
    puede_esperar = "puede_esperar"


class EstadoColaEnum(str, enum.Enum):
    pendiente = "pendiente"
    en_curso = "en_curso"
    completado = "completado"
    cancelado = "cancelado"


class ColaTrabajo(Base):
    __tablename__ = "cola_trabajo"

    id                     = Column(Integer, primary_key=True, index=True)
    expediente_id          = Column(Integer, ForeignKey("expedientes.id"), nullable=True)
    numero_expediente_tari = Column(String(50), nullable=True)
    cliente_nombre         = Column(String(200), nullable=True)
    descripcion            = Column(Text, nullable=False)
    tipo_trafico           = Column(String(50), nullable=True)
    prioridad              = Column(Enum(PrioridadColaEnum), default=PrioridadColaEnum.normal)
    asignado_a             = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    asignado_por           = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    fecha_limite           = Column(DateTime, nullable=True)
    estado                 = Column(Enum(EstadoColaEnum), default=EstadoColaEnum.pendiente)
    orden                  = Column(Integer, default=0)
    notas_coordinador      = Column(Text, nullable=True)
    notas_operario         = Column(Text, nullable=True)
    sede                   = Column(String(50), nullable=True)
    created_at             = Column(DateTime, server_default=func.now())
    updated_at             = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # explicit foreign_keys para evitar ambigüedad con dos FK a usuarios
    asignado_a_rel   = relationship("Usuario", foreign_keys=[asignado_a],   backref="cola_asignada")
    asignado_por_rel = relationship("Usuario", foreign_keys=[asignado_por], backref="cola_creada")
    expediente_rel   = relationship("Expediente", backref="cola_items")
