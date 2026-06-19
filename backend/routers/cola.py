from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from auth import get_current_user, require_min_role
from models.cola_trabajo import ColaTrabajo, EstadoColaEnum
from models.notificacion import Notificacion, TipoNotificacionEnum
from models.usuario import Usuario, RolEnum
from schemas.cola import (
    ColaCreate, ColaUpdate, ColaAsignarRequest, ColaEstadoRequest,
    ColaReordenarRequest, ColaResponse,
)

router = APIRouter(prefix="/cola", tags=["cola"])


def _enriquecer(item: ColaTrabajo) -> ColaResponse:
    r = ColaResponse.model_validate(item)
    if item.asignado_a_rel:
        r.asignado_a_nombre = f"{item.asignado_a_rel.nombre} {item.asignado_a_rel.apellidos}"
    if item.asignado_por_rel:
        r.asignado_por_nombre = f"{item.asignado_por_rel.nombre} {item.asignado_por_rel.apellidos}"
    return r


def _notificar_asignacion(db: Session, usuario_id: int, descripcion: str):
    db.add(Notificacion(
        usuario_id=usuario_id,
        titulo="Nueva tarea asignada",
        mensaje=f"Se te ha asignado: {descripcion[:120]}",
        tipo=TipoNotificacionEnum.info,
    ))


# ─────────────────────────────────────────────────────────────
# RUTAS LITERALES — deben ir antes de /{id}
# ─────────────────────────────────────────────────────────────

@router.get("/mia", response_model=List[ColaResponse])
def mi_cola(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    items = (
        db.query(ColaTrabajo)
        .filter(
            ColaTrabajo.asignado_a == current_user.id,
            ColaTrabajo.estado != EstadoColaEnum.cancelado,
        )
        .order_by(ColaTrabajo.orden.asc(), ColaTrabajo.created_at.desc())
        .all()
    )
    return [_enriquecer(i) for i in items]


@router.get("/pendientes-count")
def pendientes_count(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    mias = (
        db.query(ColaTrabajo)
        .filter(
            ColaTrabajo.asignado_a == current_user.id,
            ColaTrabajo.estado.in_([EstadoColaEnum.pendiente, EstadoColaEnum.en_curso]),
        )
        .count()
    )
    total = (
        db.query(ColaTrabajo)
        .filter(ColaTrabajo.estado.in_([EstadoColaEnum.pendiente, EstadoColaEnum.en_curso]))
        .count()
    )
    sin_asignar = (
        db.query(ColaTrabajo)
        .filter(
            ColaTrabajo.asignado_a.is_(None),
            ColaTrabajo.estado == EstadoColaEnum.pendiente,
        )
        .count()
    )
    return {"mias": mias, "total": total, "sin_asignar": sin_asignar}


@router.post("/reordenar")
def reordenar(
    data: ColaReordenarRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_min_role(RolEnum.coordinador)),
):
    for item in data.items:
        db.query(ColaTrabajo).filter(ColaTrabajo.id == item.id).update({"orden": item.orden})
    db.commit()
    return {"ok": True}


# ─────────────────────────────────────────────────────────────
# CRUD GENERAL
# ─────────────────────────────────────────────────────────────

@router.get("", response_model=List[ColaResponse])
def listar_cola(
    sede: Optional[str] = Query(None),
    estado: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_min_role(RolEnum.coordinador)),
):
    q = db.query(ColaTrabajo).filter(ColaTrabajo.estado != EstadoColaEnum.cancelado)
    if sede:
        q = q.filter(ColaTrabajo.sede == sede)
    if estado:
        q = q.filter(ColaTrabajo.estado == estado)
    items = q.order_by(ColaTrabajo.orden.asc(), ColaTrabajo.created_at.desc()).all()
    return [_enriquecer(i) for i in items]


@router.post("", response_model=ColaResponse, status_code=201)
def crear_item(
    data: ColaCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_min_role(RolEnum.coordinador)),
):
    item = ColaTrabajo(
        **data.model_dump(exclude_unset=True),
        asignado_por=current_user.id,
    )
    db.add(item)
    if data.asignado_a:
        db.flush()
        _notificar_asignacion(db, data.asignado_a, data.descripcion)
    db.commit()
    db.refresh(item)
    return _enriquecer(item)


@router.put("/{item_id}", response_model=ColaResponse)
def actualizar_item(
    item_id: int,
    data: ColaUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_min_role(RolEnum.coordinador)),
):
    item = db.query(ColaTrabajo).filter(ColaTrabajo.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item no encontrado")

    old_asignado = item.asignado_a
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(item, key, value)

    if "asignado_a" in update_data and update_data["asignado_a"] != old_asignado and update_data["asignado_a"]:
        _notificar_asignacion(db, update_data["asignado_a"], item.descripcion)

    db.commit()
    db.refresh(item)
    return _enriquecer(item)


@router.delete("/{item_id}")
def eliminar_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_min_role(RolEnum.coordinador)),
):
    item = db.query(ColaTrabajo).filter(ColaTrabajo.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item no encontrado")
    item.estado = EstadoColaEnum.cancelado
    db.commit()
    return {"ok": True}


@router.patch("/{item_id}/asignar", response_model=ColaResponse)
def asignar_item(
    item_id: int,
    data: ColaAsignarRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_min_role(RolEnum.coordinador)),
):
    item = db.query(ColaTrabajo).filter(ColaTrabajo.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item no encontrado")
    item.asignado_a = data.asignado_a
    _notificar_asignacion(db, data.asignado_a, item.descripcion)
    db.commit()
    db.refresh(item)
    return _enriquecer(item)


@router.patch("/{item_id}/tomar", response_model=ColaResponse)
def tomar_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    item = db.query(ColaTrabajo).filter(ColaTrabajo.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item no encontrado")
    if item.asignado_a is not None:
        raise HTTPException(status_code=400, detail="Este item ya está asignado")
    if item.estado != EstadoColaEnum.pendiente:
        raise HTTPException(status_code=400, detail="Solo se pueden tomar items pendientes")
    item.asignado_a = current_user.id
    db.commit()
    db.refresh(item)
    return _enriquecer(item)


@router.patch("/{item_id}/estado", response_model=ColaResponse)
def cambiar_estado(
    item_id: int,
    data: ColaEstadoRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    item = db.query(ColaTrabajo).filter(ColaTrabajo.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item no encontrado")

    es_coordinador = current_user.rol in [RolEnum.coordinador, RolEnum.director, RolEnum.admin]
    if not es_coordinador and item.asignado_a != current_user.id:
        raise HTTPException(status_code=403, detail="Solo puedes cambiar el estado de tus propios items")

    item.estado = data.estado
    if data.notas_operario is not None:
        item.notas_operario = data.notas_operario
    db.commit()
    db.refresh(item)
    return _enriquecer(item)
