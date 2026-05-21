from sqlalchemy import Column, Integer, String, Boolean, Float, Text
from database import Base


class Incrementador(Base):
    __tablename__ = "incrementadores"

    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String, unique=True, nullable=False)
    nombre = Column(String, nullable=False)
    descripcion = Column(Text, nullable=True)
    up_adicional = Column(Float, nullable=False)
    precio_unitario = Column(Float, default=0.0)
    activo = Column(Boolean, default=True)
