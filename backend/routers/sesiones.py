from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from database import get_db
from auth import get_current_user
from models.sesion_trabajo import SesionTrabajo, EstadoSesionEnum
from models.expediente import Expediente
from models.usuario import Usuario, RolEnum
from schemas.otros import SesionTrabajoResponse

router = APIRouter(prefix="/sesiones", tags=["sesiones"])


@router.post("/iniciar", response_model=SesionTrabajoResponse)
def iniciar_sesion(
    expediente_id: int = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    activa = db.query(SesionTrabajo).filter(
        SesionTrabajo.operario_id == current_user.id,
        SesionTrabajo.estado == EstadoSesionEnum.activa,
    ).first()
    if activa:
        raise HTTPException(status_code=400, detail=f"Tienes una sesión activa en expediente ID {activa.expediente_id}. Ciérrala antes de iniciar otra.")

    exp = db.query(Expediente).filter(Expediente.id == expediente_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Expediente no encontrado")

    sesion = SesionTrabajo(
        expediente_id=expediente_id,
        operario_id=current_user.id,
        inicio=datetime.now(),
        estado=EstadoSesionEnum.activa,
    )
    db.add(sesion)
    db.commit()
    db.refresh(sesion)
    return sesion


@router.post("/pausar", response_model=SesionTrabajoResponse)
def pausar_sesion(
    sesion_id: int = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    sesion = db.query(SesionTrabajo).filter(
        SesionTrabajo.id == sesion_id,
        SesionTrabajo.operario_id == current_user.id,
    ).first()
    if not sesion:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    if sesion.estado != EstadoSesionEnum.activa:
        raise HTTPException(status_code=400, detail="La sesión no está activa")

    ahora = datetime.now()
    sesion.fin = ahora
    sesion.estado = EstadoSesionEnum.pausada
    sesion.duracion_minutos = (ahora - sesion.inicio).total_seconds() / 60
    db.commit()
    db.refresh(sesion)
    return sesion


@router.post("/finalizar", response_model=SesionTrabajoResponse)
def finalizar_sesion(
    sesion_id: int = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    sesion = db.query(SesionTrabajo).filter(
        SesionTrabajo.id == sesion_id,
        SesionTrabajo.operario_id == current_user.id,
    ).first()
    if not sesion:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    ahora = datetime.now()
    sesion.fin = ahora
    sesion.estado = EstadoSesionEnum.completada
    if sesion.inicio:
        sesion.duracion_minutos = (ahora - sesion.inicio).total_seconds() / 60
    db.commit()
    db.refresh(sesion)
    return sesion


@router.get("/activa", response_model=SesionTrabajoResponse)
def sesion_activa(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    sesion = db.query(SesionTrabajo).filter(
        SesionTrabajo.operario_id == current_user.id,
        SesionTrabajo.estado == EstadoSesionEnum.activa,
    ).first()
    if not sesion:
        raise HTTPException(status_code=404, detail="No hay sesión activa")
    return sesion


@router.get("/expediente/{expediente_id}", response_model=List[SesionTrabajoResponse])
def sesiones_de_expediente(
    expediente_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return db.query(SesionTrabajo).filter(SesionTrabajo.expediente_id == expediente_id).order_by(SesionTrabajo.inicio).all()
