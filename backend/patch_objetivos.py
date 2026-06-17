"""
Patch que se ejecuta en cada startup.
Si detecta objetivos descalibrados (objetivo_up > 100), los actualiza
a los valores correctos coherentes con el volumen real de expedientes.
"""
import random


OBJETIVO_BASE = {
    "cristian@gecotex.es": 14.0,
    "maria@gecotex.es":    12.0,
    "jorge@gecotex.es":    16.0,
    "silvia@gecotex.es":   13.0,
    "ana@gecotex.es":      11.0,
}


def patch():
    try:
        from database import SessionLocal
        from models.objetivo_mes import ObjetivoMes
        from models.usuario import Usuario

        db = SessionLocal()
        try:
            # Comprobar si hay objetivos descalibrados
            mal = db.query(ObjetivoMes).filter(ObjetivoMes.objetivo_up > 100).count()
            if mal == 0:
                return

            print(f"[patch_objetivos] Corrigiendo {mal} objetivos descalibrados...")
            random.seed(42)
            for email, base in OBJETIVO_BASE.items():
                usuario = db.query(Usuario).filter(Usuario.email == email).first()
                if not usuario:
                    continue
                objetivos = db.query(ObjetivoMes).filter(
                    ObjetivoMes.operario_id == usuario.id,
                    ObjetivoMes.objetivo_up > 100,
                ).all()
                for obj in objetivos:
                    variacion = random.uniform(0.88, 1.12)
                    obj.objetivo_up = round(base * variacion, 1)
                    obj.objetivo_tasa_incidencia_max = None

            db.commit()
            print("[patch_objetivos] Objetivos corregidos OK.")
        finally:
            db.close()
    except Exception as e:
        print(f"[patch_objetivos] Error no fatal: {e}")
