import os
import aiofiles
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from auth import get_current_user, require_min_role
from models.expediente import Expediente
from models.usuario import Usuario, RolEnum
from models.tipo_dua import TipoDua
from models.incrementador import Incrementador
from models.cliente import Cliente
from schemas.expediente import ExpedienteCreate, ExpedienteUpdate, ExpedienteResponse
from services.calculo_up import calcular_up, calcular_partidas_adicionales, calcular_valor_facturacion

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")

router = APIRouter(prefix="/expedientes", tags=["expedientes"])


def _enriquecer(exp: Expediente) -> dict:
    d = {c.name: getattr(exp, c.name) for c in exp.__table__.columns}
    d["operario_nombre"] = f"{exp.operario.nombre} {exp.operario.apellidos}" if exp.operario else ""
    d["tipo_dua_nombre"] = exp.tipo_dua.nombre if exp.tipo_dua else ""
    return d


def _puede_ver(current_user: Usuario, expediente: Expediente) -> bool:
    if current_user.rol in [RolEnum.admin, RolEnum.director, RolEnum.coordinador]:
        return True
    return expediente.operario_id == current_user.id


@router.get("", response_model=List[ExpedienteResponse])
def listar_expedientes(
    operario_id: Optional[int] = Query(None),
    año: Optional[int] = Query(None),
    mes: Optional[int] = Query(None),
    canal: Optional[str] = Query(None),
    tipo_trafico: Optional[str] = Query(None),
    tipo_dua_id: Optional[int] = Query(None),
    cliente_id: Optional[int] = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    q = db.query(Expediente)
    if current_user.rol == RolEnum.operario:
        q = q.filter(Expediente.operario_id == current_user.id)
    elif operario_id:
        q = q.filter(Expediente.operario_id == operario_id)
    if año and mes:
        from datetime import datetime
        inicio = datetime(año, mes, 1)
        if mes == 12:
            fin = datetime(año + 1, 1, 1)
        else:
            fin = datetime(año, mes + 1, 1)
        q = q.filter(Expediente.created_at >= inicio, Expediente.created_at < fin)
    if canal:
        q = q.filter(Expediente.canal_respuesta == canal)
    if tipo_trafico:
        q = q.filter(Expediente.tipo_trafico == tipo_trafico)
    if tipo_dua_id:
        q = q.filter(Expediente.tipo_dua_id == tipo_dua_id)
    if cliente_id:
        q = q.filter(Expediente.cliente_id == cliente_id)

    expedientes = q.order_by(Expediente.created_at.desc()).offset(skip).limit(limit).all()
    result = []
    for e in expedientes:
        data = ExpedienteResponse.model_validate(e)
        data.operario_nombre = f"{e.operario.nombre} {e.operario.apellidos}" if e.operario else ""
        data.tipo_dua_nombre = e.tipo_dua.nombre if e.tipo_dua else ""
        result.append(data)
    return result


@router.post("", response_model=ExpedienteResponse, status_code=status.HTTP_201_CREATED)
def crear_expediente(
    data: ExpedienteCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    operario_id = data.operario_id or current_user.id
    if current_user.rol == RolEnum.operario:
        operario_id = current_user.id

    if db.query(Expediente).filter(Expediente.numero_expediente == data.numero_expediente).first():
        raise HTTPException(status_code=400, detail="Número de expediente ya existe")

    tipo_dua = db.query(TipoDua).filter(TipoDua.id == data.tipo_dua_id).first()
    if not tipo_dua:
        raise HTTPException(status_code=404, detail="Tipo de DUA no encontrado")

    incrementadores = db.query(Incrementador).filter(Incrementador.id.in_(data.servicios_adicionales)).all() if data.servicios_adicionales else []
    partidas_adic = calcular_partidas_adicionales(tipo_dua, data.num_partidas)
    up = calcular_up(tipo_dua, data.num_partidas, incrementadores)
    valor = calcular_valor_facturacion(tipo_dua, data.num_partidas, incrementadores)

    cliente_nombre = data.cliente_nombre
    if data.cliente_id:
        cli = db.query(Cliente).filter(Cliente.id == data.cliente_id, Cliente.activo == True).first()
        if cli:
            cliente_nombre = cli.nombre

    exp = Expediente(
        numero_expediente=data.numero_expediente,
        operario_id=operario_id,
        tipo_dua_id=data.tipo_dua_id,
        cliente_id=data.cliente_id,
        cliente_nombre=cliente_nombre,
        tipo_trafico=data.tipo_trafico,
        num_partidas=data.num_partidas,
        canal_respuesta=data.canal_respuesta,
        fecha_recepcion_correo=data.fecha_recepcion_correo,
        fecha_apertura_dossier=data.fecha_apertura_dossier,
        fecha_envio_aduana=data.fecha_envio_aduana,
        fecha_levante=data.fecha_levante,
        fecha_envio_facturacion=data.fecha_envio_facturacion,
        servicios_adicionales=data.servicios_adicionales,
        partidas_adicionales_count=partidas_adic,
        up_calculadas=up,
        valor_facturacion=valor,
        notas=data.notas,
        origen="manual",
    )
    db.add(exp)
    db.commit()
    db.refresh(exp)
    result = ExpedienteResponse.model_validate(exp)
    result.operario_nombre = f"{exp.operario.nombre} {exp.operario.apellidos}" if exp.operario else ""
    result.tipo_dua_nombre = exp.tipo_dua.nombre if exp.tipo_dua else ""
    return result


@router.get("/{expediente_id}", response_model=ExpedienteResponse)
def obtener_expediente(
    expediente_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    exp = db.query(Expediente).filter(Expediente.id == expediente_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Expediente no encontrado")
    if not _puede_ver(current_user, exp):
        raise HTTPException(status_code=403, detail="Sin permisos para ver este expediente")
    result = ExpedienteResponse.model_validate(exp)
    result.operario_nombre = f"{exp.operario.nombre} {exp.operario.apellidos}" if exp.operario else ""
    result.tipo_dua_nombre = exp.tipo_dua.nombre if exp.tipo_dua else ""
    return result


@router.put("/{expediente_id}", response_model=ExpedienteResponse)
def actualizar_expediente(
    expediente_id: int,
    data: ExpedienteUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    exp = db.query(Expediente).filter(Expediente.id == expediente_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Expediente no encontrado")
    if not _puede_ver(current_user, exp):
        raise HTTPException(status_code=403, detail="Sin permisos")

    update_data = data.model_dump(exclude_unset=True)
    recalcular = "tipo_dua_id" in update_data or "num_partidas" in update_data or "servicios_adicionales" in update_data

    if "cliente_id" in update_data and update_data["cliente_id"]:
        cli = db.query(Cliente).filter(Cliente.id == update_data["cliente_id"], Cliente.activo == True).first()
        if cli:
            update_data["cliente_nombre"] = cli.nombre

    for key, value in update_data.items():
        setattr(exp, key, value)

    if recalcular:
        tipo_dua = db.query(TipoDua).filter(TipoDua.id == exp.tipo_dua_id).first()
        if tipo_dua:
            incrementadores = db.query(Incrementador).filter(Incrementador.id.in_(exp.servicios_adicionales or [])).all()
            exp.partidas_adicionales_count = calcular_partidas_adicionales(tipo_dua, exp.num_partidas)
            exp.up_calculadas = calcular_up(tipo_dua, exp.num_partidas, incrementadores)
            exp.valor_facturacion = calcular_valor_facturacion(tipo_dua, exp.num_partidas, incrementadores)

    db.commit()
    db.refresh(exp)
    result = ExpedienteResponse.model_validate(exp)
    result.operario_nombre = f"{exp.operario.nombre} {exp.operario.apellidos}" if exp.operario else ""
    result.tipo_dua_nombre = exp.tipo_dua.nombre if exp.tipo_dua else ""
    return result


@router.delete("/{expediente_id}")
def eliminar_expediente(
    expediente_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_min_role(RolEnum.admin)),
):
    exp = db.query(Expediente).filter(Expediente.id == expediente_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Expediente no encontrado")
    db.delete(exp)
    db.commit()
    return {"message": "Expediente eliminado"}


def _get_exp_or_404(db: Session, expediente_id: int, current_user: Usuario) -> Expediente:
    exp = db.query(Expediente).filter(Expediente.id == expediente_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Expediente no encontrado")
    if not _puede_ver(current_user, exp):
        raise HTTPException(status_code=403, detail="Sin permisos")
    return exp


@router.post("/{expediente_id}/documento")
async def subir_documento(
    expediente_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    exp = _get_exp_or_404(db, expediente_id, current_user)
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    if exp.documento_dua_nombre:
        old = os.path.join(UPLOAD_DIR, f"{expediente_id}_{exp.documento_dua_nombre}")
        if os.path.exists(old):
            os.remove(old)
    dest = os.path.join(UPLOAD_DIR, f"{expediente_id}_{file.filename}")
    async with aiofiles.open(dest, "wb") as f:
        await f.write(await file.read())
    exp.documento_dua_nombre = file.filename
    db.commit()
    return {"documento_dua_nombre": file.filename}


@router.get("/{expediente_id}/documento")
def descargar_documento(
    expediente_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    exp = _get_exp_or_404(db, expediente_id, current_user)
    if not exp.documento_dua_nombre:
        raise HTTPException(status_code=404, detail="Sin documento adjunto")
    path = os.path.join(UPLOAD_DIR, f"{expediente_id}_{exp.documento_dua_nombre}")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Archivo no encontrado en servidor")
    return FileResponse(path, filename=exp.documento_dua_nombre)


@router.delete("/{expediente_id}/documento")
def eliminar_documento(
    expediente_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    exp = _get_exp_or_404(db, expediente_id, current_user)
    if exp.documento_dua_nombre:
        path = os.path.join(UPLOAD_DIR, f"{expediente_id}_{exp.documento_dua_nombre}")
        if os.path.exists(path):
            os.remove(path)
        exp.documento_dua_nombre = None
        db.commit()
    return {"ok": True}
