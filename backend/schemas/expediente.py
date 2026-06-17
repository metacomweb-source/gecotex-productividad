from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from models.expediente import CanalEnum, OrigenEnum, TipoTraficoCampoEnum


class ExpedienteBase(BaseModel):
    numero_expediente: str
    tipo_dua_id: int
    cliente_nombre: str
    tipo_trafico: TipoTraficoCampoEnum
    num_partidas: int = 1
    canal_respuesta: CanalEnum = CanalEnum.pendiente
    fecha_recepcion_correo: Optional[datetime] = None
    fecha_apertura_dossier: Optional[datetime] = None
    fecha_envio_aduana: Optional[datetime] = None
    fecha_levante: Optional[datetime] = None
    fecha_envio_facturacion: Optional[datetime] = None
    servicios_adicionales: List[int] = []
    notas: Optional[str] = None


class ExpedienteCreate(ExpedienteBase):
    operario_id: Optional[int] = None


class ExpedienteUpdate(BaseModel):
    tipo_dua_id: Optional[int] = None
    cliente_nombre: Optional[str] = None
    tipo_trafico: Optional[TipoTraficoCampoEnum] = None
    num_partidas: Optional[int] = None
    canal_respuesta: Optional[CanalEnum] = None
    fecha_recepcion_correo: Optional[datetime] = None
    fecha_apertura_dossier: Optional[datetime] = None
    fecha_envio_aduana: Optional[datetime] = None
    fecha_levante: Optional[datetime] = None
    fecha_envio_facturacion: Optional[datetime] = None
    servicios_adicionales: Optional[List[int]] = None
    notas: Optional[str] = None
    operario_id: Optional[int] = None


class ExpedienteResponse(ExpedienteBase):
    id: int
    operario_id: int
    partidas_adicionales_count: int
    up_calculadas: Optional[float] = None
    valor_facturacion: Optional[float] = None
    origen: OrigenEnum
    created_at: datetime
    updated_at: Optional[datetime] = None
    documento_dua_nombre: Optional[str] = None
    operario_nombre: Optional[str] = None
    tipo_dua_nombre: Optional[str] = None

    class Config:
        from_attributes = True
