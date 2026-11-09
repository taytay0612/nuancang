# -*- coding: utf-8 -*-
"""Scheme pages A/B/C and comparison page for the storage design."""
import math
from PIL import Image, ImageDraw
from design_data import BOXES, CATS, SCHEMES, bom, SHELF_H, BOTTOM, TOP_CLEAR
from render_design import C, rgb, mix, light, dark, lum, INK, MUTED, RULE, GREEN, GREEN_D, ORANGE, SAND, FRAME, BOARD, WALL, ROOMBG, BG, PAPER, WARN, footer, header, page_top, spec_strip


def draw_ruler(c, x, base_y, sc, levels):
    top = base_y - 2650 * sc
    c.line(x, top, x, base_y, MUTED, .3)
    ticks = [(0, "0"), (500, "500"), (2000, "2000 TOP"), (2650, "2650 室高")]
    for h, lab in ticks:
        yy = base_y - h * sc
        c.line(x - 1.6, yy, x, yy, MUTED, .35)
        c.text(x - 2.2, yy, lab, 6.2, MUTED, anchor="rm")
    for lev, h in levels:
        yy = base_y - h * sc
        c.line(x + .2, yy, x + 2.2, yy, mix(MUTED, SAND, .3), .3)
        c.text(x + 3.0, yy, lev, 6.0, GREEN_D, "b", anchor="lm")
    c.text(x - 2.2, top - 4.4, "mm", 6.0, MUTED, anchor="rm")


def draw_shelf(c, scheme, sh, sx, base_y, sc, show_levels=True):
    s = SCHEMES[scheme]
    w = sh["len"] * sc
    top_y = base_y - SHELF_H * sc
    levels = s["levels"]
    cat = CATS[sh["cat"]]["color"]

    # wall panel behind shelf (floor to ceiling)
    c.rect(sx, base_y - 2650 * sc, w, 2650 * sc, fill=ROOMBG)
    # bottom open zone
    c.rect(sx, base_y - BOTTOM * sc, w, BOTTOM * sc, fill=mix(BG, SAND, .22))
    c.dash(sx, base_y - BOTTOM * sc, sx + w, base_y - BOTTOM * sc, mix(SAND, MUTED, .3), .3, 1.4, 1.2)
    # posts
    c.rect(sx, top_y, 1.5, SHELF_H * sc, fill=FRAME)
    c.rect(sx + w - 1.5, top_y, 1.5, SHELF_H * sc, fill=FRAME)
    # floor
    c.line(sx, base_y, sx + w, base_y, FRAME, .8)
    # boards
    boards = [h for _, h in levels] + [SHELF_H]
    for h in boards:
        yy = base_y - h * sc
        c.rect(sx, yy - 1.0, w, 1.0, fill=BOARD, outline=dark(BOARD, .18), width=.18)
        c.line(sx + 1.5, yy + .1, sx + w - 1.5, yy + .1, dark(BOARD, .25), .2)

    # boxes
    for lev, h in levels:
        boxes = sh["rows"].get(lev, [])
        cursor = sx + 20 * sc
        for b in boxes:
            bw = BOXES[b]["w"] * sc
            bh = BOXES[b]["h"] * sc
            by = base_y - (h + BOXES[b]["h"]) * sc
            fill = cat
            c.rect(cursor, by, bw, bh, fill=fill, outline=dark(fill, .22), width=.25, r=.3)
            # top light edge
            c.rect(cursor + .3, by + .25, bw - .6, .45, fill=light(fill, .22))
            txt = str(b)
            pt = 7.2 if bw > 11 else 6.4
            c.text(cursor + bw / 2, by + bh / 2, txt, pt, "#FFFFFF" if lum(fill) < 155 else INK, "b", anchor="mm")
            cursor += bw + 5 * sc

    # top deck boxes
    cursor = sx + 20 * sc
    for b in sh["rows"].get("TOP", []):
        bw = BOXES[b]["w"] * sc
        bh = BOXES[b]["h"] * sc
        by = base_y - (SHELF_H + BOXES[b]["h"]) * sc
        fill = CATS["top"]["color"]
        c.rect(cursor, by, bw, bh, fill=fill, outline=dark(fill, .22), width=.25, r=.3)
        c.rect(cursor + .3, by + .25, bw - .6, .45, fill=light(fill, .22))
        c.text(cursor + bw / 2, by + bh / 2, str(b), 7.0, "#FFFFFF", "b", anchor="mm")
        cursor += bw + 5 * sc

    # bottom label
    c.text(sx + w / 2, base_y - BOTTOM * sc / 2, "500 大件位", 5.8, mix(MUTED, SAND, .3), anchor="mm")

    # shelf label
    ly = base_y + 2.0
    label = f'{sh["id"]}号架 · {CATS[sh["cat"]]["name"]}'
    tw = c.tw(label, 7.0, "b")
    tx = sx + w / 2 - tw / 2
    c.d.ellipse([c.X(tx - 2.2), c.X(ly + .5), c.X(tx - .9), c.X(ly + 1.8)], fill=rgb(cat))
    c.text(tx, ly, label, 7.0, INK, "b", anchor="lt")
    c.text(sx + w / 2, ly + 5.2, f'{sh["len"]} × {s["depth"]} · {s["tiers"]} 层', 6.2, MUTED, anchor="mt")


def location_counts(scheme):
    d = {}
    for sh in SCHEMES[scheme]["shelves"]:
        for lev, boxes in sh["rows"].items():
            for b in boxes:
                d.setdefault(b, {})
                key = f'{sh["id"]}-{lev}'
                d[b][key] = d[b].get(key, 0) + 1
    return d


def fmt_locations(d):
    return "、".join(k if n == 1 else f"{k}×{n}" for k, n in d.items())


def draw_bom(c, scheme, y=208.5):
    s = SCHEMES[scheme]
    counts, locs, vol = bom(scheme)
    lcounts = location_counts(scheme)
    total = sum(counts.values())
    total_v = vol / 1000
    c.text(18, y - 6.8, "纸箱清单", 11.5, INK, "b")
    c.text(47, y - 6.0, f'{total} 个 · {total_v:.2f} m³ · 5 组架', 7.0, GREEN, "b")
    c.text(402, y - 6.2, "位置：架号-L层（L1 最低，TOP 顶板）", 6.4, MUTED, anchor="rt")

    cols = [18, 52, 18, 16, 100, 180]
    heads = ["箱号", "外尺寸 mm", "容积", "数量", "建议用途", "放置位置"]
    hh = 7.2
    c.rect(18, y, 384, hh, fill=GREEN_D, r=.6)
    x = 18
    for i, hd in enumerate(heads):
        c.text(x + 2.2, y + hh / 2, hd, 6.6, "#FFFFFF", "b", anchor="lm")
        x += cols[i]
    yy = y + hh
    rh = 6.4
    for idx, b in enumerate(sorted(counts)):
        fill = PAPER if idx % 2 == 0 else mix(PAPER, BG, .55)
        c.rect(18, yy, 384, rh, fill=fill)
        x = 18
        vals = [BOXES[b]["label"], f'{BOXES[b]["w"]}×{BOXES[b]["d"]}×{BOXES[b]["h"]}',
                BOXES[b]["vol"], f'×{counts[b]}', BOXES[b]["use"], fmt_locations(lcounts[b])]
        for i, v in enumerate(vals):
            if i == 0:
                c.text(x + 2.2, yy + rh / 2, v, 7.2, INK, "b", anchor="lm")
            elif i == 3:
                c.text(x + 2.2, yy + rh / 2, str(counts[b]), 9.0, GREEN_D, "b", anchor="lm")
                c.text(x + 2.2 + c.tw(str(counts[b]), 9, "b") + .6, yy + rh / 2 + .3, "个", 5.8, MUTED, anchor="lm")
            elif i == 5:
                c.text(x + 2.2, yy + rh / 2, v, 6.4, MUTED, anchor="lm")
            else:
                c.text(x + 2.2, yy + rh / 2, v, 7.0, INK if i != 4 else MUTED, anchor="lm")
            x += cols[i]
        yy += rh
    c.line(18, yy, 402, yy, RULE, .3)
    c.text(20, yy + 1.6, f'合计 {total} 个 · {total_v:.2f} m³', 7.4, INK, "b")
    c.text(402, yy + 1.6, f'{s["tiers"]} 层 × 5 组 = {s["tiers"] * 5} 块层板', 6.4, MUTED, anchor="rt")
    return yy + 7.0


def warning(c, x, y, text, color=WARN, size=7.0, width=384):
    c.d.polygon([(c.X(x), c.X(y + 3.4)), (c.X(x + 1.9), c.X(y)), (c.X(x + 3.8), c.X(y + 3.4))],
                fill=rgb(color))
    c.text(x + 1.9, y + 2.3, "!", 5.2, "#FFFFFF", "b", anchor="mm")
    c.text(x + 5.4, y + .1, text, size, color)


def page_scheme(c, scheme, page):
    s = SCHEMES[scheme]
    counts, locs, vol = bom(scheme)
    total = sum(counts.values())
    total_v = vol / 1000

    eyebrow = f'SCHEME {scheme} / {s["tag"]}'
    subtitles = {
        "A": "5 组架分工：食品、衣物、档案、工具、杂项；底部 500 全空。",
        "B": "6 层换更多分隔；3 号 / 8 号只剩 10 mm 余量，取放要斜进。",
        "C": "以 10 / 9 号为主；8 号及以下只填空位，单层会留 20 cm 空高。",
    }
    header(c, eyebrow, f'{s["title"]}', subtitles[scheme], "", right_stat="")

    # right stats over header
    c.text(402, 15.2, str(total), 30, ORANGE if scheme == "A" else GREEN_D, "n", anchor="rt")
    c.text(402, 29.2, "个纸箱", 6.8, MUTED, anchor="rt")
    c.text(360, 18.0, f'{total_v:.2f}', 13, INK, "n", anchor="rt")
    c.text(360, 24.0, "m³ 箱容积", 6.2, MUTED, anchor="rt")
    c.line(344, 15.5, 344, 33.0, RULE, .3)

    items = [
        ("层数", f'{s["tiers"]} 层'),
        ("层距", f'{s["pitch"]}'),
        ("箱层净高", f'{s["clear"]}'),
        ("深度", f'{s["depth"]}'),
        ("底留", f'{BOTTOM}'),
        ("顶留", f'{TOP_CLEAR}'),
        ("通道", f'{s["aisle"]}'),
    ]
    spec_strip(c, items, y=48.0, h=9.2)

    base_y = 188.0
    sc = 1 / 21
    draw_ruler(c, 28, base_y, sc, s["levels"])
    xs = [42.0]
    for sh in s["shelves"][:-1]:
        xs.append(xs[-1] + sh["len"] * sc + 6.0)
    for i, sh in enumerate(s["shelves"]):
        draw_shelf(c, scheme, sh, xs[i], base_y, sc, show_levels=(i == 0))
    # ceiling line
    c.dash(40, base_y - 2650 * sc, 386, base_y - 2650 * sc, mix(SAND, MUTED, .25), .3, 2.0, 1.4)
    c.text(386, base_y - 2650 * sc - 3.2, "室高 2650", 6.0, MUTED, anchor="rt")

    end_y = draw_bom(c, scheme, y=208.5)

    notes = {
        "A": [
            "顶部以 10 号为主（39 cm 高），3 号架顶加 1 个 4 号档案箱；单箱 ≤10 kg，用两步凳。",
            "底 50 cm 全空放大件。5 号 32 cm 高，34.5 cm 净高只剩 2.5 cm；先拉出 1/3。",
        ],
        "B": [
            "3 号 / 8 号 26 cm 高，27 cm 净高只剩 1 cm；先斜放再立正，或改用 4 号 / 6 号。",
            "5 号 32 cm 放不进上层；9 号只放顶部；6 层标签按 L1–L5 从下往上贴。",
        ],
        "C": [
            "10 号 39 cm 高，47 cm 净高余 8 cm；被褥、冬衣可立放，不用压扁。",
            "8 号及以下会空 20 cm；小件多改 A/B；单箱超过 15 kg 两人抬。",
        ],
    }[scheme]
    ny = end_y + 1.0
    for i, t in enumerate(notes):
        if i == 0:
            warning(c, 18, ny, t)
        else:
            c.text(23.4, ny + .1, t, 7.0, MUTED)
        ny += 5.6

    footer(c, "尺寸单位 mm · 色块=货架分区，数字=箱号 · 底留 500 为板面高，板下净高约 470 · 单箱≤15 kg，书≤10 kg，单层≤40 kg",
           f'{page} / 05')


if __name__ == "__main__":
    import sys
    dpi = int(sys.argv[1]) if len(sys.argv) > 1 else 150
    which = sys.argv[2] if len(sys.argv) > 2 else "A"
    out = sys.argv[3] if len(sys.argv) > 3 else rf"E:\deepseek\储藏室系统开发\work\p_{which}.png"
    c = C(dpi)
    page_scheme(c, which, {"A": "02", "B": "03", "C": "04"}[which])
    c.img.save(out, quality=95)
    print("saved", out, c.img.size)
