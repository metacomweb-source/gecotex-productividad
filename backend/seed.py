import random
from datetime import datetime, timedelta, date
from sqlalchemy.orm import Session
from auth import hash_password
from models.usuario import Usuario, RolEnum, DepartamentoEnum
from models.tipo_dua import TipoDua, TipoTraficoEnum
from models.incrementador import Incrementador
from models.expediente import Expediente, CanalEnum, OrigenEnum
from models.objetivo_mes import ObjetivoMes
from models.parametros_bonus import ParametrosBonus, DEFAULT_TABLA_FACTOR_K
from models.notificacion import Notificacion, TipoNotificacionEnum


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
         "rol": RolEnum.operario, "departamento": DepartamentoEnum.operaciones, "fecha_incorporacion": date(2020, 9, 1)},
        {"nombre": "María", "apellidos": "Fernández", "email": "maria@gecotex.es", "password": "demo123",
         "rol": RolEnum.operario, "departamento": DepartamentoEnum.operaciones, "fecha_incorporacion": date(2021, 1, 15)},
        {"nombre": "Jorge", "apellidos": "Pérez", "email": "jorge@gecotex.es", "password": "demo123",
         "rol": RolEnum.operario, "departamento": DepartamentoEnum.operaciones, "fecha_incorporacion": date(2019, 11, 1)},
        {"nombre": "Silvia", "apellidos": "Romero", "email": "silvia@gecotex.es", "password": "demo123",
         "rol": RolEnum.operario, "departamento": DepartamentoEnum.operaciones, "fecha_incorporacion": date(2022, 4, 1)},
        {"nombre": "Ana", "apellidos": "Torres", "email": "ana@gecotex.es", "password": "demo123",
         "rol": RolEnum.operario, "departamento": DepartamentoEnum.operaciones, "fecha_incorporacion": date(2020, 7, 1)},
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

    # --- PARÁMETROS BONUS ---
    años_bonus = [datetime.now().year - 1, datetime.now().year]
    for año_bonus in años_bonus:
        pb = ParametrosBonus(
            año=año_bonus,
            objetivo_crecimiento_facturacion=0.15,
            factor_disponibilidad=0.70,
            antiguedad_minima_meses=12,
            peso_productividad_individual=0.40,
            peso_resultado_global=0.60,
            tabla_factor_k=DEFAULT_TABLA_FACTOR_K,
        )
        db.add(pb)
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
