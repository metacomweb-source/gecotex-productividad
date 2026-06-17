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
    # (area, orden, nombre, nota_contexto, descripciones_niveles)
    # Área 2 — Calidad Operativa
    (2, 1, "Tasa de incidencias y errores en declaraciones atribuibles al operario",
           "Canal rojo/naranja decidido por la AEAT queda excluido de penalización individual",
           {"1-3": "Incidencias frecuentes atribuibles al operario", "4-6": "Incidencias ocasionales, aprendiendo a mejorar", "7-8": "Muy pocas incidencias, cumple los estándares", "9-10": "Sin incidencias relevantes, gestión impecable"}),
    (2, 2, "% de expedientes resueltos sin incidencias sobre el total gestionado", None,
           {"1-3": "Mayoría de expedientes con incidencias", "4-6": "Aproximadamente la mitad sin incidencias", "7-8": "Gran mayoría resueltos sin problemas", "9-10": "Casi todos los expedientes resueltos limpiamente"}),
    (2, 3, "Calidad del archivo documental y cumplimiento normativo", None,
           {"1-3": "Documentación incompleta o con errores habituales", "4-6": "Correcta pero con aspectos a mejorar", "7-8": "Documentación completa y bien organizada", "9-10": "Documentación ejemplar, referencia para el equipo"}),
    (2, 4, "Gestión autónoma de incidencias y comunicación proactiva con el cliente",
           "Se ajusta si hay picos de trabajo extraordinarios",
           {"1-3": "Necesita ayuda frecuente para resolver incidencias", "4-6": "Resuelve algunas incidencias, escala otras", "7-8": "Gestiona bien la mayoría de incidencias de forma autónoma", "9-10": "Resuelve todo de forma autónoma y comunica proactivamente"}),
    # Área 3 — Gecotex Corporate
    (3, 1, "Trabajo en equipo y colaboración con el equipo operativo", None,
           {"1-3": "Dificultades para colaborar con el equipo", "4-6": "Colabora cuando se le pide, sin proactividad", "7-8": "Buen espíritu de equipo, apoya a los compañeros", "9-10": "Referente en colaboración, potencia al equipo"}),
    (3, 2, "Actitud, compromiso y proactividad en el día a día", None,
           {"1-3": "Actitud pasiva o falta de compromiso visible", "4-6": "Cumple lo básico, sin iniciativa destacada", "7-8": "Comprometido/a y proactivo/a en el día a día", "9-10": "Muy alto compromiso, referente de actitud en el equipo"}),
    (3, 3, "Cumplimiento de procedimientos internos y directrices de dirección", None,
           {"1-3": "Incumplimientos frecuentes de procedimientos", "4-6": "Generalmente los cumple, con excepciones", "7-8": "Cumple siempre los procedimientos y directrices", "9-10": "Cumplimiento ejemplar, propone mejoras de procedimientos"}),
    (3, 4, "Comunicación interna: respuesta ágil y coordinación entre áreas", None,
           {"1-3": "Respuestas lentas o comunicación deficiente", "4-6": "Comunicación correcta con margen de mejora en agilidad", "7-8": "Comunicación ágil y coordinación fluida", "9-10": "Comunicación proactiva y excelente coordinación entre áreas"}),
    # Área 4 — Digitalización y Adaptación
    (4, 1, "Adopción y uso correcto de la herramienta de gestión de DUAs", None,
           {"1-3": "Uso básico o incorrecto de la herramienta", "4-6": "Uso correcto pero sin aprovechar todas las funciones", "7-8": "Uso correcto y eficiente de la herramienta", "9-10": "Uso avanzado, ayuda a otros a usarla correctamente"}),
    (4, 2, "Uso activo del dashboard de carga operativa del equipo", None,
           {"1-3": "No consulta o apenas usa el dashboard de carga", "4-6": "Lo consulta ocasionalmente", "7-8": "Uso habitual para organizar su trabajo", "9-10": "Uso diario y proactivo, toma decisiones basadas en datos"}),
    (4, 3, "Propuesta documentada de al menos 1 mejora de proceso en el semestre",
           "0 propuestas = 5 · 1 propuesta documentada = 7 · 2 o más = 9-10",
           {"1-3": "Sin propuestas documentadas en el semestre", "4-6": "Sin propuestas documentadas en el semestre", "7-8": "1 propuesta documentada de mejora de proceso", "9-10": "2 o más propuestas documentadas en el semestre"}),
]

def patch():
    db = SessionLocal()
    try:
        creados = 0
        actualizados = 0
        for area, orden, nombre, nota, descripciones in FACTORES:
            f = db.query(FactorEvaluacion).filter_by(area=area, orden=orden).first()
            if f:
                changed = (f.nombre != nombre or f.nota_contexto != nota
                           or f.descripciones_niveles != descripciones)
                if changed:
                    f.nombre = nombre
                    f.nota_contexto = nota
                    f.descripciones_niveles = descripciones
                    f.activo = True
                    actualizados += 1
            else:
                db.add(FactorEvaluacion(area=area, orden=orden, nombre=nombre,
                                        nota_contexto=nota, activo=True,
                                        descripciones_niveles=descripciones))
                creados += 1
        db.commit()
        print(f"patch_factores OK — {creados} creados, {actualizados} actualizados, "
              f"{len(FACTORES) - creados - actualizados} sin cambios")
    finally:
        db.close()

if __name__ == "__main__":
    patch()
