from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user, require_min_role
from models.configuracion import Configuracion
from models.usuario import RolEnum
from schemas.otros import ConfiguracionResponse, ConfiguracionUpdate

router = APIRouter(prefix="/configuracion", tags=["configuracion"])

_DEFAULTS = {
    "nombre_empresa": "GECOTEX INTERNACIONAL, S.L.",
    "zona_horaria": "Europe/Madrid",
    "notif_dias_sin_expedientes": True,
    "notif_sobrecarga": True,
    "notif_tiempo_respuesta": True,
    "notif_objetivo_bajo": True,
    "dias_umbral_sin_expedientes": 3,
    "umbral_ocupacion": 110,
}


def _get_or_create(db: Session) -> Configuracion:
    cfg = db.query(Configuracion).first()
    if not cfg:
        cfg = Configuracion(**_DEFAULTS)
        db.add(cfg)
        db.commit()
        db.refresh(cfg)
    return cfg


@router.get("", response_model=ConfiguracionResponse)
def obtener_configuracion(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return _get_or_create(db)


@router.put("", response_model=ConfiguracionResponse)
def actualizar_configuracion(
    data: ConfiguracionUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_min_role(RolEnum.admin)),
):
    cfg = _get_or_create(db)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(cfg, key, value)
    db.commit()
    db.refresh(cfg)
    return cfg
