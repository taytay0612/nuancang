# -*- coding: utf-8 -*-
"""Build the inventory workbook for scheme A."""
import os
import sys
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation
from design_data import BOXES, CATS, SCHEMES, bom

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
    "misc": "清洁、宠物、纪念品",
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
    ws.auto_filter.ref = f"A1:{get_column_letter(len(headers))}{ws.max_row}"


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
    ws.title = "库存清单_A"

    headers = ["编号", "架号", "层位", "板面高 mm", "箱型", "长 mm", "宽 mm", "高 mm",
               "容积 L", "分区", "建议内容", "实际内容", "重量 kg", "已封箱", "封箱日期", "备注"]
    widths = [13, 9, 7, 11, 13, 8, 8, 8, 8, 11, 22, 26, 10, 8, 12, 20]
    setup_sheet(ws, headers, widths)

    levels = dict(SCHEMES["A"]["levels"])
    n = 0
    for sh in SCHEMES["A"]["shelves"]:
        for lev in ["L1", "L2", "L3", "L4", "TOP"]:
            boxes = sh["rows"].get(lev, [])
            for i, b in enumerate(boxes, 1):
                n += 1
                board = 2000 if lev == "TOP" else levels[lev]
                box = BOXES[b]
                ws.append([
                    f'{sh["id"]}-{lev}-{i:02d}',
                    f'{sh["id"]}号架',
                    lev,
                    board,
                    f'{box["label"]} {box["vol"]}',
                    box["w"], box["d"], box["h"],
                    round(box["v"], 2),
                    CATS[sh["cat"]]["name"],
                    SUGGEST[sh["cat"]],
                    "", "", "", "",
                ])
    style_rows(ws)
    for row in ws.iter_rows(min_row=2, max_row=ws.max_row):
        row[0].font = Font(name=FONT, size=9.5, bold=True, color=GREEN_D)
        row[9].alignment = Alignment(horizontal="center", vertical="center")
        row[13].alignment = Alignment(horizontal="center", vertical="center")
    ws.auto_filter.ref = f"A1:P{ws.max_row}"

    dv = DataValidation(type="list", formula1='"是,否"', allow_blank=True)
    ws.add_data_validation(dv)
    dv.add(f"N2:N{ws.max_row}")

    # summary sheet
    ws2 = wb.create_sheet("纸箱规格")
    headers2 = ["箱号", "容积", "长 mm", "宽 mm", "高 mm", "建议用途", "A 数量", "B 数量", "C 数量"]
    setup_sheet(ws2, headers2, [10, 9, 9, 9, 9, 34, 10, 10, 10])
    cnt = {k: bom(k)[0] for k in "ABC"}
    for b in sorted(BOXES):
        box = BOXES[b]
        ws2.append([box["label"], box["vol"], box["w"], box["d"], box["h"], box["use"],
                    cnt["A"].get(b, 0), cnt["B"].get(b, 0), cnt["C"].get(b, 0)])
    style_rows(ws2)
    ws2.auto_filter.ref = f"A1:I{ws2.max_row}"
    ws2.append(["合计", "", "", "", "", "", sum(cnt["A"].values()), sum(cnt["B"].values()), sum(cnt["C"].values())])
    for c in ws2[ws2.max_row]:
        c.font = Font(name=FONT, size=9.5, bold=True, color=INK)
        c.fill = PatternFill("solid", fgColor=CREAM)
        c.border = BORDER
    for row in ws2.iter_rows(min_row=2, max_row=ws2.max_row):
        for i in (6, 7, 8):
            row[i].alignment = Alignment(horizontal="center", vertical="center")

    # comparison
    ws3 = wb.create_sheet("方案对比")
    ws3.merge_cells("A1:D1")
    ws3["A1"] = "储藏室货架 / 纸箱方案对比"
    ws3["A1"].font = Font(name=FONT, size=15, bold=True, color=INK)
    ws3["A1"].alignment = Alignment(vertical="center")
    ws3.row_dimensions[1].height = 30
    rows = [
        ("指标", "A 均衡型（推荐）", "B 细分型", "C 大件型"),
        ("层数", "5 层", "6 层", "4 层"),
        ("层距 mm", 375, 300, 500),
        ("箱层净高 mm", 345, 270, 470),
        ("深度 mm", 500, 400, 500),
        ("通道 mm", 1380, 1580, 1380),
        ("纸箱数量", 72, 94, 52),
        ("箱容积 m³", 2.26, 2.11, 2.17),
        ("底板数", 25, 30, 20),
        ("适合", "综合", "小件、文具多", "大件、被褥多"),
    ]
    for r in rows:
        ws3.append(list(r))
    for row in ws3.iter_rows(min_row=2, max_row=ws3.max_row, max_col=4):
        for c in row:
            c.font = Font(name=FONT, size=10, color=INK, bold=(c.row == 2))
            c.border = BORDER
            c.alignment = Alignment(vertical="center", horizontal="center" if c.column > 1 else "left")
        if row[0].row == 2:
            for c in row:
                c.fill = PatternFill("solid", fgColor=GREEN)
                c.font = Font(name=FONT, size=10, color="FFFFFF", bold=True)
    for col in "ABCD":
        ws3.column_dimensions[col].width = 18 if col == "A" else 26

    # instructions
    ws4 = wb.create_sheet("使用说明")
    ws4.column_dimensions["A"].width = 4
    ws4.column_dimensions["B"].width = 110
    lines = [
        ("储藏室收纳系统 / 清单使用说明", 16, True, GREEN_D),
        ("", 10, False, INK),
        ("1. 先按 A 方案的 72 个箱下单；B / C 的箱单见 PDF 的 P3 / P4。", 10.5, False, INK),
        ("2. 箱到后先按编号贴标：架号-层号-序号，例如 1-L3-02。顶层写 TOP。", 10.5, False, INK),
        ("3. 在“实际内容”里写物品名；“重量 kg”可空，超过 10 kg 的箱在备注写“重”。", 10.5, False, INK),
        ("4. 重的在下，轻的在上；书 / 文件单箱 ≤10 kg，单层 ≤40 kg。", 10.5, False, INK),
        ("5. 底部 500 mm 不放纸箱：行李箱、吸尘器、折叠凳、桶装水。", 10.5, False, INK),
        ("6. 每半年盘点一次；空箱保留，换季时对调顶层与低层。", 10.5, False, INK),
        ("", 10, False, INK),
        ("颜色：A 推荐；B 细分；C 大件。 尺寸：外尺寸，单位 mm；容积按外尺寸计算。", 9, False, MUTED),
        ("注意：底留 500 为板面高，板下净高约 470；安装前用实物箱复核。", 9, False, MUTED),
    ]
    for i, (text, size, bold, color) in enumerate(lines, 1):
        c = ws4.cell(row=i, column=2, value=text)
        c.font = Font(name=FONT, size=size, bold=bold, color=color)
        c.alignment = Alignment(vertical="center", wrap_text=True)
        ws4.row_dimensions[i].height = 26 if i == 1 else 22

    # tab colors
    ws.sheet_properties.tabColor = GREEN
    ws2.sheet_properties.tabColor = ORANGE
    ws3.sheet_properties.tabColor = "6F82A6"
    ws4.sheet_properties.tabColor = "8F8270"

    wb.save(path)
    print("saved", path, "rows", ws.max_row - 1)


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else r"E:\deepseek\储藏室系统开发\output\储藏室箱体清单_方案A.xlsx"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    build(out)
