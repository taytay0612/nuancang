# -*- coding: utf-8 -*-
"""V3 page 4: labels and implementation for 56 boxes, two flexible cabinets."""
import sys
from render_design import (C, rgb, mix, light, dark, INK, MUTED, RULE, GREEN, GREEN_D,
                           ORANGE, SAND, BG, PAPER, WARN, footer, header)


def page4(c):
    header(c, "USE / 标签与落地", "先摆柜，再贴标",
           "3号/8号两套箱标；4/5号只贴柜标；不并排，不做后排。", "", right_stat="")
    c.text(402, 15.0, "04", 7.0, MUTED, anchor="rt")

    # steps
    c.text(18, 53.0, "落地顺序", 11.5, INK, "b")
    c.text(64, 53.8, "先固定，再定层，最后贴标。", 6.8, MUTED)
    steps = [
        ("复核位置", "5 个架位、门/障碍；不移动架体。"),
        ("装架", "1–3号装 5 层；4/5 号留 5 层。"),
        ("排 3 号", "单排 5 个/层；25 沿架长、34 进深。"),
        ("排 8 号", "转 90°；32 沿架长、48 进深。"),
        ("留 4/5", "4/5 号都做灵活层板；不装箱。"),
        ("贴标", "架-层-序号；4/5号只贴柜标。"),
    ]
    for i, (t1, t2) in enumerate(steps):
        col = i // 3
        row = i % 3
        sx = 18 + col * 124
        sy = 63.0 + row * 28.5
        c.d.ellipse([c.X(sx), c.X(sy), c.X(sx + 6.0), c.X(sy + 6.0)], fill=rgb(GREEN if i != 5 else ORANGE))
        c.text(sx + 3.0, sy + 3.0, str(i + 1), 7.0, "#FFFFFF", "b", anchor="mm")
        c.text(sx + 9.0, sy - .5, t1, 8.4, INK, "b")
        c.para(sx + 9.0, sy + 4.4, t2, 6.6, 102, MUTED, leading=1.45)

    # two-box card
    cx, cy, cw, ch = 18, 160, 248, 84
    c.rect(cx, cy, cw, ch, fill=PAPER, outline=RULE, width=.3, r=2.0)
    c.text(cx + 7, cy + 5.0, "两箱分工", 10.5, INK, "b")
    c.text(cx + 7, cy + 13.0, "3号 340×250×260：1/2号柜，5 个/层，共 40 个。", 7.0, INK)
    c.text(cx + 7, cy + 20.0, "8号 480×320×260：3号柜，4 个/层，共 16 个。", 7.0, INK)
    c.text(cx + 7, cy + 27.0, "3号单排：25 沿架长；8号转 90°：32 沿架长。", 7.0, GREEN_D)
    c.text(cx + 7, cy + 34.0, "4/5 号都留 5 层做周转；不拆板。", 7.0, MUTED)
    c.line(cx + 7, cy + 41.0, cx + cw - 7, cy + 41.0, RULE, .25)
    c.text(cx + 7, cy + 44.0, "箱型", 6.0, MUTED, "b")
    c.text(cx + 7, cy + 49.0, "3号", 8.0, INK, "b")
    c.text(cx + 17, cy + 49.4, "340×250×260", 6.4, MUTED)
    c.text(cx + 64, cy + 49.0, "8号", 8.0, INK, "b")
    c.text(cx + 74, cy + 49.4, "480×320×260", 6.4, MUTED)
    c.text(cx + 7, cy + 57.0, "3号 5/层（1.5m）；8号 4/层（1.5m）。", 5.9, MUTED)
    c.text(cx + 7, cy + 65.0, "位置：1 上墙左 · 2 上墙右 · 3 右墙 · 4/5 下墙。", 5.9, MUTED)

    # label card
    lx, ly, lw, lh = 276, 53, 126, 191
    c.rect(lx, ly, lw, lh, fill=PAPER, outline=RULE, width=.3, r=2.0)
    c.text(lx + 7, ly + 5.0, "箱标模板", 10.5, INK, "b")
    bx, by, bw, bh = lx + 6, ly + 12, lw - 12, 40
    c.rect(bx, by, bw, bh, fill="#FFFFFF", outline=RULE, width=.35, r=1.2)
    c.rect(bx, by, 2.0, bh, fill=ORANGE, r=.8)
    c.text(bx + 5, by + 4.0, "1-L2-03", 14.5, INK, "n")
    c.text(bx + bw - 4, by + 4.5, "食品", 7.2, ORANGE, "b", anchor="rt")
    c.text(bx + 5, by + 14.0, "3号  340×250×260", 6.5, MUTED)
    c.text(bx + 5, by + 21.0, "单排", 6.2, MUTED)
    c.line(bx + 5, by + 26.0, bx + bw - 4, by + 26.0, RULE, .3)
    c.text(bx + 5, by + 27.0, "内容", 6.3, MUTED)
    c.line(bx + 16, by + 31.5, bx + bw - 4, by + 31.5, RULE, .25)
    c.text(bx + 5, by + 33.0, "日期", 6.3, MUTED)
    c.line(bx + 16, by + 37.0, bx + 50, by + 37.0, RULE, .25)

    c.text(lx + 7, ly + 57.0, "编码：架号-层号-序号，例如 1-L2-03。", 6.2, MUTED)
    c.text(lx + 7, ly + 63.0, "3号：1/2号柜，每层 01…05。", 6.1, MUTED)
    c.text(lx + 7, ly + 69.0, "8号：3号柜，每层 01…04。", 6.1, MUTED)
    c.text(lx + 7, ly + 75.0, "没有后排，不需要 B 编号。", 6.1, GREEN_D)
    c.text(lx + 7, ly + 83.0, "标签贴短边，开口朝外；换内容换标。", 6.1, MUTED)

    c.text(lx + 7, ly + 93.0, "示例", 6.2, MUTED, "b")
    c.text(lx + 7, ly + 99.0, "1-L2-03 = 1号架、第2层、第3箱。", 6.0, INK)
    c.text(lx + 7, ly + 105.0, "3-L1-02 = 3号架、第1层、第2箱。", 6.0, INK)

    c.line(lx + 7, ly + 113.0, lx + lw - 7, ly + 113.0, RULE, .25)
    c.text(lx + 7, ly + 116.0, "标签纸 70×40 mm 不干胶，外加透明护袋。", 6.0, MUTED)
    c.text(lx + 7, ly + 122.0, "先贴标再装箱；箱号朝外，拍照留档。", 6.0, MUTED)
    c.text(lx + 7, ly + 128.0, "每半年盘点；空箱折平放顶部。", 6.0, MUTED)

    # flexible cabinet labels
    fx, fy, fw, fh = lx + 6, ly + 136, lw - 12, 44
    c.rect(fx, fy, fw, fh, fill="#FFFFFF", outline=RULE, width=.35, r=1.2)
    c.rect(fx, fy, 2.0, fh, fill=GREEN, r=.8)
    c.text(fx + 5, fy + 4.0, "4  灵活·层板", 10.0, INK, "b")
    c.text(fx + 5, fy + 12.0, "0 箱 · 5 层全留", 6.4, MUTED)
    c.text(fx + 5, fy + 18.0, "周转箱 / 待分类 / 工具", 6.0, GREEN_D)
    c.text(fx + 5, fy + 26.0, "5  灵活·层板", 10.0, INK, "b")
    c.text(fx + 5, fy + 33.0, "0 箱 · 5 层全留", 6.4, MUTED)
    c.text(fx + 5, fy + 39.0, "周转箱 / 待分类 / 工具", 6.0, GREEN_D)

    # safety strip
    sy = 256.0
    c.rect(18, sy, 384, 24.0, fill=mix(BG, SAND, .45), r=1.6)
    items = ["防倾倒：膨胀螺栓", "单层 ≤40 kg", "顶部 ≤10 kg/箱", "门/障碍留空", "4/5 层板全留"]
    for i, t in enumerate(items):
        sx = 25 + i * 75.0
        c.d.ellipse([c.X(sx), c.X(sy + 7.0), c.X(sx + 4.2), c.X(sy + 11.2)], fill=rgb(GREEN))
        c.line(sx + 1.1, sy + 9.1, sx + 1.8, sy + 9.9, "#FFFFFF", .45)
        c.line(sx + 1.8, sy + 9.9, sx + 3.2, sy + 8.3, "#FFFFFF", .45)
        c.text(sx + 6.2, sy + 9.0, t, 6.5, INK, "b", anchor="lm")

    footer(c, "尺寸单位 mm · 货架位置按图不变 · 门/障碍尺寸现场复核 · 3号/8号外尺寸按商品页",
           "04 / 04")


if __name__ == "__main__":
    dpi = int(sys.argv[1]) if len(sys.argv) > 1 else 150
    out = sys.argv[2] if len(sys.argv) > 2 else r"E:\deepseek\储藏室系统开发\work\v3_p4.png"
    c = C(dpi)
    page4(c)
    c.img.save(out, quality=95)
    print("saved", out, c.img.size)
