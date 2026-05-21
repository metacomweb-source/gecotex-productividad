from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime
from models.sesion_trabajo import EstadoSesionEnum
from models.notificacion import TipoNotificacionEnum


class TipoDuaBase(BaseModel):
    codigo: str
    nombre: str
    descripcion: Optional[str] = None
    tipo_trafico: str
    tramo_partidas_min: int
    tramo_partidas_max: Optional[int] = None
    up_base: float
    precio_unitario: float = 0.0
    precio_partida_adicional: float = 0.0
    tiempo_estimado_min: int
    tiempo_estimado_max: int
    activo: bool = True


class TipoDuaCreate(TipoDuaBase):
    pass


class TipoDuaUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    up_base: Optional[float] = None
    precio_unitario: Optional[float] = None
    precio_partida_adicional: Optional[float] = None
    tiempo_estimado_min: Optional[int] = None
    tiempo_estimado_max: Optional[int] = None
    activo: Optional[bool] = None
    tramo_partidas_min: Optional[int] = None
    tramo_partidas_max: Optional[int] = None


class TipoDuaResponse(TipoDuaBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class IncrementadorBase(BaseModel):
    codigo: str
    nombre: str
    descripcion: Optional[str] = None
    up_adicional: float
    precio_unitario: float = 0.0
    activo: bool = True


class IncrementadorCreate(IncrementadorBase):
    pass


class IncrementadorUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    up_adicional: Optional[float] = None
    precio_unitario: Optional[float] = None
    activo: Optional[bool] = None


class IncrementadorResponse(IncrementadorBase):
    id: int

    class Config:
        from_attributes = True


class SesionTrabajoResponse(BaseModel):
    id: int
    expediente_id: int
    operario_id: int
    inicio: datetime
    fin: Optional[datetime] = None
    duracion_minutos: Optional[float] = None
    estado: EstadoSesionEnum
    notas: Optional[str] = None

    class Config:
        from_attributes = True


class ObjetivoMesBase(BaseModel):
    operario_id: int
    año: int
    mes: int
    objetivo_up: float
    objetivo_tiempo_respuesta_horas: Optional[float] = None
    objetivo_tasa_incidencia_max: Optional[float] = None
    objetivo_tiempo_facturacion_horas: Optional[float] = None


class ObjetivoMesCreate(ObjetivoMesBase):
    pass


class ObjetivoMesUpdate(BaseModel):
    objetivo_up: Optional[float] = None
    objetivo_tiempo_respuesta_horas: Optional[float] = None
    objetivo_tasa_incidencia_max: Optional[float] = None
    objetivo_tiempo_facturacion_horas: Optional[float] = None


class ObjetivoMesResponse(ObjetivoMesBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ParametrosBonusBase(BaseModel):
    año: int
    objetivo_crecimiento_facturacion: float = 0.15
    factor_disponibilidad: float = 0.70
    antiguedad_minima_meses: int = 12
    peso_productividad_individual: float = 0.40
    peso_resultado_global: float = 0.60
    tabla_factor_k: List[Any] = []


class ParametrosBonusCreate(ParametrosBonusBase):
    pass


class ParametrosBonusUpdate(BaseModel):
    objetivo_crecimiento_facturacion: Optional[float] = None
    factor_disponibilidad: Optional[float] = None
    antiguedad_minima_meses: Optional[int] = None
    peso_productividad_individual: Optional[float] = None
    peso_resultado_global: Optional[float] = None
    tabla_factor_k: Optional[List[Any]] = None


class ParametrosBonusResponse(ParametrosBonusBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class BonusOperarioResponse(BaseModel):
    operario_id: int
    operario_nombre: str
    antiguedad_meses: int
    elegible: bool
    up_producidas: float
    objetivo_up: float
    factor_k: float
    porcentaje_bonus_productividad: float
    bonus_individual_pct: float


class NotificacionResponse(BaseModel):
    id: int
    usuario_id: int
    titulo: str
    mensaje: str
    tipo: TipoNotificacionEnum
    leida: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ImportacionPreviewResponse(BaseModel):
    columnas_detectadas: List[str]
    mapeo_sugerido: dict
    preview_filas: List[dict]
    total_filas: int


class ImportacionEjecutarRequest(BaseModel):
    mapeo_columnas: dict
    accion_duplicados: str = "ignorar"


class ImportacionResultadoResponse(BaseModel):
    importados: int
    actualizados: int
    ignorados: int
    con_error: int
    errores: List[dict]
    importacion_id: int
