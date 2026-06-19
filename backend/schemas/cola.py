from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from models.cola_trabajo import PrioridadColaEnum, EstadoColaEnum


class ColaCreate(BaseModel):
    descripcion: str
    prioridad: PrioridadColaEnum = PrioridadColaEnum.normal
    expediente_id: Optional[int] = None
    numero_expediente_tari: Optional[str] = None
    cliente_nombre: Optional[str] = None
    tipo_trafico: Optional[str] = None
    asignado_a: Optional[int] = None
    fecha_limite: Optional[datetime] = None
    notas_coordinador: Optional[str] = None
    sede: Optional[str] = None


class ColaUpdate(BaseModel):
    descripcion: Optional[str] = None
    prioridad: Optional[PrioridadColaEnum] = None
    expediente_id: Optional[int] = None
    numero_expediente_tari: Optional[str] = None
    cliente_nombre: Optional[str] = None
    tipo_trafico: Optional[str] = None
    asignado_a: Optional[int] = None
    fecha_limite: Optional[datetime] = None
    estado: Optional[EstadoColaEnum] = None
    notas_coordinador: Optional[str] = None
    notas_operario: Optional[str] = None
    sede: Optional[str] = None


class ColaAsignarRequest(BaseModel):
    asignado_a: int


class ColaEstadoRequest(BaseModel):
    estado: EstadoColaEnum
    notas_operario: Optional[str] = None


class ColaReordenarItem(BaseModel):
    id: int
    orden: int


class ColaReordenarRequest(BaseModel):
    items: List[ColaReordenarItem]


class ColaResponse(BaseModel):
    id: int
    expediente_id: Optional[int] = None
    numero_expediente_tari: Optional[str] = None
    cliente_nombre: Optional[str] = None
    descripcion: str
    tipo_trafico: Optional[str] = None
    prioridad: PrioridadColaEnum
    asignado_a: Optional[int] = None
    asignado_por: int
    fecha_limite: Optional[datetime] = None
    estado: EstadoColaEnum
    orden: int
    notas_coordinador: Optional[str] = None
    notas_operario: Optional[str] = None
    sede: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    asignado_a_nombre: Optional[str] = None
    asignado_por_nombre: Optional[str] = None

    class Config:
        from_attributes = True
