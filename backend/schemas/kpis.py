from pydantic import BaseModel
from typing import Optional, List


class KpiOperarioResponse(BaseModel):
    operario_id: int
    operario_nombre: str
    año: int
    mes: int
    up_producidas: float
    objetivo_up: Optional[float] = None
    pct_cumplimiento: Optional[float] = None
    factor_k: Optional[float] = None
    bonus_pct: Optional[float] = None
    num_expedientes: int
    tasa_ocupacion: Optional[float] = None
    irr: Optional[float] = None
    tiempo_medio_tramitacion_min: Optional[float] = None
    tiempo_medio_respuesta_min: Optional[float] = None
    tiempo_medio_facturacion_horas: Optional[float] = None


class KpiEquipoResponse(BaseModel):
    año: int
    mes: int
    total_up_producidas: float
    total_up_objetivo: float
    pct_cumplimiento_global: float
    num_expedientes_total: int
    ratio_suficiencia: Optional[float] = None
    operarios: List[KpiOperarioResponse] = []


class RankingItem(BaseModel):
    posicion: int
    operario_id: int
    operario_nombre: str
    up_producidas: float
    objetivo_up: Optional[float] = None
    factor_k: Optional[float] = None
    pct_cumplimiento: Optional[float] = None
    num_expedientes: int
    tendencia: Optional[str] = None


class SuficienciaResponse(BaseModel):
    año: int
    mes: int
    up_demanda: float
    up_oferta: float
    ratio: float
    semaforo: str
    num_operarios_activos: int
