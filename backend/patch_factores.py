"""
Script de migración: crea o actualiza los factores de evaluación (Áreas 2, 3, 4)
en la base de datos existente sin afectar a usuarios, expedientes ni evaluaciones.

Uso:
  cd backend
  python patch_factores.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from database import SessionLocal, engine, Base
from models.factores_evaluacion import FactorEvaluacion

Base.metadata.create_all(bind=engine)

FACTORES = [
    # (area, orden, nombre, nota_contexto)
    # Área 2 — Calidad Operativa
    (2, 1, "Tasa de incidencias y errores en declaraciones atribuibles al operario",
           "Canal rojo/naranja decidido por la AEAT queda excluido de penalización individual"),
    (2, 2, "% de expedientes resueltos sin incidencias sobre el total gestionado", None),
    (2, 3, "Calidad del archivo documental y cumplimiento normativo", None),
    (2, 4, "Gestión autónoma de incidencias y comunicación proactiva con el cliente",
           "Se ajusta si hay picos de trabajo extraordinarios"),
    # Área 3 — Gecotex Corporate
    (3, 1, "Trabajo en equipo y colaboración con el equipo operativo", None),
    (3, 2, "Actitud, compromiso y proactividad en el día a día", None),
    (3, 3, "Cumplimiento de procedimientos internos y directrices de dirección", None),
    (3, 4, "Comunicación interna: respuesta ágil y coordinación entre áreas", None),
    # Área 4 — Digitalización y Adaptación
    (4, 1, "Adopción y uso correcto de la herramienta de gestión de DUAs", None),
    (4, 2, "Uso activo del dashboard de carga operativa del equipo", None),
    (4, 3, "Propuesta documentada de al menos 1 mejora de proceso en el semestre",
           "0 propuestas = 5 · 1 propuesta documentada = 7 · 2 o más = 9-10"),
]

def patch():
    db = SessionLocal()
    try:
        creados = 0
        actualizados = 0
        for area, orden, nombre, nota in FACTORES:
            f = db.query(FactorEvaluacion).filter_by(area=area, orden=orden).first()
            if f:
                if f.nombre != nombre or f.nota_contexto != nota:
                    f.nombre = nombre
                    f.nota_contexto = nota
                    f.activo = True
                    actualizados += 1
            else:
                db.add(FactorEvaluacion(area=area, orden=orden, nombre=nombre,
                                        nota_contexto=nota, activo=True))
                creados += 1
        db.commit()
        print(f"patch_factores OK — {creados} creados, {actualizados} actualizados, "
              f"{len(FACTORES) - creados - actualizados} sin cambios")
    finally:
        db.close()

if __name__ == "__main__":
    patch()
