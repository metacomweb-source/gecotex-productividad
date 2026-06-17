from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Cliente(Base):
    __tablename__ = "clientes"

    id         = Column(Integer, primary_key=True, index=True)
    nombre     = Column(String(200), nullable=False, unique=True)
    nif        = Column(String(20), nullable=True)
    activo     = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

    expedientes = relationship("Expediente", back_populates="cliente_rel")
