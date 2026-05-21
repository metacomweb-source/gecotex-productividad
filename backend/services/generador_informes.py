from io import BytesIO
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from datetime import datetime


COLOR_HEADER = "1F3864"
COLOR_VERDE = "27AE60"
COLOR_NARANJA = "E67E22"
COLOR_ROJO = "C0392B"


def _header_style(ws, row, headers):
    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=row, column=col, value=header)
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = PatternFill(fill_type="solid", fgColor=COLOR_HEADER)
        cell.alignment = Alignment(horizontal="center")
    ws.row_dimensions[row].height = 18


def _auto_width(ws):
    for col in ws.columns:
        max_len = max((len(str(cell.value or "")) for cell in col), default=8)
        ws.column_dimensions[get_column_letter(col[0].column)].width = min(max_len + 4, 40)


def generar_informe_productividad(datos_operarios: list, año: int, mes: int) -> BytesIO:
    wb = Workbook()
    ws = wb.active
    ws.title = f"Productividad {mes:02d}/{año}"

    ws["A1"] = f"GECOTEX — Informe de Productividad {mes:02d}/{año}"
    ws["A1"].font = Font(bold=True, size=14, color=COLOR_HEADER)
    ws.merge_cells("A1:K1")

    headers = ["Operario", "UPs Producidas", "Objetivo UP", "% Cumplimiento", "Factor K",
               "Nº Expedientes", "% Incidencia", "TMT (min)", "TF (horas)", "Tiempo Respuesta (min)", "% Bonus"]
    _header_style(ws, 3, headers)

    for i, op in enumerate(datos_operarios, 4):
        ws.cell(row=i, column=1, value=op.get("operario_nombre", ""))
        ws.cell(row=i, column=2, value=op.get("up_producidas", 0))
        ws.cell(row=i, column=3, value=op.get("objetivo_up", ""))
        pct = op.get("pct_cumplimiento")
        ws.cell(row=i, column=4, value=f"{pct:.1f}%" if pct is not None else "")
        k = op.get("factor_k")
        cell_k = ws.cell(row=i, column=5, value=round(k, 3) if k is not None else "")
        if k is not None:
            if k >= 1.0:
                cell_k.fill = PatternFill(fill_type="solid", fgColor=COLOR_VERDE)
            elif k >= 0.85:
                cell_k.fill = PatternFill(fill_type="solid", fgColor=COLOR_NARANJA)
            else:
                cell_k.fill = PatternFill(fill_type="solid", fgColor=COLOR_ROJO)
        ws.cell(row=i, column=6, value=op.get("num_expedientes", 0))
        ws.cell(row=i, column=7, value=f"{op.get('tasa_incidencia', 0):.1f}%")
        ws.cell(row=i, column=8, value=op.get("tiempo_medio_tramitacion_min", ""))
        ws.cell(row=i, column=9, value=op.get("tiempo_medio_facturacion_horas", ""))
        ws.cell(row=i, column=10, value=op.get("tiempo_medio_respuesta_min", ""))
        ws.cell(row=i, column=11, value=f"{op.get('bonus_individual_pct', 0)*100:.1f}%" if op.get("bonus_individual_pct") is not None else "")

    _auto_width(ws)
    buf = BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf


def generar_informe_expedientes(expedientes: list) -> BytesIO:
    wb = Workbook()
    ws = wb.active
    ws.title = "Expedientes"

    headers = ["Nº Expediente", "Operario", "Cliente", "Tipo DUA", "Tráfico", "Canal",
               "UPs", "Partidas", "F.Recepción", "F.Apertura", "F.Envío Aduana", "F.Levante", "F.Facturación", "Origen"]
    _header_style(ws, 1, headers)

    for i, exp in enumerate(expedientes, 2):
        ws.cell(row=i, column=1, value=exp.get("numero_expediente", ""))
        ws.cell(row=i, column=2, value=exp.get("operario_nombre", ""))
        ws.cell(row=i, column=3, value=exp.get("cliente_nombre", ""))
        ws.cell(row=i, column=4, value=exp.get("tipo_dua_nombre", ""))
        ws.cell(row=i, column=5, value=exp.get("tipo_trafico", ""))
        canal = exp.get("canal_respuesta", "")
        cell_canal = ws.cell(row=i, column=6, value=canal)
        if canal == "verde":
            cell_canal.fill = PatternFill(fill_type="solid", fgColor=COLOR_VERDE)
        elif canal == "naranja":
            cell_canal.fill = PatternFill(fill_type="solid", fgColor=COLOR_NARANJA)
        elif canal == "rojo":
            cell_canal.fill = PatternFill(fill_type="solid", fgColor=COLOR_ROJO)
        ws.cell(row=i, column=7, value=exp.get("up_calculadas", 0))
        ws.cell(row=i, column=8, value=exp.get("num_partidas", 1))
        for col, campo in enumerate([
            "fecha_recepcion_correo", "fecha_apertura_dossier", "fecha_envio_aduana",
            "fecha_levante", "fecha_envio_facturacion"
        ], 9):
            val = exp.get(campo)
            ws.cell(row=i, column=col, value=val.strftime("%d/%m/%Y %H:%M") if val else "")
        ws.cell(row=i, column=14, value=exp.get("origen", ""))

    _auto_width(ws)
    buf = BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf


MESES_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]


def generar_informe_bonus(datos_bonus: list, año: int) -> BytesIO:
    wb = Workbook()
    ws = wb.active
    ws.title = f"Bonus {año}"

    ws["A1"] = f"GECOTEX — Tabla de Bonus Anual {año}"
    ws["A1"].font = Font(bold=True, size=14, color=COLOR_HEADER)
    ws.merge_cells("A1:I1")

    headers = ["Mes", "Operario", "Antigüedad (m)", "Elegible", "UPs Producidas", "Objetivo UP", "Factor K", "% Bonus Prod.", "% Bonus Indiv."]
    _header_style(ws, 3, headers)

    for i, item in enumerate(datos_bonus, 4):
        mes = item.get("mes", 0)
        ws.cell(row=i, column=1, value=MESES_ES[mes - 1] if 1 <= mes <= 12 else mes)
        ws.cell(row=i, column=2, value=item.get("operario_nombre", ""))
        ws.cell(row=i, column=3, value=item.get("antiguedad_meses", 0))
        ws.cell(row=i, column=4, value="Sí" if item.get("elegible") else "No")
        ws.cell(row=i, column=5, value=round(item.get("up_producidas", 0), 2))
        ws.cell(row=i, column=6, value=round(item.get("objetivo_up", 0), 2))
        k = item.get("factor_k", 0) or 0
        cell_k = ws.cell(row=i, column=7, value=round(k, 3))
        if k >= 1.0:
            cell_k.fill = PatternFill(fill_type="solid", fgColor=COLOR_VERDE)
        elif k >= 0.85:
            cell_k.fill = PatternFill(fill_type="solid", fgColor=COLOR_NARANJA)
        else:
            cell_k.fill = PatternFill(fill_type="solid", fgColor=COLOR_ROJO)
        pct_prod = item.get("porcentaje_bonus_productividad", 0) or 0
        pct_ind = item.get("bonus_individual_pct", 0) or 0
        ws.cell(row=i, column=8, value=f"{pct_prod * 100:.1f}%")
        ws.cell(row=i, column=9, value=f"{pct_ind * 100:.1f}%")

    _auto_width(ws)
    buf = BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf
