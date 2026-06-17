from sqlalchemy import Column, Integer, String, Boolean, Float, Date, DateTime, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum


class RolEnum(str, enum.Enum):
    operario = "operario"
    coordinador = "coordinador"
    director = "director"
    admin = "admin"


class DepartamentoEnum(str, enum.Enum):
    operaciones = "operaciones"
    tecnica = "tecnica"
    comercial = "comercial"
    administracion = "administracion"
    it = "it"
    rrhh = "rrhh"


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    apellidos = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    rol = Column(Enum(RolEnum), nullable=False)
    departamento = Column(String, nullable=True)
    fecha_incorporacion = Column(Date, nullable=True)
    activo = Column(Boolean, default=True)
    jornada_horas_dia = Column(Float, default=8.0)
    salario_bruto_anual = Column(Float, nullable=True)
    pct_maximo_bonus = Column(Float, default=0.05)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    expedientes = relationship("Expediente", back_populates="operario", foreign_keys="Expediente.operario_id")
    sesiones = relationship("SesionTrabajo", back_populates="operario")
    objetivos = relationship("ObjetivoMes", back_populates="operario")
    notificaciones = relationship("Notificacion", back_populates="usuario")
    importaciones = relationship("ImportacionExcel", back_populates="usuario")
