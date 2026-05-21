import os
import tempfile
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from auth import require_min_role
from models.usuario import RolEnum, Usuario
from models.importacion_excel import ImportacionExcel
from schemas.otros import ImportacionPreviewResponse, ImportacionEjecutarRequest, ImportacionResultadoResponse
from services.importador_excel import leer_excel_preview, autodetectar_mapeo, importar_excel

router = APIRouter(prefix="/importacion", tags=["importacion"])

_temp_files: dict = {}


@router.post("/preview")
async def preview_excel(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_min_role(RolEnum.coordinador)),
):
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Solo se aceptan archivos .xlsx y .xls")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="El archivo supera los 10MB")

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx")
    tmp.write(content)
    tmp.close()

    try:
        columnas, preview, total = leer_excel_preview(tmp.name, n_filas=5)
        mapeo = autodetectar_mapeo(columnas)
        _temp_files[current_user.id] = {"path": tmp.name, "nombre": file.filename}
        return {
            "columnas_detectadas": columnas,
            "mapeo_sugerido": mapeo,
            "preview_filas": preview,
            "total_filas": total,
            "session_key": current_user.id,
        }
    except Exception as e:
        os.unlink(tmp.name)
        raise HTTPException(status_code=400, detail=f"Error leyendo Excel: {str(e)}")


@router.post("/ejecutar", response_model=ImportacionResultadoResponse)
def ejecutar_importacion(
    data: ImportacionEjecutarRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_min_role(RolEnum.coordinador)),
):
    session = _temp_files.get(current_user.id)
    if not session:
        raise HTTPException(status_code=400, detail="No hay fichero pendiente. Haz el preview primero.")

    filepath = session["path"]
    nombre_fichero = session["nombre"]

    resultado = importar_excel(
        db=db,
        filepath=filepath,
        mapeo=data.mapeo_columnas,
        accion_duplicados=data.accion_duplicados,
        usuario_id=current_user.id,
    )

    log = ImportacionExcel(
        usuario_id=current_user.id,
        nombre_fichero=nombre_fichero,
        registros_totales=resultado["importados"] + resultado["actualizados"] + resultado["ignorados"] + resultado["con_error"],
        registros_importados=resultado["importados"],
        registros_con_error=resultado["con_error"],
        log_errores=resultado["errores"],
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    try:
        os.unlink(filepath)
    except Exception:
        pass
    _temp_files.pop(current_user.id, None)

    return ImportacionResultadoResponse(
        importados=resultado["importados"],
        actualizados=resultado["actualizados"],
        ignorados=resultado["ignorados"],
        con_error=resultado["con_error"],
        errores=resultado["errores"],
        importacion_id=log.id,
    )


@router.get("/historial")
def historial(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_min_role(RolEnum.coordinador)),
):
    return db.query(ImportacionExcel).order_by(ImportacionExcel.fecha_importacion.desc()).limit(50).all()
