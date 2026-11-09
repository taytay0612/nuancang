# -*- coding: utf-8 -*-
"""V3 page 3: single-row 3号 placement, 8号 rotation, two flexible cabinets."""
import sys
from design_data import CATS
from render_design import (C, rgb, mix, light, dark, INK, MUTED, RULE, GREEN, GREEN_D,
                           ORANGE, SAND, FRAME, BOARD, ROOMBG, BG, PAPER, WARN, footer, header)


def page3(c):
    header(c, "LAYOUT / 3号 + 8号", "3号单排5个，8号4个",
           "3号 25 cm 沿架长、34 cm 进深；8号 32 cm 沿架长、48 cm 进深。", "", right_stat="")
    c.text(402, 15.0, "03", 7.0, MUTED, anchor="rt")

    # 3号 diagram: 5 boxes single row, 25 along length
    c.text(18, 53.0, "3号：单排 5 个/层（1.5m 架）", 10.5, INK, "b")
    ox, oy, sc = 30.0, 59.0, 1 / 15
    sw, sd = 1500 * sc, 500 * sc
    c.rect(ox, oy, sw, sd, fill=ROOMBG, outline=FRAME, width=.45)
    for i in range(5):
        bx = ox + 7.0 + i * 17.2
        c.rect(bx, oy + 4.0, 16.0, 21.2, fill=light(CATS["food"]["color"], .18),
               outline=CATS["food"]["color"], width=.3, r=.3)
        c.text(bx + 8.0, oy + 14.6, "3", 6.4, "#FFFFFF", "b", anchor="mm")
    c.text(ox + sw + 3.0, oy + 5.0, "1500", 6.4, MUTED, "b")
    c.text(ox + sw + 3.0, oy + 13.0, "5 × 25 = 125", 6.2, GREEN_D, "b")
    c.text(ox + sw + 3.0, oy + 20.0, "留 21 cm", 5.8, MUTED)
    c.text(ox, oy + sd + 2.0, "25 沿架长、34 进深；不并排，后排空 16 cm。", 6.2, MUTED)

    # 8号 diagram
    c.text(18, 101.0, "8号：转 90°，4 个/层（1.5m 架）", 10.5, INK, "b")
    oy2 = 107.0
    c.rect(ox, oy2, sw, sd, fill=ROOMBG, outline=FRAME, width=.45)
    for i in range(4):
        bx = ox + 8.0 + i * 21.4
        c.rect(bx, oy2 + .8, 20.4, 31.6, fill=light(CATS["textile"]["color"], .18),
               outline=CATS["textile"]["color"], width=.3, r=.3)
        c.text(bx + 10.2, oy2 + 16.0, "8", 6.4, "#FFFFFF", "b", anchor="mm")
    c.text(ox + sw + 3.0, oy2 + 5.0, "32 沿架长", 6.2, GREEN_D, "b")
    c.text(ox + sw + 3.0, oy2 + 11.0, "48 进深", 6.2, GREEN_D, "b")
    c.text(ox + sw + 3.0, oy2 + 18.0, "4 个/层", 5.8, MUTED)
    c.text(ox, oy2 + sd + 2.0, "48 进深基本占满 50 cm；32 沿架长。", 6.2, MUTED)

    # why single row
    cx, cy, cw, ch = 18, 158, 210, 58
    c.rect(cx, cy, cw, ch, fill=PAPER, outline=RULE, width=.3, r=2.0)
    c.text(cx + 7, cy + 5.0, "为什么单排", 9.6, INK, "b")
    c.text(cx + 7, cy + 13.0, "3号 25 沿架长：5 × 25 = 125，留 21 cm。", 6.6, INK)
    c.text(cx + 7, cy + 20.0, "并排双排能放 8 个/层，但后排要挪箱；本方案不做。", 6.6, INK)
    c.text(cx + 7, cy + 27.0, "单排取放直接拉；8号柜也不并排。", 6.6, MUTED)
    c.text(cx + 7, cy + 34.0, "顶部 65 / 底部 50 全空，不放箱。", 6.6, GREEN_D)

    # per-shelf table
    tx, ty, tw = 240, 53.0, 162
    c.text(tx, ty, "柜位表", 10.5, INK, "b")
    heads = ["柜", "架长", "箱型", "每层", "合计"]
    cols = [18, 26, 64, 30, 24]
    hh = 7.5
    c.rect(tx, ty + 5.0, tw, hh, fill=GREEN_D, r=.6)
    xx = tx
    for i, hd in enumerate(heads):
        c.text(xx + cols[i] / 2, ty + 5.0 + hh / 2, hd, 6.2, "#FFFFFF", "b", anchor="mm")
        xx += cols[i]
    data = [
        ("1 食品", "1.5", "3号 单排", "5", "20"),
        ("2 衣物", "1.5", "3号 单排", "5", "20"),
        ("3 床品", "1.5", "8号 转90°", "4", "16"),
        ("4 灵活", "1.0", "— 层板", "0", "0"),
        ("5 灵活", "1.0", "— 层板", "0", "0"),
        ("合计", "", "", "", "56"),
    ]
    yy = ty + 5.0 + hh
    for ri, row in enumerate(data):
        c.rect(tx, yy, tw, 8.0, fill=mix(BG, SAND, .35) if ri == 5 else (PAPER if ri % 2 == 0 else mix(PAPER, BG, .55)))
        xx = tx
        for ci, v in enumerate(row):
            c.text(xx + cols[ci] / 2, yy + 4.0, v, 6.6 if ci == 2 else 7.0,
                   INK if ci in (0, 4) else MUTED, "b" if ci in (0, 4) else "r", anchor="mm")
            xx += cols[ci]
        yy += 8.0
    for i in range(1, 5):
        c.line(tx + sum(cols[:i]), ty + 5.0, tx + sum(cols[:i]), yy, RULE, .2)
    c.rect(tx, ty + 5.0, tw, hh + 48.0, outline=RULE, width=.25, r=.6)
    c.text(tx, yy + 2.6, "3号 5 个/层；8号 4 个/层；4/5 号 0 箱。", 5.8, MUTED)

    # capacity card
    qx, qy, qw, qh = 18, 225, 210, 45
    c.rect(qx, qy, qw, qh, fill=PAPER, outline=RULE, width=.3, r=2.0)
    c.text(qx + 7, qy + 5.0, "总箱 56", 9.6, INK, "b")
    c.text(qx + 7, qy + 13.0, "3号 40：1/2号柜各 20；5 个/层。", 6.6, INK)
    c.text(qx + 7, qy + 20.0, "8号 16：3号柜；4 个/层。", 6.6, INK)
    c.text(qx + 7, qy + 27.0, "4/5号柜 0 箱；顶部 / 底部全空。", 6.6, MUTED)

    # two flexible cabinets
    fx, fy, fw, fh = 240, 125, 162, 145
    c.rect(fx, fy, fw, fh, fill=PAPER, outline=RULE, width=.3, r=2.0)
    c.text(fx + 7, fy + 5.0, "两个 1m 灵活柜", 9.6, INK, "b")

    # two mini cabinets, both 5 boards
    my = fy + 14
    for i, label in enumerate(["4号", "5号"]):
        mx = fx + 8 + i * 38
        c.rect(mx, my, 27, 68, fill=ROOMBG, outline=RULE, width=.2)
        for h in [500, 875, 1250, 1625, 2000]:
            yy2 = my + 68 - h / 2000 * 68
            c.line(mx + 1, yy2, mx + 26, yy2, BOARD, .55)
        c.line(mx, my + 68, mx + 27, my + 68, FRAME, .6)
        c.text(mx + 13.5, my + 27, label, 6.0, GREEN_D, "b", anchor="mm")
        c.text(mx + 13.5, my + 33, "5 层全留", 5.0, MUTED, anchor="mm")

    # text under
    c.text(fx + 8, fy + 88.0, "4/5 号都留 5 层：放周转箱、待分类、工具。", 6.0, INK)
    c.text(fx + 8, fy + 94.0, "不拆板、不装箱、不贴箱标。", 6.0, GREEN_D)
    c.text(fx + 8, fy + 101.0, "位置：4号下墙左、5号下墙右；", 5.8, MUTED)
    c.text(fx + 8, fy + 107.0, "都在开放侧，取放大件不穿主通道。", 5.8, MUTED)
    c.text(fx + 8, fy + 116.0, "层板高度可调；4/5 号都不拆板。", 5.8, MUTED)

    footer(c, "尺寸单位 mm · 3号单排 5 个/层；8号转 90° 4 个/层 · 4/5 号不装箱 · 5 个架位不变",
           "03 / 04")


if __name__ == "__main__":
    dpi = int(sys.argv[1]) if len(sys.argv) > 1 else 150
    out = sys.argv[2] if len(sys.argv) > 2 else r"E:\deepseek\储藏室系统开发\work\v3_p3.png"
    c = C(dpi)
    page3(c)
    c.img.save(out, quality=95)
    print("saved", out, c.img.size)
