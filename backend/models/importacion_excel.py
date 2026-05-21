from sqlalchemy import Column, Integer, String, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class ImportacionExcel(Base):
    __tablename__ = "importaciones_excel"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    nombre_fichero = Column(String, nullable=False)
    fecha_importacion = Column(DateTime, server_default=func.now())
    registros_totales = Column(Integer, default=0)
    registros_importados = Column(Integer, default=0)
    registros_con_error = Column(Integer, default=0)
    log_errores = Column(JSON, default=list)
    created_at = Column(DateTime, server_default=func.now())

    usuario = relationship("Usuario", back_populates="importaciones")
