from sqlalchemy import Column, Integer, String, Boolean, Text
from database import Base


class FactorEvaluacion(Base):
    __tablename__ = "factores_evaluacion"

    id = Column(Integer, primary_key=True, index=True)
    area = Column(Integer, nullable=False)
    nombre = Column(String, nullable=False)
    descripcion = Column(Text, nullable=True)
    orden = Column(Integer, default=0)
    activo = Column(Boolean, default=True)
    nota_contexto = Column(String, nullable=True)
