# -*- coding: utf-8 -*-
"""Decision / implementation page."""
import sys
from design_data import SCHEMES
from render_design import C, rgb, mix, light, dark, INK, MUTED, RULE, GREEN, GREEN_D, ORANGE, SAND, BG, PAPER, WARN, footer, header, spec_strip


def page5(c):
    header(c, "DECISION / 选型与落地", "怎么选：A / B / C",
           "先看大件比例，再看小件数量；说不清就选 A。", "", right_stat="")

    # ---------- comparison table ----------
    x, y, w = 18, 54, 248
    cols = [62, 62, 62, 62]
    hh = 10.5
    rh = 8.7
    rows = [
        ("层数", "5 层", "6 层", "4 层", ""),
        ("箱层净高", "345 mm", "270 mm", "470 mm", ""),
        ("深度", "500 mm", "400 mm", "500 mm", ""),
        ("通道", "1380 mm", "1580 mm", "1380 mm", ""),
        ("纸箱数量", "72 个", "94 个", "52 个", ""),
        ("箱容积", "2.26 m³", "2.11 m³", "2.17 m³", ""),
        ("可放箱型", "1–8 号 + 10 号顶", "1–4、6、8 号 + 9 号顶", "1–10 号", ""),
        ("取放", "易", "紧", "易", ""),
        ("适合", "综合", "小件", "大件", ""),
    ]
    # header
    c.rect(x, y, w, hh, fill=GREEN_D, r=.8)
    heads = ["指标", "A 均衡型 · 推荐", "B 细分型", "C 大件型"]
    xx = x
    for i, hd in enumerate(heads):
        c.text(xx + cols[i] / 2, y + hh / 2, hd, 7.4 if i else 7.0, "#FFFFFF", "b", anchor="mm")
        xx += cols[i]
    # A highlight band
    c.rect(x + cols[0], y + hh, cols[1], rh * len(rows), fill="#FBF0E3")
    yy = y + hh
    for ri, (lab, a, b, cc, _) in enumerate(rows):
        if ri % 2 == 0:
            c.rect(x, yy, w, rh, fill=mix(PAPER, BG, .45))
        c.line(x, yy + rh, x + w, yy + rh, RULE, .22)
        c.text(x + 3.0, yy + rh / 2, lab, 7.4, MUTED, "b" if ri in (4, 8) else "r", anchor="lm")
        vals = [a, b, cc]
        for i, v in enumerate(vals):
            colx = x + sum(cols[:i + 1])
            c.text(colx + cols[i + 1] / 2, yy + rh / 2, v,
                   8.2 if ri not in (6,) else 6.6,
                   INK if i == 0 else MUTED,
                   "b" if i == 0 else "r", anchor="mm")
        yy += rh
    # verticals
    for i in range(1, 4):
        c.line(x + sum(cols[:i]), y, x + sum(cols[:i]), yy, RULE, .25)
    c.rect(x, y, w, hh + rh * len(rows), outline=RULE, width=.3, r=.8)
    # orange top accent on A
    c.rect(x + cols[0], y - .4, cols[1], 1.2, fill=ORANGE)

    c.text(18, yy + 3.6, "A 的 34.5 cm 净高刚好覆盖 1–8 号；B 的 27 cm 只放得下 26 cm 高；C 的 47 cm 只适合 39 cm 高的大箱。",
           6.8, MUTED)

    # ---------- implementation ----------
    c.text(18, 159.0, "落地顺序", 11.5, INK, "b")
    c.text(54, 159.8, "先固定，再定层，最后买箱；箱到了再贴标。", 6.8, MUTED)
    steps = [
        ("复核与固定", "复核门洞 1030、墙面垂直度；膨胀螺栓固定，防倾倒。"),
        ("定层板", "500 / 875 / 1250 / 1625；水平尺找平，四角锁紧。"),
        ("留底层", "0–500 全空；行李箱、吸尘器、折叠凳靠下。"),
        ("按单买箱", "按箱单下单；先各买 1 个试装，确认净高再批量。"),
        ("贴标录入", "架-层-序号；拍照，录入随附 Excel 清单。"),
        ("上架顺序", "重的在下，轻的在上；顶部只放换季。"),
    ]
    for i, (t1, t2) in enumerate(steps):
        col = i // 3
        row = i % 3
        sx = 18 + col * 124
        sy = 168 + row * 28.5
        c.d.ellipse([c.X(sx), c.X(sy), c.X(sx + 6.0), c.X(sy + 6.0)], fill=rgb(GREEN if i != 3 else ORANGE))
        c.text(sx + 3.0, sy + 3.0, str(i + 1), 7.0, "#FFFFFF", "b", anchor="mm")
        c.text(sx + 9.0, sy - .5, t1, 8.4, INK, "b")
        c.para(sx + 9.0, sy + 4.4, t2, 6.7, 104, MUTED, leading=1.45)

    # ---------- right decision card ----------
    dx, dy, dw, dh = 276, 54, 126, 88
    c.rect(dx, dy, dw, dh, fill=PAPER, outline=RULE, width=.3, r=2.0)
    c.text(dx + 7, dy + 5.0, "30 秒判断", 11.0, INK, "b")
    c.text(dx + 7, dy + 11.2, "按体积 / 数量估，不按感觉。", 6.4, MUTED)
    choices = [
        ("C", "大件/被褥占体积 > 40%", "选 C 大件型", ORANGE),
        ("B", "小件/文具占数量 > 50%", "选 B 细分型", GREEN),
        ("A", "混合 / 说不清", "选 A 均衡型（推荐）", ORANGE),
    ]
    for i, (letter, cond, res, col) in enumerate(choices):
        yy = dy + 20 + i * 21.5
        if i == 2:
            c.rect(dx + 5, yy - 3.0, dw - 10, 18.0, fill="#FBF0E3", r=1.4)
        c.d.ellipse([c.X(dx + 8), c.X(yy), c.X(dx + 16), c.X(yy + 8)], fill=rgb(col))
        c.text(dx + 12, yy + 4, letter, 7.0, "#FFFFFF", "b", anchor="mm")
        c.text(dx + 20, yy - .4, cond, 6.9, INK, "b")
        c.text(dx + 20, yy + 4.4, res, 6.6, GREEN_D if i != 0 else ORANGE, "b")
    c.text(dx + 7, dy + 84.0, "C 箱数少、单箱大；B 相反；A 最稳。", 6.0, MUTED)

    # ---------- label template ----------
    lx, ly, lw, lh = 276, 150, 126, 98
    c.rect(lx, ly, lw, lh, fill=PAPER, outline=RULE, width=.3, r=2.0)
    c.text(lx + 7, ly + 5.0, "箱标模板", 10.5, INK, "b")
    # label
    bx, by, bw, bh = lx + 6, ly + 12, lw - 12, 37
    c.rect(bx, by, bw, bh, fill="#FFFFFF", outline=RULE, width=.35, r=1.2)
    c.rect(bx, by, 2.0, bh, fill=ORANGE, r=.8)
    c.text(bx + 5, by + 4.0, "1-L3-02", 14.5, INK, "n")
    c.text(bx + bw - 4, by + 4.5, "食品", 7.4, ORANGE, "b", anchor="rt")
    c.text(bx + 5, by + 13.5, "5号  350 × 320 × 320", 6.6, MUTED)
    c.line(bx + 5, by + 23.0, bx + bw - 4, by + 23.0, RULE, .3)
    c.text(bx + 5, by + 24.0, "内容", 6.4, MUTED)
    c.line(bx + 16, by + 28.5, bx + bw - 4, by + 28.5, RULE, .25)
    c.text(bx + 5, by + 30.0, "日期", 6.4, MUTED)
    c.line(bx + 16, by + 34.5, bx + 50, by + 34.5, RULE, .25)

    c.text(lx + 7, ly + 54.0, "编码：架号-层号-序号；顶层写 TOP。", 6.3, MUTED)
    c.text(lx + 7, ly + 59.8, "L1 在最下，向上递增；层号按该架标注。", 6.3, MUTED)
    c.text(lx + 7, ly + 65.6, "标签贴短边，开口朝外；换内容要换标。", 6.3, MUTED)
    c.text(lx + 7, ly + 74.0, "示例：1-L3-02 = 1 号架、第 3 层、第 2 个箱。", 6.3, GREEN_D)
    c.text(lx + 7, ly + 79.8, "顶层示例：1-TOP-02。", 6.3, GREEN_D)
    c.text(lx + 7, ly + 86.5, "标签纸建议 70×40 mm 不干胶，外加透明护袋。", 6.1, MUTED)

    # trial note in the empty lower-left
    c.rect(18, 246.0, 248, 8.0, fill=mix(BG, ORANGE, .10), r=1.0)
    c.text(22.0, 249.9, "先试装", 6.8, ORANGE, "b", anchor="lm")
    c.text(38.0, 249.9, "A 方案 2/3/5/6 号各买 1 个，装一层看开门和净高，再按箱单批量。", 6.6, MUTED, anchor="lm")

    # ---------- safety strip ----------
    sy = 257.5
    c.rect(18, sy, 384, 24.0, fill=mix(BG, SAND, .45), r=1.6)
    items = ["防倾倒：膨胀螺栓", "单层 ≤40 kg", "顶部 ≤10 kg/箱", "门后 600 留空", "书箱 ≤10 kg"]
    for i, t in enumerate(items):
        sx = 25 + i * 75.0
        c.d.ellipse([c.X(sx), c.X(sy + 7.0), c.X(sx + 4.2), c.X(sy + 11.2)], fill=rgb(GREEN))
        c.line(sx + 1.1, sy + 9.1, sx + 1.8, sy + 9.9, "#FFFFFF", .45)
        c.line(sx + 1.8, sy + 9.9, sx + 3.2, sy + 8.3, "#FFFFFF", .45)
        c.text(sx + 6.2, sy + 9.0, t, 6.6, INK, "b", anchor="lm")

    footer(c, "A 方案为默认；B / C 的箱单见 P3 / P4 · 随附 Excel 清单可直接改成自家物品名 · 层高与箱高以实物复尺为准",
           "05 / 05")


if __name__ == "__main__":
    dpi = int(sys.argv[1]) if len(sys.argv) > 1 else 150
    out = sys.argv[2] if len(sys.argv) > 2 else r"E:\deepseek\储藏室系统开发\work\p5.png"
    c = C(dpi)
    page5(c)
    c.img.save(out, quality=95)
    print("saved", out, c.img.size)
