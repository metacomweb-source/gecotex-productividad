import random
from datetime import datetime, timedelta, date
from sqlalchemy.orm import Session
from auth import hash_password
from models.usuario import Usuario, RolEnum, DepartamentoEnum
from models.tipo_dua import TipoDua, TipoTraficoEnum
from models.incrementador import Incrementador
from models.expediente import Expediente, CanalEnum, OrigenEnum
from models.objetivo_mes import ObjetivoMes
from models.notificacion import Notificacion, TipoNotificacionEnum
from models.config_bonus_global import ConfigBonusGlobal, DEFAULT_TRAMOS, DEFAULT_CONFIG_AREA1
from models.factores_evaluacion import FactorEvaluacion
from models.evaluaciones_bonus import EvaluacionBonus, EstadoEvaluacionEnum
from models.respuestas_factores import RespuestaFactor


CLIENTES = [
    "Importaciones García S.L.", "Textil Barcelona S.A.", "Electrónica del Norte",
    "Frutas Mediterráneas S.A.", "Química Industrial S.L.", "Moda España Export",
    "Auto Parts International", "Farmacia Global S.A.", "Alimentación Torres",
    "Construcciones Levante", "Tech Solutions Spain", "Vinos y Licores S.A.",
    "Maquinaria Pesada S.L.", "Cosmética Natural", "Logística Express",
    "Metales Ibéricos S.A.", "Calzado Alicante S.L.", "Papel y Cartón",
    "Plásticos del Sur", "Joyería Fina S.A.",
]


def cargar_seed(db: Session):
    if db.query(Usuario).count() > 0:
        return

    print("Cargando datos de demostración (Tarifas 2025)...")

    # --- USUARIOS ---
    usuarios_data = [
        {"nombre": "Admin", "apellidos": "Sistema", "email": "admin@gecotex.es", "password": "admin123",
         "rol": RolEnum.admin, "departamento": DepartamentoEnum.it, "fecha_incorporacion": date(2020, 1, 1)},
        {"nombre": "Jesús", "apellidos": "García", "email": "jesus@gecotex.es", "password": "demo123",
         "rol": RolEnum.director, "departamento": DepartamentoEnum.administracion, "fecha_incorporacion": date(2018, 3, 15)},
        {"nombre": "Sergio", "apellidos": "Martínez", "email": "sergio@gecotex.es", "password": "demo123",
         "rol": RolEnum.coordinador, "departamento": DepartamentoEnum.operaciones, "fecha_incorporacion": date(2019, 6, 1)},
        {"nombre": "Cristian", "apellidos": "López", "email": "cristian@gecotex.es", "password": "demo123",
         "rol": RolEnum.operario, "departamento": DepartamentoEnum.operaciones, "fecha_incorporacion": date(2020, 9, 1),
         "salario_bruto_anual": 24000.0, "pct_maximo_bonus": 0.05},
        {"nombre": "María", "apellidos": "Fernández", "email": "maria@gecotex.es", "password": "demo123",
         "rol": RolEnum.operario, "departamento": DepartamentoEnum.operaciones, "fecha_incorporacion": date(2021, 1, 15),
         "salario_bruto_anual": 22000.0, "pct_maximo_bonus": 0.05},
        {"nombre": "Jorge", "apellidos": "Pérez", "email": "jorge@gecotex.es", "password": "demo123",
         "rol": RolEnum.operario, "departamento": DepartamentoEnum.operaciones, "fecha_incorporacion": date(2019, 11, 1),
         "salario_bruto_anual": 23000.0, "pct_maximo_bonus": 0.05},
        {"nombre": "Silvia", "apellidos": "Romero", "email": "silvia@gecotex.es", "password": "demo123",
         "rol": RolEnum.operario, "departamento": DepartamentoEnum.operaciones, "fecha_incorporacion": date(2022, 4, 1),
         "salario_bruto_anual": 24000.0, "pct_maximo_bonus": 0.05},
        {"nombre": "Ana", "apellidos": "Torres", "email": "ana@gecotex.es", "password": "demo123",
         "rol": RolEnum.operario, "departamento": DepartamentoEnum.operaciones, "fecha_incorporacion": date(2020, 7, 1),
         "salario_bruto_anual": 21500.0, "pct_maximo_bonus": 0.05},
    ]
    usuarios = []
    for u_data in usuarios_data:
        u = Usuario(
            nombre=u_data["nombre"],
            apellidos=u_data["apellidos"],
            email=u_data["email"],
            password_hash=hash_password(u_data["password"]),
            rol=u_data["rol"],
            departamento=u_data.get("departamento"),
            fecha_incorporacion=u_data.get("fecha_incorporacion"),
            activo=True,
            jornada_horas_dia=8.0,
            salario_bruto_anual=u_data.get("salario_bruto_anual"),
            pct_maximo_bonus=u_data.get("pct_maximo_bonus", 0.05),
        )
        db.add(u)
        usuarios.append(u)
    db.commit()

    # --- TIPOS DUA (Basados en Tarifas 2025) ---
    tipos_dua_data = [
        {"codigo": "EXP-DAE", "nombre": "Dua Exportación", "tipo_trafico": TipoTraficoEnum.exportacion,
         "tramo_partidas_min": 5, "up_base": 1.0, "precio_unitario": 18.0, "precio_partida_adicional": 1.5,
         "tiempo_estimado_min": 25, "tiempo_estimado_max": 45, "descripcion": "Dua de Exportación estándar"},
        {"codigo": "IMP-DUA", "nombre": "DUA Importación", "tipo_trafico": TipoTraficoEnum.importacion,
         "tramo_partidas_min": 5, "up_base": 1.6, "precio_unitario": 30.0, "precio_partida_adicional": 1.5,
         "tiempo_estimado_min": 45, "tiempo_estimado_max": 70, "descripcion": "DUA de Importación estándar"},
        {"codigo": "DVD", "nombre": "DUA Vinculación (DVD)", "tipo_trafico": TipoTraficoEnum.regimen_especial,
         "tramo_partidas_min": 1, "up_base": 2.5, "precio_unitario": 50.0, "precio_partida_adicional": 2.0,
         "tiempo_estimado_min": 60, "tiempo_estimado_max": 90, "descripcion": "DUA de Vinculación a Depósito"},
        {"codigo": "T2L-E", "nombre": "T2L de Entrada", "tipo_trafico": TipoTraficoEnum.importacion,
         "tramo_partidas_min": 1, "up_base": 2.0, "precio_unitario": 40.0, "precio_partida_adicional": 1.5,
         "tiempo_estimado_min": 40, "tiempo_estimado_max": 60, "descripcion": "T2L de Entrada"},
        {"codigo": "ATA", "nombre": "Cuadernos ATA", "tipo_trafico": TipoTraficoEnum.regimen_especial,
         "tramo_partidas_min": 1, "up_base": 4.0, "precio_unitario": 80.0, "precio_partida_adicional": 5.0,
         "tiempo_estimado_min": 90, "tiempo_estimado_max": 150, "descripcion": "Gestión de Cuadernos ATA"},
        {"codigo": "EXS", "nombre": "EXS", "tipo_trafico": TipoTraficoEnum.exportacion,
         "tramo_partidas_min": 1, "up_base": 1.3, "precio_unitario": 25.0, "precio_partida_adicional": 1.5,
         "tiempo_estimado_min": 30, "tiempo_estimado_max": 50, "descripcion": "Declaración sumaria de salida"},
    ]
    tipos = []
    for t_data in tipos_dua_data:
        t = TipoDua(**t_data)
        db.add(t)
        tipos.append(t)
    db.commit()

    # --- INCREMENTADORES (Servicios Adicionales Tarifas 2025) ---
    incs_data = [
        {"codigo": "T2L-S", "nombre": "T2L de Salida", "up_adicional": 0.8, "precio_unitario": 15.0},
        {"codigo": "EUR-1", "nombre": "EUR 1 / ATR", "up_adicional": 0.4, "precio_unitario": 8.0},
        {"codigo": "RMT", "nombre": "RMT / SRMT", "up_adicional": 0.5, "precio_unitario": 10.0},
        {"codigo": "AEAT", "nombre": "Gestión de pago AEAT", "up_adicional": 0.3, "precio_unitario": 5.0},
        {"codigo": "SAN-FAR", "nombre": "Sanidad y Farmacia", "up_adicional": 3.0, "precio_unitario": 60.0},
        {"codigo": "SOIVRE", "nombre": "Soivre/Fito/Cites", "up_adicional": 1.5, "precio_unitario": 30.0},
        {"codigo": "POSIC", "nombre": "Posicionado Mercancía", "up_adicional": 0.5, "precio_unitario": 15.0},
        {"codigo": "C5", "nombre": "Certificado C5", "up_adicional": 0.5, "precio_unitario": 15.0},
        {"codigo": "RECON", "nombre": "Reconocimiento Físico", "up_adicional": 5.0, "precio_unitario": 100.0},
        {"codigo": "ULT-DAE", "nombre": "Ultimación DAES / T1", "up_adicional": 0.3, "precio_unitario": 6.0},
        {"codigo": "ULT-T2L", "nombre": "Ultimación T2L", "up_adicional": 2.0, "precio_unitario": 40.0},
        {"codigo": "INC-NAR", "nombre": "Canal Naranja (Gestión)", "up_adicional": 0.3, "precio_unitario": 0.0},
        {"codigo": "INC-ROJ", "nombre": "Canal Rojo (Gestión)", "up_adicional": 0.8, "precio_unitario": 0.0},
    ]
    incrementadores = []
    for i_data in incs_data:
        i = Incrementador(**i_data)
        db.add(i)
        incrementadores.append(i)
    db.commit()

    # --- OPERARIOS Y OBJETIVOS ---
    operarios = [u for u in usuarios if u.rol == RolEnum.operario]
    base_objetivo_up = 250.0  # Ajustado a nuevas UPs

    ahora = datetime.now()
    meses_objetivo = []
    for i in range(3, -1, -1):
        mes_objetivo = ahora.month - i
        año_objetivo = ahora.year
        while mes_objetivo <= 0:
            mes_objetivo += 12
            año_objetivo -= 1
        meses_objetivo.append((año_objetivo, mes_objetivo))

    for op in operarios:
        for año_obj, mes_obj in meses_objetivo:
            obj = ObjetivoMes(
                operario_id=op.id,
                año=año_obj,
                mes=mes_obj,
                objetivo_up=base_objetivo_up,
                objetivo_tiempo_respuesta_horas=2.0,
                objetivo_tasa_incidencia_max=15.0,
                objetivo_tiempo_facturacion_horas=24.0,
            )
            db.add(obj)
    db.commit()

    # --- EXPEDIENTES DE PRUEBA ---
    tipos_exp = [t for t in tipos if t.tipo_trafico == TipoTraficoEnum.exportacion]
    tipos_imp = [t for t in tipos if t.tipo_trafico == TipoTraficoEnum.importacion]
    tipos_reg = [t for t in tipos if t.tipo_trafico == TipoTraficoEnum.regimen_especial]

    from services.calculo_up import calcular_up, calcular_partidas_adicionales, calcular_valor_facturacion

    contador = 1
    for año_exp, mes_exp in meses_objetivo:
        num_exp_mes = 45
        for _ in range(num_exp_mes):
            op = random.choice(operarios)
            rand = random.random()
            if rand < 0.60:
                tipo_dua = random.choice(tipos_exp)
            elif rand < 0.90:
                tipo_dua = random.choice(tipos_imp)
            else:
                tipo_dua = random.choice(tipos_reg)

            servicios = []
            if random.random() < 0.2:
                servicios.append(random.choice(incrementadores).id)

            dia_apertura = random.randint(1, 28)
            fecha_apertura = datetime(año_exp, mes_exp, dia_apertura, random.randint(8, 17), random.randint(0, 59))

            num_partidas = tipo_dua.tramo_partidas_min + random.randint(0, 8)
            incs_seleccionados = [i for i in incrementadores if i.id in servicios]
            
            up = calcular_up(tipo_dua, num_partidas, incs_seleccionados)
            valor = calcular_valor_facturacion(tipo_dua, num_partidas, incs_seleccionados)

            exp = Expediente(
                numero_expediente=f"GCT{año_exp}{mes_exp:02d}{contador:04d}",
                operario_id=op.id,
                tipo_dua_id=tipo_dua.id,
                cliente_nombre=random.choice(CLIENTES),
                tipo_trafico=tipo_dua.tipo_trafico,
                num_partidas=num_partidas,
                canal_respuesta=random.choices([CanalEnum.verde, CanalEnum.naranja, CanalEnum.rojo], weights=[70, 20, 10])[0],
                fecha_apertura_dossier=fecha_apertura,
                fecha_envio_aduana=fecha_apertura + timedelta(hours=random.uniform(1, 4)),
                servicios_adicionales=servicios,
                partidas_adicionales_count=max(0, num_partidas - tipo_dua.tramo_partidas_min),
                up_calculadas=up,
                valor_facturacion=valor,
                origen=OrigenEnum.manual,
                created_at=fecha_apertura,
            )
            db.add(exp)
            contador += 1
    db.commit()

    print(f"Seed completado con Tarifas 2025: {len(tipos)} tipos, {len(incrementadores)} servicios, {contador-1} expedientes.")

    # ─── NUEVO SISTEMA DE BONUS ───────────────────────────────────────────────

    # Config semestre actual
    año_actual = datetime.now().year
    sem_actual = 1 if datetime.now().month <= 6 else 2
    fecha_inicio = date(año_actual, 1, 1) if sem_actual == 1 else date(año_actual, 7, 1)
    fecha_fin = date(año_actual, 6, 30) if sem_actual == 1 else date(año_actual, 12, 31)

    cfg_bonus = ConfigBonusGlobal(
        año=año_actual,
        semestre=sem_actual,
        fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin,
        antiguedad_minima_meses=12,
        factor_equipo_activo=True,
        factor_equipo_porcentaje=0.05,
        factor_equipo_meses_minimos=4,
        peso_area1=0.40, peso_area2=0.30, peso_area3=0.20, peso_area4=0.10,
        peso_auto_evaluacion=0.30, peso_dir_evaluacion=0.70,
        tabla_tramos_escalonados=DEFAULT_TRAMOS,
        config_area1=DEFAULT_CONFIG_AREA1,
    )
    db.add(cfg_bonus)
    db.commit()
    db.refresh(cfg_bonus)

    # Factores de evaluación
    factores_data = [
        # Área 2 — Calidad Operativa
        (2, "Tasa de incidencias y errores en declaraciones atribuibles al operario", 1, "Canal rojo/naranja decidido por la AEAT queda excluido de penalización individual"),
        (2, "% de expedientes resueltos sin incidencias sobre el total gestionado", 2, None),
        (2, "Calidad del archivo documental y cumplimiento normativo", 3, None),
        (2, "Gestión autónoma de incidencias y comunicación proactiva con el cliente", 4, "Se ajusta si hay picos de trabajo extraordinarios"),
        # Área 3 — Gecotex Corporate
        (3, "Trabajo en equipo y colaboración con el equipo operativo", 1, None),
        (3, "Actitud, compromiso y proactividad en el día a día", 2, None),
        (3, "Cumplimiento de procedimientos internos y directrices de dirección", 3, None),
        (3, "Comunicación interna: respuesta ágil y coordinación entre áreas", 4, None),
        # Área 4 — Digitalización y Adaptación
        (4, "Adopción y uso correcto de la herramienta de gestión de DUAs", 1, None),
        (4, "Uso activo del dashboard de carga operativa del equipo", 2, None),
        (4, "Propuesta documentada de al menos 1 mejora de proceso en el semestre", 3, "0 propuestas = 5 · 1 propuesta documentada = 7 · 2 o más = 9-10"),
    ]
    factores = []
    for area, nombre, orden, nota in factores_data:
        f = FactorEvaluacion(area=area, nombre=nombre, orden=orden, nota_contexto=nota, activo=True)
        db.add(f)
        factores.append(f)
    db.commit()
    for f in factores:
        db.refresh(f)

    # Evaluación 'completada' para Cristian
    cristian = next((u for u in usuarios if u.email == "cristian@gecotex.es"), None)
    if cristian:
        from services.calculo_bonus import calcular_puntuacion_area1 as _calc_area1
        area1_cristian = _calc_area1(db, cristian.id, año_actual, sem_actual, cfg_bonus)
        ev_cristian = EvaluacionBonus(
            empleado_id=cristian.id,
            config_id=cfg_bonus.id,
            año=año_actual,
            semestre=sem_actual,
            estado=EstadoEvaluacionEnum.completada,
            salario_bruto_anual=cristian.salario_bruto_anual,
            pct_maximo_bonus=cristian.pct_maximo_bonus,
            factor_k_promedio=area1_cristian["factor_k_promedio"],
            pct_sla=area1_cristian["pct_sla"],
            pct_registro=area1_cristian["pct_registro"],
            puntuacion_area1=area1_cristian["puntuacion_area1"],
            notas_empleado_area2="He gestionado bien las incidencias y mantenido el archivo al día.",
            notas_director_area2="Buen rendimiento general, con algún retraso puntual en documentación.",
            notas_empleado_area3="Siempre disponible para ayudar al equipo y cumplo los procedimientos.",
            notas_director_area3="Actitud muy positiva y colaborativa.",
            notas_empleado_area4="Uso la aplicación diariamente y he propuesto una mejora en el registro de partidas.",
            notas_director_area4="Buen uso de las herramientas, propuesta documentada presentada.",
            fecha_inicio_auto_eval=datetime.now() - timedelta(days=10),
            fecha_fin_auto_eval=datetime.now() - timedelta(days=8),
            fecha_inicio_eval_dir=datetime.now() - timedelta(days=7),
        )
        db.add(ev_cristian)
        db.flush()
        # Respuestas de Cristian
        notas_cristian = {2: [7.0, 8.0, 7.5, 8.0], 3: [9.0, 8.5, 8.0, 9.0], 4: [8.0, 7.5, 7.0]}
        notas_dir_cristian = {2: [7.5, 8.0, 8.0, 7.5], 3: [9.0, 9.0, 8.5, 8.5], 4: [8.5, 8.0, 8.0]}
        for f in factores:
            notas_area = notas_cristian.get(f.area, [])
            notas_dir_area = notas_dir_cristian.get(f.area, [])
            idx = f.orden - 1
            nota_a = notas_area[idx] if idx < len(notas_area) else 7.0
            nota_d = notas_dir_area[idx] if idx < len(notas_dir_area) else 7.5
            nota_fin = round(nota_a * 0.30 + nota_d * 0.70, 2)
            r = RespuestaFactor(
                evaluacion_id=ev_cristian.id, factor_id=f.id,
                nota_auto=nota_a, nota_dir=nota_d, nota_final=nota_fin,
            )
            db.add(r)
        db.commit()
        # Calcular puntuaciones
        from services.calculo_bonus import calcular_evaluacion_completa as _calc_ev
        _calc_ev(db, ev_cristian.id)

    # Evaluación 'auto_evaluacion' para María
    maria = next((u for u in usuarios if u.email == "maria@gecotex.es"), None)
    if maria:
        area1_maria = _calc_area1(db, maria.id, año_actual, sem_actual, cfg_bonus)
        ev_maria = EvaluacionBonus(
            empleado_id=maria.id,
            config_id=cfg_bonus.id,
            año=año_actual,
            semestre=sem_actual,
            estado=EstadoEvaluacionEnum.evaluacion_dir,
            salario_bruto_anual=maria.salario_bruto_anual,
            pct_maximo_bonus=maria.pct_maximo_bonus,
            factor_k_promedio=area1_maria["factor_k_promedio"],
            pct_sla=area1_maria["pct_sla"],
            pct_registro=area1_maria["pct_registro"],
            puntuacion_area1=area1_maria["puntuacion_area1"],
            notas_empleado_area2="He mantenido la calidad de los expedientes al 100%.",
            notas_empleado_area3="Siempre disponible y puntual en todas las reuniones de equipo.",
            notas_empleado_area4="He propuesto dos mejoras este semestre: el sistema de alertas y el informe semanal.",
            fecha_inicio_auto_eval=datetime.now() - timedelta(days=5),
            fecha_fin_auto_eval=datetime.now() - timedelta(days=3),
            fecha_inicio_eval_dir=datetime.now() - timedelta(days=2),
        )
        db.add(ev_maria)
        db.flush()
        notas_maria = {2: [8.5, 9.0, 8.0, 8.5], 3: [9.0, 9.5, 8.5, 9.0], 4: [8.0, 8.5, 9.0]}
        for f in factores:
            idx = f.orden - 1
            notas_area = notas_maria.get(f.area, [])
            nota_a = notas_area[idx] if idx < len(notas_area) else 8.0
            r = RespuestaFactor(
                evaluacion_id=ev_maria.id, factor_id=f.id,
                nota_auto=nota_a,
            )
            db.add(r)
        db.commit()

    print("Seed bonus: configuración semestral, factores y evaluaciones demo creadas.")
