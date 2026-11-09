# -*- coding: utf-8 -*-
"""Build the 76-box inventory workbook for the 3/8 layout."""
import os
import sys
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation
from design_data import BOXES, CATS, SCHEMES, bom, row_boxes

GREEN = "2F6B5E"
GREEN_D = "234F46"
ORANGE = "C96F3B"
CREAM = "FBF3E8"
PALE = "F7F4EC"
INK = "202A24"
MUTED = "6E766E"
RULE = "D8D0C2"

thin = Side(style="thin", color=RULE)
BORDER = Border(left=thin, right=thin, top=thin, bottom=thin)
FONT = "微软雅黑"

SUGGEST = {
    "food": "零食、干货、囤货",
    "textile": "换季衣物、床品、鞋",
    "archive": "A4 文件、书籍、票据",
    "tools": "工具、螺丝、药品",
    "flex": "灵活柜，不装纸箱",
}


def setup_sheet(ws, headers, widths):
    ws.append(headers)
    for i, w in enumerate(widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = w
    for c in ws[1]:
        c.font = Font(name=FONT, size=10, bold=True, color="FFFFFF")
        c.fill = PatternFill("solid", fgColor=GREEN)
        c.alignment = Alignment(horizontal="center", vertical="center")
        c.border = BORDER
    ws.row_dimensions[1].height = 26
    ws.freeze_panes = "A2"


def style_rows(ws, start=2):
    for row in ws.iter_rows(min_row=start, max_row=ws.max_row, max_col=ws.max_column):
        for c in row:
            c.font = Font(name=FONT, size=9.5, color=INK)
            c.alignment = Alignment(vertical="center", wrap_text=False)
            c.border = BORDER
        if (row[0].row - start) % 2 == 1:
            for c in row:
                c.fill = PatternFill("solid", fgColor=PALE)


def build(path):
    wb = Workbook()
    ws = wb.active
    ws.title = "库存清单"

    headers = ["编号", "架号", "层位", "排", "板面高 mm", "箱型", "长 mm", "宽 mm", "高 mm",
               "容积 L", "分区", "建议内容", "实际内容", "重量 kg", "已封箱", "封箱日期", "备注"]
    widths = [13, 8, 7, 7, 10, 12, 8, 8, 8, 8, 10, 20, 25, 9, 8, 12, 18]
    setup_sheet(ws, headers, widths)

    levels = dict(SCHEMES["A"]["levels"])
    n = 0
    for sh in SCHEMES["A"]["shelves"]:
        for lev in ["L1", "L2", "L3", "L4"]:
            for row_name, boxes, suffix in [
                ("前排", row_boxes(sh, lev, False), ""),
                ("后排", row_boxes(sh, lev, True), "B"),
            ]:
                for i, b in enumerate(boxes, 1):
                    n += 1
                    box = BOXES[b]
                    ws.append([
                        f'{sh["id"]}-{lev}-{suffix}{i:02d}',
                        f'{sh["id"]}号架', lev, row_name, levels[lev],
                        f'{box["label"]} {box["vol"]}', box["w"], box["d"], box["h"],
                        round(box["v"], 2), CATS[sh["cat"]]["name"], SUGGEST[sh["cat"]],
                        "", "", "", "",
                    ])
    style_rows(ws)
    for row in ws.iter_rows(min_row=2, max_row=ws.max_row):
        row[0].font = Font(name=FONT, size=9.5, bold=True, color=GREEN_D)
        row[3].alignment = Alignment(horizontal="center", vertical="center")
        row[14].alignment = Alignment(horizontal="center", vertical="center")
    ws.auto_filter.ref = f"A1:Q{ws.max_row}"
    dv = DataValidation(type="list", formula1='"是,否"', allow_blank=True)
    ws.add_data_validation(dv)
    dv.add(f"O2:O{ws.max_row}")

    # box specs
    ws2 = wb.create_sheet("纸箱规格")
    headers2 = ["箱号", "容积", "长 mm", "宽 mm", "高 mm", "建议用途", "数量", "摆放"]
    setup_sheet(ws2, headers2, [10, 9, 9, 9, 9, 38, 10, 36])
    counts, _, _ = bom("A")
    for b in (3, 8):
        box = BOXES[b]
        place = "双排：前4+后4（1.5m）/前2+后2（1.0m）" if b == 3 else "转90°：32沿架长、48进深"
        ws2.append([box["label"], box["vol"], box["w"], box["d"], box["h"], box["use"], counts[b], place])
    style_rows(ws2)
    ws2.append(["合计", "", "", "", "", "", 76, ""])
    for c in ws2[ws2.max_row]:
        c.font = Font(name=FONT, size=9.5, bold=True, color=INK)
        c.fill = PatternFill("solid", fgColor=CREAM)
        c.border = BORDER
    for row in ws2.iter_rows(min_row=2, max_row=ws2.max_row):
        row[6].alignment = Alignment(horizontal="center", vertical="center")
    ws2.auto_filter.ref = f"A1:H{ws2.max_row}"

    # cabinet summary
    ws3 = wb.create_sheet("柜位汇总")
    headers3 = ["柜位", "位置", "架长 m", "箱型", "每层", "层数", "合计", "状态"]
    setup_sheet(ws3, headers3, [10, 18, 10, 20, 8, 8, 8, 18])
    rows3 = [
        ("1号", "上墙左", 1.5, "3号 单排", "4", 4, 16, "食品"),
        ("2号", "上墙右", 1.5, "8号 转90°", "4", 4, 16, "衣物"),
        ("3号", "右墙", 1.5, "3号 双排", "8", 4, 32, "档案"),
        ("4号", "下墙左", 1.0, "8号4 + 3号8", "2 / 4", 4, 12, "工具"),
        ("5号", "下墙右", 1.0, "—", "0", 0, 0, "灵活柜"),
    ]
    for r in rows3:
        ws3.append(list(r))
    style_rows(ws3)
    ws3.append(["合计", "", "", "", "", "", 76, ""])
    for c in ws3[ws3.max_row]:
        c.font = Font(name=FONT, size=9.5, bold=True, color=INK)
        c.fill = PatternFill("solid", fgColor=CREAM)
        c.border = BORDER
    ws3.auto_filter.ref = f"A1:H{ws3.max_row}"

    # comparison
    ws4 = wb.create_sheet("推荐与满载")
    ws4.merge_cells("A1:F1")
    ws4["A1"] = "推荐 76 箱 / 满载 92 箱"
    ws4["A1"].font = Font(name=FONT, size=15, bold=True, color=INK)
    ws4["A1"].alignment = Alignment(vertical="center")
    ws4.row_dimensions[1].height = 30
    rows4 = [
        ("方案", "3号", "8号", "总箱", "容积 m³", "说明"),
        ("推荐", 56, 20, 76, 2.04, "食品单排；取放不挪箱"),
        ("满载", 72, 20, 92, 2.39, "1号食品也双排；后排要挪箱"),
    ]
    for r in rows4:
        ws4.append(list(r))
    for row in ws4.iter_rows(min_row=2, max_row=ws4.max_row, max_col=6):
        for c in row:
            c.font = Font(name=FONT, size=10, color=INK, bold=(c.row == 2))
            c.border = BORDER
            c.alignment = Alignment(vertical="center", horizontal="center" if c.column > 1 else "left")
        if row[0].row == 2:
            for c in row:
                c.fill = PatternFill("solid", fgColor=GREEN)
                c.font = Font(name=FONT, size=10, color="FFFFFF", bold=True)
    for col in "ABCDEF":
        ws4.column_dimensions[col].width = 18 if col == "A" else 22

    # instructions
    ws5 = wb.create_sheet("使用说明")
    ws5.column_dimensions["A"].width = 4
    ws5.column_dimensions["B"].width = 110
    lines = [
        ("储藏室收纳系统 / 3号 + 8号 / 使用说明", 16, True, GREEN_D),
        ("", 10, False, INK),
        ("1. 5 个货架位置按图不变；1–4 号架放箱，5 号架留空。", 10.5, False, INK),
        ("2. 3号双排只放档案/低频；食品和工具单排，取放不用挪前排。", 10.5, False, INK),
        ("3. 8号转 90°：32 沿架长、48 进深；1.0m 架每层只放 2 个。", 10.5, False, INK),
        ("4. 后排箱号加 B，例如 3-L2-B03；标签贴短边，开口朝外。", 10.5, False, INK),
        ("5. 5号架拆 500/875/1250，留 1625/2000；放吸尘器、梯子、熨衣板。", 10.5, False, INK),
        ("6. 单层不超过 40 kg；单箱不超过 15 kg；书/文件箱不超过 10 kg。", 10.5, False, INK),
        ("", 10, False, INK),
        ("颜色：推荐 76；满载 92。尺寸为外尺寸，单位 mm；容积按外尺寸计算。", 9, False, MUTED),
    ]
    for i, (text, size, bold, color) in enumerate(lines, 1):
        c = ws5.cell(row=i, column=2, value=text)
        c.font = Font(name=FONT, size=size, bold=bold, color=color)
        c.alignment = Alignment(vertical="center", wrap_text=True)
        ws5.row_dimensions[i].height = 26 if i == 1 else 22

    ws.sheet_properties.tabColor = GREEN
    ws2.sheet_properties.tabColor = ORANGE
    ws3.sheet_properties.tabColor = "6F82A6"
    ws4.sheet_properties.tabColor = "8F8270"
    ws5.sheet_properties.tabColor = "D99A3E"

    wb.save(path)
    print("saved", path, "rows", n)


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else r"E:\deepseek\储藏室系统开发\output\储藏室箱体清单_3号8号.xlsx"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    build(out)
