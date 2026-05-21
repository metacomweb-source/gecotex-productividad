from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum


class TipoNotificacionEnum(str, enum.Enum):
    info = "info"
    alerta = "alerta"
    logro = "logro"


class Notificacion(Base):
    __tablename__ = "notificaciones"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    titulo = Column(String, nullable=False)
    mensaje = Column(Text, nullable=False)
    tipo = Column(Enum(TipoNotificacionEnum), default=TipoNotificacionEnum.info)
    leida = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())

    usuario = relationship("Usuario", back_populates="notificaciones")
