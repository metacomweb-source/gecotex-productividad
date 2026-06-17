from sqlalchemy import Column, Integer, String, Boolean, Float
from database import Base


class Configuracion(Base):
    __tablename__ = "configuracion"

    id = Column(Integer, primary_key=True, index=True)
    nombre_empresa = Column(String, default="GECOTEX INTERNACIONAL, S.L.")
    zona_horaria = Column(String, default="Europe/Madrid")
    notif_dias_sin_expedientes = Column(Boolean, default=True)
    notif_sobrecarga = Column(Boolean, default=True)
    notif_tiempo_respuesta = Column(Boolean, default=True)
    notif_objetivo_bajo = Column(Boolean, default=True)
    dias_umbral_sin_expedientes = Column(Integer, default=3)
    umbral_ocupacion = Column(Integer, default=110)
