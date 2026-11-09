# -*- coding: utf-8 -*-
"""U-shaped fixed layout from the user's last image."""
from render_design import (C, rgb, mix, light, dark, INK, MUTED, RULE, GREEN, GREEN_D,
                           ORANGE, SAND, WALL, ROOMBG, BG, CATS)


def draw_plan_u(c, ox=26, oy=64, sc=1 / 20):
    x0, y0 = ox, oy
    x1, y1 = ox + 4000 * sc, oy + 2380 * sc

    # room and wall band
    c.rect(x0 - 2.4, y0 - 2.4, (x1 - x0) + 4.8, (y1 - y0) + 4.8, fill=WALL)
    c.rect(x0, y0, x1 - x0, y1 - y0, fill=ROOMBG)

    # door / obstacle zone on the left, lower part (from image)
    dy0 = y0 + 1480 * sc
    c.rect(x0 - 2.6, dy0, 5.2, y1 - dy0, fill=BG)
    c.line(x0, dy0, x0, y1, BG, 1.3)
    c.arrow(x0 - 7.0, (dy0 + y1) / 2, x0 + 8.0, (dy0 + y1) / 2, ORANGE, .55, 2.0)
    c.text(x0 - 6.6, (dy0 + y1) / 2 - 5.8, "入口", 6.8, ORANGE, "b")
    c.text(x0 + 3.0, y1 - 9.0, "门/障碍区", 6.0, MUTED, "b")

    depth = 500 * sc
    top_y = y0
    bot_y = y1 - depth

    defs = [
        (1, 500, 1500, "food", top_y, "top"),
        (2, 2000, 1500, "textile", top_y, "top"),
        (3, 3500, 1500, "bedding", top_y, "right"),
        (4, 1000, 1000, "flex", bot_y, "bottom"),
        (5, 2000, 1000, "flex", bot_y, "bottom"),
    ]
    for sid, start, ln, cat, yy, side in defs:
        x = x0 + start * sc
        w = ln * sc
        h = depth
        if side == "right":
            h = ln * sc
            w = depth
        col = CATS[cat]["color"]
        if cat == "flex":
            c.rect(x, yy, w, h, fill=mix(BG, col, .12), outline=None)
            c.dash(x, yy, x + w, yy, col, .5, 1.4, 1.1)
            c.dash(x + w, yy, x + w, yy + h, col, .5, 1.4, 1.1)
            c.dash(x, yy + h, x + w, yy + h, col, .5, 1.4, 1.1)
            c.dash(x, yy, x, yy + h, col, .5, 1.4, 1.1)
        else:
            c.rect(x, yy, w, h, fill=light(col, .82), outline=col, width=.55, r=.4)
            if side == "top":
                c.rect(x, yy + h - 1.25, w, 1.25, fill=col)
                c.line(x, yy + h, x + w, yy + h, dark(col, .15), .7)
            elif side == "bottom":
                c.rect(x, yy, w, 1.25, fill=col)
                c.line(x, yy, x + w, yy, dark(col, .15), .7)
            else:
                c.rect(x, yy, 1.25, h, fill=col)
                c.line(x, yy, x, yy + h, dark(col, .15), .7)

        cx, cy = x + w / 2, yy + h / 2
        c.d.ellipse([c.X(cx - 2.4), c.X(cy - 3.3), c.X(cx + 2.4), c.X(cy + 1.5)], fill=rgb(col))
        c.text(cx, cy - 1.7, str(sid), 7.0, "#FFFFFF", "b", anchor="mm")
        if side == "right":
            c.text_rot(cx, cy + 4.8, CATS[cat]["name"], 6.2, dark(col, .25), "b")
            c.text_rot(cx, cy + 10.0, "空" if cat == "flex" else "1.5m", 5.6, MUTED, "b")
        else:
            c.text(cx, cy + 3.3, CATS[cat]["name"], 6.2, dark(col, .25), "b", anchor="mm")
            if cat == "flex":
                c.text(cx, cy + 7.5, "空", 5.8, mix(MUTED, col, .3), "b", anchor="mm")

    # dimensions
    ty = y0 - 7.2
    c.line(x0, ty, x1, ty, MUTED, .3)
    c.line(x0, ty - .9, x0, ty + .9, MUTED, .3)
    c.line(x1, ty - .9, x1, ty + .9, MUTED, .3)
    c.arrow(x0 + 2, ty, x0, ty, MUTED, .3, 1.4)
    c.arrow(x1 - 2, ty, x1, ty, MUTED, .3, 1.4)
    c.text((x0 + x1) / 2, ty - 4.6, "4000", 7.4, MUTED, "b", anchor="mt", bg=BG)

    rx = x1 + 7.0
    c.line(rx, y0, rx, y1, MUTED, .3)
    c.line(rx - .9, y0, rx + .9, y0, MUTED, .3)
    c.line(rx - .9, y1, rx + .9, y1, MUTED, .3)
    c.arrow(rx, y0 + 2, rx, y0, MUTED, .3, 1.4)
    c.arrow(rx, y1 - 2, rx, y1, MUTED, .3, 1.4)
    c.text_rot(rx + 4.2, (y0 + y1) / 2, "2380", 7.4, MUTED, "b")

    # clear dimension 1380 between top and bottom runs
    ax = x0 + 3200 * sc
    c.line(ax, y0 + 500 * sc, ax, y1 - 500 * sc, MUTED, .3)
    c.line(ax - 1.2, y0 + 500 * sc, ax + 1.2, y0 + 500 * sc, MUTED, .3)
    c.line(ax - 1.2, y1 - 500 * sc, ax + 1.2, y1 - 500 * sc, MUTED, .3)
    c.text_rot(ax - 3.2, (y0 + y1) / 2, "通道 1380", 6.4, GREEN, "b")

    # left clearances
    c.text(x0 + 250 * sc, y0 + 3.8, "500", 6.0, MUTED, anchor="mt")
    c.text(x0 + 500 * sc, y1 - 7.0, "入口 1000", 6.0, MUTED, anchor="mt")
    c.text(x0 + 3500 * sc, y1 - 7.0, "1000", 6.0, MUTED, anchor="mt")

    # legend
    ly = 189.0
    c.text(26, ly, "货架", 6.4, MUTED, "b")
    lx = 40
    for i, cat in enumerate(["food", "textile", "bedding", "flex", "flex"], start=1):
        col = CATS[cat]["color"]
        c.rect(lx, ly - .5, 3.2, 3.2, fill=col, r=.4)
        c.text(lx + 1.6, ly + 1.1, str(i), 5.4, "#FFFFFF", "b", anchor="mm")
        c.text(lx + 5.0, ly, f'{i} {CATS[cat]["name"]}', 6.4, INK)
        lx += 5.0 + c.tw(f'{i} {CATS[cat]["name"]}', 6.4) + 7.0

    c.text(26, 197.0, "左侧门 / 障碍区按图留空；门洞尺寸现场复核。", 6.4, MUTED)
    c.text(26, 202.0, "货架位置不变；4/5 号都留 5 层做灵活层板，不拆板。", 6.4, MUTED)
