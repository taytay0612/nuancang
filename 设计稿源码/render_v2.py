# -*- coding: utf-8 -*-
"""Version 2: 3号 + 8号 only, four boxed cabinets + one flexible, positions unchanged."""
import sys
from design_data import BOXES, CATS, SCHEMES, bom, SHELF_H, BOTTOM, TOP_CLEAR, DOOR
from render_design import (C, rgb, mix, light, dark, lum, INK, MUTED, RULE, GREEN, GREEN_D,
                           ORANGE, SAND, FRAME, BOARD, WALL, ROOMBG, BG, PAPER, WARN,
                           footer, header, page_top, spec_strip)
from plan_u import draw_plan_u


def page1(c):
    page_top(c)
    c.iso_box(18, 15.0, 10.2, 11.2, ORANGE)
    c.text(32, 11.6, "STORAGE SYSTEM / REVISION 03", 7.0, GREEN, "b", tracking=.35)
    c.text(32, 16.4, "储藏室收纳系统", 30, INK, "b")
    c.text(32, 34.0, "4.0 × 2.38 m 净空间 · 5 个货架位置不变 · 3 柜放箱 / 2 柜灵活", 9.4, MUTED)
    c.text(402, 13.0, "2026.11 / 方案版 03", 7.0, MUTED, anchor="rt")
    c.line(18, 45.0, 402, 45.0, RULE, .3)
    c.text(26, 51.2, "平面布置 / 1:20 · 位置不变", 8.0, GREEN, "b", tracking=.2)

    draw_plan_u(c)

    # right recommendation card
    x, y, w, h = 246, 51.5, 156, 143
    c.rect(x, y, w, h, fill=PAPER, outline=RULE, width=.3, r=2.2)
    c.rect(x, y, 1.6, h, fill=ORANGE, r=.8)
    c.text(x + 7, y + 6.0, "推荐配置 / 3号 + 8号", 6.4, GREEN, "b", tracking=.3)
    c.text(x + 7, y + 11.0, "5 层 × 50 深", 24, INK, "b")
    c.text(x + 7, y + 22.6, "3 柜放箱 · 2 柜留空", 8.2, MUTED)

    # five mini cabinets
    mx, my = x + 111, y + 7.0
    for i in range(5):
        xx = mx + i * 8.2
        if i < 3:
            c.rect(xx, my, 7.4, 20, fill=light(CATS[["food", "textile", "bedding"][i]]["color"], .82),
                   outline=CATS[["food", "textile", "bedding"][i]]["color"], width=.3, r=.4)
            for k in range(4):
                c.line(xx + .8, my + 4.0 + k * 4.0, xx + 6.6, my + 4.0 + k * 4.0, BOARD, .25)
        else:
            c.rect(xx, my, 7.4, 20, fill=mix(BG, CATS["flex"]["color"], .12), outline=None)
            c.dash(xx, my, xx + 7.4, my, CATS["flex"]["color"], .35, 1.4, 1.0)
            c.dash(xx + 7.4, my, xx + 7.4, my + 20, CATS["flex"]["color"], .35, 1.4, 1.0)
            c.dash(xx, my + 20, xx + 7.4, my + 20, CATS["flex"]["color"], .35, 1.4, 1.0)
            c.dash(xx, my, xx, my + 20, CATS["flex"]["color"], .35, 1.4, 1.0)
            c.text(xx + 3.7, my + 10, "空", 5.8, MUTED, "b", anchor="mm")
    c.text(mx + 20.5, my + 22.0, "3 箱柜 + 2 空柜", 5.6, MUTED, anchor="mt")

    # metrics
    c.line(x + 7, y + 39.0, x + w - 7, y + 39.0, RULE, .25)
    c.text(x + 7, y + 42.2, "56", 26, GREEN_D, "n")
    c.text(x + 7 + c.tw("56", 26, "n") + 1.2, y + 51.0, "箱", 7.0, MUTED)
    c.text(x + 52, y + 44.0, "1.52", 14, INK, "n")
    c.text(x + 52, y + 50.0, "m³ 箱容积", 6.0, MUTED)
    c.text(x + 100, y + 44.0, "345", 14, GREEN_D, "n")
    c.text(x + 100, y + 50.0, "mm 净高", 6.0, MUTED)

    # reasons
    ry = y + 57.5
    reasons = [
        ("01", "只买 3 号 / 8 号", "3号 40、8号 16；两种箱型。"),
        ("02", "3号单排 5 个/层", "25 沿架长，不并排，取放直接拉。"),
        ("03", "两个 1m 柜留空", "4/5 号都留 5 层，不拆板。"),
    ]
    for i, (num, t1, t2) in enumerate(reasons):
        yy = ry + i * 24.0
        c.text(x + 7, yy, num, 7.2, ORANGE, "n")
        c.text(x + 15, yy - .4, t1, 9.0, INK, "b")
        c.text(x + 15, yy + 5.0, t2, 6.7, MUTED)
        if i < 2:
            c.line(x + 15, yy + 11.0, x + w - 7, yy + 11.0, mix(RULE, BG, .35), .2)
    c.text(x + 7, y + h - 8.0, "顶部 65 / 底部 50 全空；不放箱。", 6.4, GREEN, "b")

    # five shelf cards
    cards = [
        ("1", "食品", "food", "3号 ×20", "单排 5/层", "20"),
        ("2", "衣物", "textile", "3号 ×20", "单排 5/层", "20"),
        ("3", "床品", "bedding", "8号 ×16", "4/层", "16"),
        ("4", "灵活·层板", "flex", "0 箱", "5 层全留", "0"),
        ("5", "灵活·层板", "flex", "0 箱", "5 层全留", "0"),
    ]
    cy, ch, cw = 214.0, 64, 72
    for i, (sid, name, cat, spec, note, cnt) in enumerate(cards):
        cx = 18 + i * (cw + 6)
        col = CATS[cat]["color"]
        is_flex = cat == "flex"
        c.rect(cx, cy, cw, ch, fill=PAPER if not is_flex else mix(BG, col, .08),
               outline=col if is_flex else RULE, width=.6 if is_flex else .3, r=2.0)
        if is_flex:
            c.dash(cx, cy, cx + cw, cy, col, .5, 1.6, 1.2)
            c.dash(cx + cw, cy, cx + cw, cy + ch, col, .5, 1.6, 1.2)
            c.dash(cx, cy + ch, cx + cw, cy + ch, col, .5, 1.6, 1.2)
            c.dash(cx, cy, cx, cy + ch, col, .5, 1.6, 1.2)
        c.text(cx + 7, cy + 5.2, sid, 18, col, "n")
        c.text(cx + 17, cy + 5.6, name, 10, INK, "b")
        c.text(cx + 7, cy + 16.0, spec, 8.8, INK, "b")
        c.text(cx + 7, cy + 23.0, note, 6.4, MUTED)
        c.text(cx + 7, cy + 31.0, cnt, 20, GREEN_D if not is_flex else MUTED, "n")
        c.text(cx + 7 + c.tw(cnt, 20, "n") + 1.0, cy + 40.0, "箱", 6.2, MUTED)
        c.line(cx + 7, cy + 45.0, cx + cw - 7, cy + 45.0, mix(RULE, BG, .3), .2)
        c.text(cx + cw - 7, cy + ch - 7.0, "P2", 6.0, MUTED, anchor="rt")

    footer(c, "尺寸单位 mm · 现场 4000×2380×2650 · 5 个货架位置按图不变 · 左侧门 / 障碍区尺寸现场复核",
           "01 / 04")


if __name__ == "__main__":
    dpi = int(sys.argv[1]) if len(sys.argv) > 1 else 150
    out = sys.argv[2] if len(sys.argv) > 2 else r"E:\deepseek\储藏室系统开发\work\v2_p1.png"
    c = C(dpi)
    page1(c)
    c.img.save(out, quality=95)
    print("saved", out, c.img.size)
