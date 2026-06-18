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


class ConfiguracionResponse(BaseModel):
    id: int
    nombre_empresa: str
    zona_horaria: str
    notif_dias_sin_expedientes: bool
    notif_sobrecarga: bool
    notif_tiempo_respuesta: bool
    notif_objetivo_bajo: bool
    dias_umbral_sin_expedientes: int
    umbral_ocupacion: int

    class Config:
        from_attributes = True


class ConfiguracionUpdate(BaseModel):
    nombre_empresa: Optional[str] = None
    zona_horaria: Optional[str] = None
    notif_dias_sin_expedientes: Optional[bool] = None
    notif_sobrecarga: Optional[bool] = None
    notif_tiempo_respuesta: Optional[bool] = None
    notif_objetivo_bajo: Optional[bool] = None
    dias_umbral_sin_expedientes: Optional[int] = None
    umbral_ocupacion: Optional[int] = None


# ─── NUEVO SISTEMA DE BONUS ────────────────────────────────────────────────

class ConfigBonusCreate(BaseModel):
    año: int
    semestre: int
    fecha_inicio: str
    fecha_fin: str
    antiguedad_minima_meses: int = 12
    factor_equipo_activo: bool = True
    factor_equipo_porcentaje: float = 0.05
    factor_equipo_meses_minimos: int = 4
    peso_area1: float = 0.40
    peso_area2: float = 0.30
    peso_area3: float = 0.20
    peso_area4: float = 0.10
    peso_auto_evaluacion: float = 0.30
    peso_dir_evaluacion: float = 0.70
    tabla_tramos_escalonados: Optional[List[Any]] = None
    config_area1: Optional[Any] = None


class ConfigBonusUpdate(BaseModel):
    fecha_inicio: Optional[str] = None
    fecha_fin: Optional[str] = None
    antiguedad_minima_meses: Optional[int] = None
    factor_equipo_activo: Optional[bool] = None
    factor_equipo_porcentaje: Optional[float] = None
    factor_equipo_meses_minimos: Optional[int] = None
    peso_area1: Optional[float] = None
    peso_area2: Optional[float] = None
    peso_area3: Optional[float] = None
    peso_area4: Optional[float] = None
    peso_auto_evaluacion: Optional[float] = None
    peso_dir_evaluacion: Optional[float] = None
    tabla_tramos_escalonados: Optional[List[Any]] = None
    config_area1: Optional[Any] = None


class ConfigBonusResponse(BaseModel):
    id: int
    año: int
    semestre: int
    fecha_inicio: str
    fecha_fin: str
    antiguedad_minima_meses: int
    factor_equipo_activo: bool
    factor_equipo_porcentaje: float
    factor_equipo_meses_minimos: int
    peso_area1: float
    peso_area2: float
    peso_area3: float
    peso_area4: float
    peso_auto_evaluacion: float
    peso_dir_evaluacion: float
    tabla_tramos_escalonados: List[Any]
    config_area1: Any

    class Config:
        from_attributes = True


class FactorEvaluacionResponse(BaseModel):
    id: int
    area: int
    nombre: str
    descripcion: Optional[str]
    orden: int
    activo: bool
    nota_contexto: Optional[str]
    descripciones_niveles: Optional[Any] = None
    peso: Optional[float] = None

    class Config:
        from_attributes = True


class FactorEvaluacionCreate(BaseModel):
    area: int
    nombre: str
    descripcion: Optional[str] = None
    orden: int = 0
    nota_contexto: Optional[str] = None
    descripciones_niveles: Optional[Any] = None
    peso: Optional[float] = None


class FactorEvaluacionUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    orden: Optional[int] = None
    activo: Optional[bool] = None
    nota_contexto: Optional[str] = None
    descripciones_niveles: Optional[Any] = None
    peso: Optional[float] = None


class RespuestaFactorItem(BaseModel):
    factor_id: int
    nota_auto: Optional[float] = None
    nota_dir: Optional[float] = None
    comentario_auto: Optional[str] = None
    comentario_dir: Optional[str] = None


class RespuestaFactorResponse(BaseModel):
    id: int
    evaluacion_id: int
    factor_id: int
    nota_auto: Optional[float]
    nota_dir: Optional[float]
    nota_final: Optional[float]
    comentario_auto: Optional[str]
    comentario_dir: Optional[str]

    class Config:
        from_attributes = True


class AutoEvaluacionRequest(BaseModel):
    respuestas: List[RespuestaFactorItem]
    notas_area2: Optional[str] = None
    notas_area3: Optional[str] = None
    notas_area4: Optional[str] = None


class EvalDireccionRequest(BaseModel):
    respuestas: List[RespuestaFactorItem]
    notas_area2: Optional[str] = None
    notas_area3: Optional[str] = None
    notas_area4: Optional[str] = None


class EvaluacionBonusResponse(BaseModel):
    id: int
    empleado_id: int
    empleado_nombre: Optional[str] = None
    config_id: int
    año: int
    semestre: int
    estado: str
    salario_bruto_anual: Optional[float]
    pct_maximo_bonus: float
    factor_k_promedio: Optional[float]
    pct_sla: Optional[float]
    pct_registro: Optional[float]
    puntuacion_area1: Optional[float]
    notas_empleado_area2: Optional[str]
    notas_director_area2: Optional[str]
    puntuacion_area2: Optional[float]
    notas_empleado_area3: Optional[str]
    notas_director_area3: Optional[str]
    puntuacion_area3: Optional[float]
    notas_empleado_area4: Optional[str]
    notas_director_area4: Optional[str]
    puntuacion_area4: Optional[float]
    puntuacion_total: Optional[float]
    factor_equipo_aplicado: Optional[bool]
    porcentaje_tramo: Optional[float]
    bonus_semestral_euros: Optional[float]
    fecha_inicio_auto_eval: Optional[datetime]
    fecha_fin_auto_eval: Optional[datetime]
    fecha_inicio_eval_dir: Optional[datetime]
    fecha_cierre: Optional[datetime]
    respuestas: Optional[List[RespuestaFactorResponse]] = None

    class Config:
        from_attributes = True


class FactorEquipoResponse(BaseModel):
    meses_cumplidos: int
    meses_totales: int
    activado: bool
    factor_multiplicador: float
    detalle_meses: List[dict]


class IniciarPeriodoRequest(BaseModel):
    año: int
    semestre: int


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
