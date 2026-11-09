# -*- coding: utf-8 -*-
"""V2 page 2: five elevations, BOM and per-tier matrix."""
import sys
from design_data import BOXES, CATS, SCHEMES, bom, row_boxes, box_dims, SHELF_H, BOTTOM
from render_design import (C, rgb, mix, light, dark, lum, INK, MUTED, RULE, GREEN, GREEN_D,
                           ORANGE, SAND, FRAME, BOARD, ROOMBG, BG, PAPER, WARN,
                           footer, header, spec_strip)


def draw_ruler(c, x, base_y, sc, levels):
    top = base_y - 2650 * sc
    c.line(x, top, x, base_y, MUTED, .3)
    for h, lab in [(0, "0"), (500, "500"), (2000, "2000 TOP"), (2650, "2650 室高")]:
        yy = base_y - h * sc
        c.line(x - 1.6, yy, x, yy, MUTED, .35)
        c.text(x - 2.2, yy, lab, 6.2, MUTED, anchor="rm")
    for lev, h in levels:
        yy = base_y - h * sc
        c.line(x + .2, yy, x + 2.2, yy, mix(MUTED, SAND, .3), .3)
        c.text(x + 3.0, yy, lev, 6.0, GREEN_D, "b", anchor="lm")
    c.text(x - 2.2, top - 4.4, "mm", 6.0, MUTED, anchor="rm")


def draw_shelf(c, sh, sx, base_y, sc, mode="normal"):
    s = SCHEMES["A"]
    w = sh["len"] * sc
    top_y = base_y - SHELF_H * sc
    levels = s["levels"]
    cat = CATS[sh["cat"]]["color"]
    clear_len = sh["len"] - 40
    tall = mode == "flex_tall"
    shelf_flex = mode == "flex_shelf"

    c.rect(sx, base_y - 2650 * sc, w, 2650 * sc, fill=ROOMBG)
    if not tall:
        c.rect(sx, base_y - BOTTOM * sc, w, BOTTOM * sc, fill=mix(BG, SAND, .22))
        c.dash(sx, base_y - BOTTOM * sc, sx + w, base_y - BOTTOM * sc, mix(SAND, MUTED, .3), .3, 1.4, 1.2)
    c.rect(sx, top_y, 1.5, SHELF_H * sc, fill=FRAME)
    c.rect(sx + w - 1.5, top_y, 1.5, SHELF_H * sc, fill=FRAME)
    c.line(sx, base_y, sx + w, base_y, FRAME, .8)

    boards = [h for _, h in levels] + [SHELF_H]
    for h in boards:
        yy = base_y - h * sc
        removed = tall and h in (500, 875, 1250)
        if removed:
            c.dash(sx + 1.5, yy, sx + w - 1.5, yy, mix(BOARD, MUTED, .25), .35, 2.0, 1.2)
            c.text(sx + 3.0, yy - 3.2, "拆", 5.2, MUTED, "b")
        else:
            c.rect(sx, yy - 1.0, w, 1.0, fill=BOARD, outline=dark(BOARD, .18), width=.18)
            c.line(sx + 1.5, yy + .1, sx + w - 1.5, yy + .1, dark(BOARD, .25), .2)

    if mode == "normal":
        for lev, h in levels:
            front = row_boxes(sh, lev, False)
            if not front:
                continue
            used = sum(box_dims(b, True)[0] for b in front) + 5 * max(0, len(front) - 1)
            start = sx + (20 + (clear_len - used) / 2) * sc
            cursor = start
            for b in front:
                bw = box_dims(b, True)[0] * sc
                bh = BOXES[b]["h"] * sc
                by = base_y - (h + BOXES[b]["h"]) * sc
                c.rect(cursor, by, bw, bh, fill=cat, outline=dark(cat, .22), width=.25, r=.3)
                c.rect(cursor + .3, by + .25, bw - .6, .45, fill=light(cat, .22))
                c.text(cursor + bw / 2, by + bh / 2, str(b), 7.0,
                       "#FFFFFF" if lum(cat) < 155 else INK, "b", anchor="mm")
                cursor += bw + 5 * sc

    if tall:
        c.text(sx + w / 2, base_y - 800 * sc, "通高 1.6 m", 6.2, mix(MUTED, CATS["flex"]["color"], .35), "b", anchor="mm")
        c.text(sx + w / 2, base_y - 80 * sc, "底 50 留空", 5.2, MUTED, anchor="mm")
    elif shelf_flex:
        c.text(sx + w / 2, base_y - 920 * sc, "5 层全留", 6.2, mix(MUTED, CATS["flex"]["color"], .35), "b", anchor="mm")
        c.text(sx + w / 2, base_y - 260 * sc, "底 50 空", 5.4, MUTED, anchor="mm")
    else:
        c.text(sx + w / 2, base_y - BOTTOM * sc / 2, "500 大件位", 5.8, mix(MUTED, SAND, .3), anchor="mm")

    ly = base_y + 2.0
    label = f'{sh["id"]}号架 · {CATS[sh["cat"]]["name"]}'
    tw = c.tw(label, 7.0, "b")
    tx = sx + w / 2 - tw / 2
    c.d.ellipse([c.X(tx - 2.2), c.X(ly + .5), c.X(tx - .9), c.X(ly + 1.8)], fill=rgb(cat))
    c.text(tx, ly, label, 7.0, INK, "b", anchor="lt")
    if tall:
        sub = "0 箱 · 通高 1.6 m"
    elif shelf_flex:
        sub = "0 箱 · 5 层全留"
    elif sh["cat"] == "bedding":
        sub = "1500×500 · 8号 4/层"
    else:
        sub = "1500×500 · 3号 单排 5/层"
    c.text(sx + w / 2, ly + 5.2, sub, 6.1, MUTED, anchor="mt")


def page2(c):
    header(c, "PLAN 02 / 3号 + 8号", "三柜放箱，两柜灵活",
           "1–2 号架放 3 号；3 号架放 8 号；4–5 号架留 5 层。", "", right_stat="")
    c.text(402, 15.2, "56", 30, ORANGE, "n", anchor="rt")
    c.text(402, 29.2, "个纸箱", 6.8, MUTED, anchor="rt")
    c.text(360, 18.0, "1.52", 13, INK, "n", anchor="rt")
    c.text(360, 24.0, "m³ 箱容积", 6.2, MUTED, anchor="rt")
    c.line(344, 15.5, 344, 33.0, RULE, .3)

    items = [("层数", "5 层"), ("层距", "375"), ("箱层净高", "345"), ("深度", "500"),
             ("底留", "500"), ("顶留", "650"), ("通道", "1380")]
    spec_strip(c, items, y=48.0, h=9.2)

    base_y = 184.0
    sc = 1 / 22
    draw_ruler(c, 27, base_y, sc, SCHEMES["A"]["levels"])
    xs = [42.0]
    for sh in SCHEMES["A"]["shelves"][:-1]:
        xs.append(xs[-1] + sh["len"] * sc + 6.0)
    for i, sh in enumerate(SCHEMES["A"]["shelves"]):
        mode = "flex_shelf" if sh["id"] in (4, 5) else "normal"
        draw_shelf(c, sh, xs[i], base_y, sc, mode=mode)
    c.dash(40, base_y - 2650 * sc, 386, base_y - 2650 * sc, mix(SAND, MUTED, .25), .3, 2.0, 1.4)
    c.text(386, base_y - 2650 * sc - 3.2, "室高 2650", 6.0, MUTED, anchor="rt")

    # BOM summary (left) and matrix (right)
    by = 200.0
    c.text(18, by - 5.0, "纸箱清单", 10.5, INK, "b")
    c.text(48, by - 4.4, "只买 3 号 / 8 号", 6.6, GREEN, "b")
    cols = [18, 56, 20, 18, 70]
    heads = ["箱号", "外尺寸 mm", "容积", "数量", "柜位"]
    hh = 7.0
    c.rect(18, by, 182, hh, fill=GREEN_D, r=.6)
    xx = 18
    for i, hd in enumerate(heads):
        c.text(xx + 2.0, by + hh / 2, hd, 6.2, "#FFFFFF", "b", anchor="lm")
        xx += cols[i]
    yy = by + hh
    rows = [("3号", "340×250×260", "21L", 40, "1 / 2"), ("8号", "480×320×260", "37L", 16, "3")]
    for i, (b, size, vol, n, loc) in enumerate(rows):
        c.rect(18, yy, 182, 7.4, fill=PAPER if i == 0 else mix(PAPER, BG, .55))
        c.text(20, yy + 3.7, b, 7.4, INK, "b", anchor="lm")
        c.text(36, yy + 3.7, size, 6.6, INK, anchor="lm")
        c.text(92, yy + 3.7, vol, 6.8, INK, anchor="lm")
        c.text(112, yy + 3.7, str(n), 9.0, GREEN_D, "b", anchor="lm")
        c.text(130, yy + 3.7, loc, 6.6, MUTED, anchor="lm")
        yy += 7.4
    c.line(18, yy, 200, yy, RULE, .3)
    c.text(20, yy + 1.6, "合计 56 个 · 1.52 m³", 7.2, INK, "b")

    # box use block under BOM
    c.text(18, 228.0, "箱型分工", 7.0, MUTED, "b")
    c.text(18, 234.0, "3号 34×25×26：食品、档案、工具小件。", 6.4, INK)
    c.text(18, 240.0, "8号 48×32×26：衣物、床品、工具大件。", 6.4, INK)
    c.text(18, 246.0, "4/5 号都留 5 层做周转；不拆板。", 6.4, MUTED)

    # matrix
    mx, mw = 208, 194
    c.text(mx, by - 5.0, "每层箱数", 10.5, INK, "b")
    c.text(mx + 34, by - 4.4, "3号单排5/层；8号转90°", 5.8, MUTED)
    hh2 = 8.0
    c.rect(mx, by, mw, hh2, fill=GREEN_D, r=.6)
    heads2 = ["柜", "L1", "L2", "L3", "L4", "合计"]
    colw = [34, 32, 32, 32, 32, 32]
    xx = mx
    for i, hd in enumerate(heads2):
        c.text(xx + colw[i] / 2, by + hh2 / 2, hd, 6.4, "#FFFFFF", "b", anchor="mm")
        xx += colw[i]
    data = [
        ("1 食品", "3×5", "3×5", "3×5", "3×5", "20"),
        ("2 衣物", "3×5", "3×5", "3×5", "3×5", "20"),
        ("3 床品", "8×4", "8×4", "8×4", "8×4", "16"),
        ("4 灵活层板", "—", "—", "—", "—", "0"),
        ("5 灵活层板", "—", "—", "—", "—", "0"),
        ("合计", "14", "14", "14", "14", "56"),
    ]
    yy = by + hh2
    for ri, row in enumerate(data):
        if ri == 5:
            c.rect(mx, yy, mw, 7.0, fill=mix(BG, SAND, .35))
        elif ri % 2 == 0:
            c.rect(mx, yy, mw, 7.0, fill=mix(PAPER, BG, .45))
        c.line(mx, yy + 7.0, mx + mw, yy + 7.0, RULE, .2)
        for ci, v in enumerate(row):
            c.text(mx + sum(colw[:ci]) + colw[ci] / 2, yy + 3.5, v,
                   7.0 if ci else 6.8, INK if ci in (0, 5) else MUTED,
                   "b" if ci in (0, 5) else "r", anchor="mm")
        yy += 7.0
    for i in range(1, 6):
        c.line(mx + sum(colw[:i]), by, mx + sum(colw[:i]), yy, RULE, .2)
    c.rect(mx, by, mw, hh2 + 7.0 * len(data), outline=RULE, width=.25, r=.6)

    notes = [
        "3号单排 5 个/层：25 沿架长、34 进深；5×25=125，留 21 cm。",
        "8号转 90°：32 沿架长、48 进深；1.5m 架 4 个/层。",
        "4/5 号都留 5 层做灵活层板；不拆板。",
        "顶部 65 / 底部 50 全空；不放箱。",
    ]
    ny = 259.0
    for i, t in enumerate(notes):
        if i == 0:
            c.d.polygon([(c.X(18), c.X(ny + 3.2)), (c.X(19.8), c.X(ny)), (c.X(21.6), c.X(ny + 3.2))], fill=rgb(WARN))
            c.text(19.8, ny + 2.1, "!", 5.0, "#FFFFFF", "b", anchor="mm")
            c.text(23.2, ny + .1, t, 6.8, WARN)
        else:
            c.text(23.2, ny + .1, t, 6.8, MUTED)
        ny += 6.0

    footer(c, "尺寸单位 mm · 底留 500 为板面高，板下约 470 · 8号按 48 进深转 90° · 5 个货架位置不变",
           "02 / 04")


if __name__ == "__main__":
    dpi = int(sys.argv[1]) if len(sys.argv) > 1 else 150
    out = sys.argv[2] if len(sys.argv) > 2 else r"E:\deepseek\储藏室系统开发\work\v2_p2.png"
    c = C(dpi)
    page2(c)
    c.img.save(out, quality=95)
    print("saved", out, c.img.size)
