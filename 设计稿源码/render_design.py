# -*- coding: utf-8 -*-
"""Render the storage-room design boards with Pillow (A3 landscape, 300 dpi)."""
import os
import sys
import math
from PIL import Image, ImageDraw, ImageFont
from design_data import ROOM, BOXES, CATS, SCHEMES, SHELF_H, BOTTOM, TOP_CLEAR, DOOR, bom

# ---------- palette ----------
BG = "#F6F2EA"
PAPER = "#FFFDF8"
INK = "#202A24"
MUTED = "#6E766E"
RULE = "#D8D0C2"
GREEN = "#2F6B5E"
GREEN_D = "#234F46"
ORANGE = "#C96F3B"
SAND = "#D9C9B0"
FRAME = "#4A4439"
BOARD = "#C9B18C"
WALL = "#D8CBB8"
ROOMBG = "#FBF8F1"
WARN = "#B4552F"


def rgb(h):
    if isinstance(h, tuple):
        return h
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def mix(a, b, t):
    a, b = rgb(a) if isinstance(a, str) else a, rgb(b) if isinstance(b, str) else b
    return tuple(int(a[i] * (1 - t) + b[i] * t) for i in range(3))


def light(c, t=.2):
    return mix(c, (255, 255, 255), t)


def dark(c, t=.2):
    return mix(c, (20, 24, 21), t)


def lum(c):
    c = rgb(c) if isinstance(c, str) else c
    return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]


class C:
    def __init__(self, dpi=300):
        self.dpi = dpi
        self.S = dpi / 25.4
        self.W = int(round(420 * self.S))
        self.H = int(round(297 * self.S))
        self.img = Image.new("RGB", (self.W, self.H), rgb(BG))
        self.d = ImageDraw.Draw(self.img)
        self._fc = {}
        self.fonts = {
            "r": r"C:\Windows\Fonts\msyh.ttc",
            "b": r"C:\Windows\Fonts\msyhbd.ttc",
            "l": r"C:\Windows\Fonts\msyhl.ttc",
            "n": r"C:\Windows\Fonts\bahnschrift.ttf",
        }

    # ---------- units ----------
    def X(self, mm):
        return mm * self.S

    def F(self, pt, w="r"):
        key = (w, round(pt, 2))
        if key not in self._fc:
            px = max(1, int(round(pt * self.dpi / 72)))
            self._fc[key] = ImageFont.truetype(self.fonts[w], px, index=0)
        return self._fc[key]

    def tw(self, s, pt, w="r"):
        return self.d.textlength(s, font=self.F(pt, w)) / self.S

    def th(self, pt):
        return pt * 0.3528 * 1.38  # mm, line box approx

    # ---------- primitives ----------
    def rect(self, x, y, w, h, fill=None, outline=None, width=.3, r=0):
        box = [self.X(x), self.X(y), self.X(x + w), self.X(y + h)]
        kw = dict(fill=rgb(fill) if fill else None,
                  outline=rgb(outline) if outline else None,
                  width=max(1, int(round(width * self.S))))
        if r:
            self.d.rounded_rectangle(box, radius=self.X(r), **kw)
        else:
            self.d.rectangle(box, **kw)

    def line(self, x1, y1, x2, y2, color=INK, width=.35):
        self.d.line([self.X(x1), self.X(y1), self.X(x2), self.X(y2)],
                    fill=rgb(color) if isinstance(color, str) else color,
                    width=max(1, int(round(width * self.S))))

    def dash(self, x1, y1, x2, y2, color=RULE, width=.3, on=2.0, off=1.6):
        dx, dy = x2 - x1, y2 - y1
        L = math.hypot(dx, dy)
        if L <= 0:
            return
        ux, uy = dx / L, dy / L
        pos = 0.0
        while pos < L:
            e = min(pos + on, L)
            self.line(x1 + ux * pos, y1 + uy * pos, x1 + ux * e, y1 + uy * e, color, width)
            pos += on + off

    def arrow(self, x1, y1, x2, y2, color=INK, width=.35, head=1.7):
        ang = math.atan2(y2 - y1, x2 - x1)
        hx, hy = x2 - head * .8 * math.cos(ang), y2 - head * .8 * math.sin(ang)
        self.line(x1, y1, hx, hy, color, width)
        p1 = (x2, y2)
        p2 = (x2 - head * math.cos(ang - .42), y2 - head * math.sin(ang - .42))
        p3 = (x2 - head * math.cos(ang + .42), y2 - head * math.sin(ang + .42))
        self.d.polygon([(self.X(p1[0]), self.X(p1[1])), (self.X(p2[0]), self.X(p2[1])),
                        (self.X(p3[0]), self.X(p3[1]))], fill=rgb(color) if isinstance(color, str) else color)

    def text(self, x, y, s, pt=9, color=INK, w="r", anchor="lt", tracking=0, bg=None):
        f = self.F(pt, w)
        px, py = self.X(x), self.X(y)
        if bg:
            tw = self.tw(s, pt, w)
            th = self.th(pt)
            if anchor == "lt":
                self.rect(x - .6, y - .4, tw + 1.2, th + .4, fill=bg)
            elif anchor == "mm":
                self.rect(x - tw / 2 - .6, y - th / 2 - .4, tw + 1.2, th + .8, fill=bg)
        if tracking:
            cx = x
            for ch in s:
                self.d.text((self.X(cx), py), ch, font=f,
                            fill=rgb(color) if isinstance(color, str) else color, anchor="lt")
                cx += self.tw(ch, pt, w) + tracking
        else:
            self.d.text((px, py), s, font=f,
                        fill=rgb(color) if isinstance(color, str) else color, anchor=anchor)

    def text_rot(self, cx, cy, s, pt=8, color=INK, w="r", angle=90):
        f = self.F(pt, w)
        tw = int(self.d.textlength(s, font=f)) + 6
        th = int(pt * self.dpi / 72 * 1.5) + 6
        im = Image.new("RGBA", (tw, th), (0, 0, 0, 0))
        dd = ImageDraw.Draw(im)
        dd.text((3, 2), s, font=f, fill=rgb(color) if isinstance(color, str) else color)
        im = im.rotate(angle, expand=True, resample=Image.BICUBIC)
        self.img.paste(im, (int(self.X(cx) - im.width / 2), int(self.X(cy) - im.height / 2)), im)

    def wrap(self, s, pt, width, w="r"):
        lines = []
        for para in s.split("\n"):
            cur = ""
            for ch in para:
                if ch == "\r":
                    continue
                test = cur + ch
                if self.tw(test, pt, w) <= width or not cur:
                    cur = test
                else:
                    lines.append(cur)
                    cur = ch
            lines.append(cur)
        return lines

    def para(self, x, y, s, pt=8.5, width=100, color=INK, w="r", leading=1.55, max_lines=None):
        lines = self.wrap(s, pt, width, w)
        if max_lines:
            lines = lines[:max_lines]
        yy = y
        for ln in lines:
            self.text(x, yy, ln, pt, color, w)
            yy += pt * 0.3528 * leading
        return yy

    # ---------- decorative ----------
    def iso_box(self, x, y, w, h, color=ORANGE, outline=None):
        """Small isometric carton mark, w/h in mm."""
        top = (x + w / 2, y)
        left = (x, y + h * .30)
        right = (x + w, y + h * .30)
        mid = (x + w / 2, y + h * .60)
        bot = (x + w / 2, y + h)
        pts = lambda ps: [(self.X(a), self.X(b)) for a, b in ps]
        col = rgb(color) if isinstance(color, str) else color
        self.d.polygon(pts([top, right, mid, left]), fill=light(col, .18),
                       outline=rgb(outline) if outline else dark(col, .15))
        self.d.polygon(pts([left, mid, bot]), fill=dark(col, .10),
                       outline=rgb(outline) if outline else dark(col, .15))
        self.d.polygon(pts([mid, right, (x + w, y + h * .70), bot]), fill=col,
                       outline=rgb(outline) if outline else dark(col, .15))

    def cat_color(self, key):
        return CATS[key]["color"]


# ---------- page furniture ----------
def page_top(c, section="", page=""):
    c.rect(0, 0, 420, 3.2, fill=GREEN)
    c.rect(0, 3.2, 420, 0.7, fill=ORANGE)


def footer(c, left, right="", dark=False):
    col = MUTED if not dark else mix(BG, MUTED, .2)
    c.line(18, 288.5, 402, 288.5, RULE, .25)
    c.text(18, 290.2, left, 6.4, col)
    if right:
        c.text(402, 290.2, right, 6.4, col, anchor="rt")


def header(c, eyebrow, title, subtitle, page, right_stat=None):
    page_top(c)
    c.iso_box(18, 15.2, 9.6, 10.4, ORANGE)
    c.text(31, 12.2, eyebrow, 7.0, GREEN, "b", tracking=.35)
    c.text(31, 17.6, title, 26, INK, "b")
    c.text(31, 31.8, subtitle, 9.2, MUTED)
    c.text(402, 13.0, page, 7.0, MUTED, anchor="rt")
    if right_stat:
        c.text(402, 17.4, right_stat, 8.2, MUTED, anchor="rt")
    c.line(18, 44.0, 402, 44.0, RULE, .3)


def spec_strip(c, items, y=48.3, h=9.0):
    c.rect(18, y, 384, h, fill=PAPER, outline=RULE, width=.25, r=1.4)
    n = len(items)
    colw = 384 / n
    for i, (k, v) in enumerate(items):
        x = 18 + i * colw
        if i:
            c.line(x, y + 2.0, x, y + h - 2.0, RULE, .25)
        c.text(x + colw / 2, y + 1.3, k, 6.2, MUTED, anchor="mt")
        c.text(x + colw / 2, y + 3.9, v, 10.2, INK, "b", anchor="mt")


# ---------- plan ----------
def draw_plan(c, ox=26, oy=64, sc=1 / 20):
    """Plan, real mm -> page mm scale sc."""
    L, W = ROOM["L"], ROOM["W"]
    x0, y0 = ox, oy
    x1, y1 = ox + L * sc, oy + W * sc

    # wall band
    c.rect(x0 - 2.4, y0 - 2.4, (x1 - x0) + 4.8, (y1 - y0) + 4.8, fill=WALL)
    c.rect(x0, y0, x1 - x0, y1 - y0, fill=ROOMBG)

    # door opening: left wall, offset 130 from top, 1030 wide
    dy0 = y0 + DOOR["offset"] * sc
    dy1 = dy0 + DOOR["width"] * sc
    c.rect(x0 - 2.6, dy0, 5.2, dy1 - dy0, fill=BG)
    c.line(x0, dy0, x0, dy1, BG, 1.3)
    # sliding panel outside
    c.line(x0 - 3.6, dy0, x0 - 3.6, dy1, MUTED, .45)
    c.line(x0 - 4.4, dy0 + .8, x0 - 4.4, dy1 + .8, mix(BG, MUTED, .45), .3)
    # door dimension outside the wall
    dx = x0 - 4.4
    c.line(dx, dy0, dx, dy1, MUTED, .3)
    c.line(dx - .8, dy0, dx + .8, dy0, MUTED, .3)
    c.line(dx - .8, dy1, dx + .8, dy1, MUTED, .3)
    c.line(dx + .8, dy0, x0, dy0, MUTED, .2)
    c.line(dx + .8, dy1, x0, dy1, MUTED, .2)
    c.text_rot(dx - 2.4, (dy0 + dy1) / 2, "1030", 6.8, MUTED, "b")
    # entry arrow inside the room
    c.arrow(x0 + 1.2, 110.0, x0 + 11.0, 110.0, ORANGE, .55, 2.0)
    c.text(x0 + 1.2, 103.2, "入口", 7.0, ORANGE, "b")

    # shelves
    depth = 500
    top_y = y0
    bot_y = y1 - depth * sc
    sdefs = [
        (1, 600, 1500, "food", top_y, "top"),
        (2, 2100, 1500, "textile", top_y, "top"),
        (3, 0, 1500, "archive", bot_y, "bottom"),
        (4, 1500, 1000, "tools", bot_y, "bottom"),
        (5, 2500, 1000, "flex", bot_y, "bottom"),
    ]
    for sid, start, ln, cat, yy, side in sdefs:
        x = x0 + start * sc
        w = ln * sc
        h = depth * sc
        col = CATS[cat]["color"]
        edge_y = yy + h if side == "top" else yy
        if cat == "flex":
            c.rect(x, yy, w, h, fill=mix(BG, col, .12), outline=None)
            c.dash(x, yy, x + w, yy, col, .5, 1.4, 1.1)
            c.dash(x + w, yy, x + w, yy + h, col, .5, 1.4, 1.1)
            c.dash(x, yy + h, x + w, yy + h, col, .5, 1.4, 1.1)
            c.dash(x, yy, x, yy + h, col, .5, 1.4, 1.1)
        else:
            c.rect(x, yy, w, h, fill=light(col, .82), outline=col, width=.55, r=.4)
            # aisle front edge
            edge_y = yy + h if side == "top" else yy
            c.rect(x, edge_y - (1.25 if side == "top" else 0), w, 1.25, fill=col)
            c.line(x, edge_y, x + w, edge_y, dark(col, .15), .7)
        # label
        cx, cy = x + w / 2, yy + h / 2
        c.d.ellipse([c.X(cx - 2.6), c.X(cy - 3.4), c.X(cx + 2.6), c.X(cy + 1.8)],
                    fill=rgb(col))
        c.text(cx, cy - 1.55, str(sid), 7.4, "#FFFFFF", "b", anchor="mm")
        c.text(cx, cy + 3.4, CATS[cat]["name"], 6.2, dark(col, .25), "b", anchor="mm")
        if cat == "flex":
            c.text(cx, cy + 7.6, "空", 5.8, mix(MUTED, col, .3), "b", anchor="mm")
        else:
            # module ticks along front edge
            nmod = max(1, ln // 500)
            for k in range(1, nmod):
                tx = x + k * 500 * sc
                c.line(tx, edge_y, tx, edge_y + (2.0 if side == "top" else -2.0),
                       light(col, .15), .3)

    # entry landing label
    c.text(x0 + 300 * sc, y0 + 4.0, "入口留空 600", 6.0, MUTED)

    # aisle dimension inside right end
    ax = x0 + 3740 * sc
    c.line(ax, y0 + 500 * sc + 2, ax, y1 - 500 * sc - 2, MUTED, .3)
    c.line(ax - 1.2, y0 + 500 * sc + 2, ax + 1.2, y0 + 500 * sc + 2, MUTED, .3)
    c.line(ax - 1.2, y1 - 500 * sc - 2, ax + 1.2, y1 - 500 * sc - 2, MUTED, .3)
    c.text_rot(ax - 3.4, (y0 + y1) / 2, "通道 1380", 6.4, GREEN, "b")

    # room dimensions
    # top 4000
    ty = y0 - 7.2
    c.line(x0, ty, x1, ty, MUTED, .3)
    c.line(x0, ty - .9, x0, ty + .9, MUTED, .3)
    c.line(x1, ty - .9, x1, ty + .9, MUTED, .3)
    c.arrow(x0 + 2, ty, x0, ty, MUTED, .3, 1.4)
    c.arrow(x1 - 2, ty, x1, ty, MUTED, .3, 1.4)
    c.text((x0 + x1) / 2, ty - 4.6, "4000", 7.4, MUTED, "b", anchor="mt", bg=BG)

    # right 2380
    rx = x1 + 7.0
    c.line(rx, y0, rx, y1, MUTED, .3)
    c.line(rx - .9, y0, rx + .9, y0, MUTED, .3)
    c.line(rx - .9, y1, rx + .9, y1, MUTED, .3)
    c.arrow(rx, y0 + 2, rx, y0, MUTED, .3, 1.4)
    c.arrow(rx, y1 - 2, rx, y1, MUTED, .3, 1.4)
    c.text_rot(rx + 4.2, (y0 + y1) / 2, "2380", 7.4, MUTED, "b")

    # legend
    ly = 189.0
    c.text(26, ly, "货架", 6.4, MUTED, "b")
    lx = 40
    for i, cat in enumerate(["food", "textile", "archive", "tools", "flex"], start=1):
        col = CATS[cat]["color"]
        c.rect(lx, ly - .5, 3.2, 3.2, fill=col, r=.4)
        c.text(lx + 1.6, ly + 1.1, str(i), 5.4, "#FFFFFF", "b", anchor="mm")
        c.text(lx + 5.0, ly, f'{i} {CATS[cat]["name"]}', 6.4, INK)
        lx += 5.0 + c.tw(f'{i} {CATS[cat]["name"]}', 6.4) + 7.0

    c.text(26, 197.0, "门洞 1030 建议外开/推拉；内开时铰链放下侧（远离 600 留空）。", 6.4, MUTED)
    c.text(26, 202.0, "4/5 号柜留 5 层做灵活层板；不拆板。", 6.4, MUTED)


# ---------- page 1 ----------
def page1(c):
    page_top(c)
    c.iso_box(18, 15.0, 10.2, 11.2, ORANGE)
    c.text(32, 11.6, "STORAGE SYSTEM / DESIGN PROPOSAL", 7.0, GREEN, "b", tracking=.35)
    c.text(32, 16.4, "储藏室收纳系统", 30, INK, "b")
    c.text(32, 34.0, "4.0 × 2.38 m 净空间 · 5 组货架 · 3 套纸箱配置", 9.4, MUTED)
    c.text(402, 13.0, "2026.11 / 方案版 01", 7.0, MUTED, anchor="rt")
    c.line(18, 45.0, 402, 45.0, RULE, .3)
    c.text(26, 51.2, "平面布置 / 1:20 · 按 500 深绘制", 8.0, GREEN, "b", tracking=.2)

    draw_plan(c)

    # right recommendation card
    x, y, w, h = 246, 51.5, 156, 143
    c.rect(x, y, w, h, fill=PAPER, outline=RULE, width=.3, r=2.2)
    c.rect(x, y, 1.6, h, fill=ORANGE, r=.8)
    c.text(x + 7, y + 6.0, "推荐配置 / RECOMMENDED", 6.4, GREEN, "b", tracking=.3)
    c.text(x + 7, y + 11.0, "5 层 × 50 深", 24, INK, "b")
    c.text(x + 7, y + 22.6, "底留 500 · 顶留 650", 8.2, MUTED)

    # mini elevation
    mx, my, mw, mh = x + 112, y + 7.0, 35, 51
    c.rect(mx, my, mw, mh, fill=ROOMBG, outline=RULE, width=.2)
    for hh in [500, 875, 1250, 1625, 2000]:
        yy = my + mh - hh / 2650 * mh
        c.line(mx + 1.5, yy, mx + mw - 1.5, yy, BOARD, .35)
    for yy0, hh, cat, n in [(500, 320, "food", 2), (875, 260, "archive", 2), (1250, 240, "textile", 2), (1625, 260, "tools", 2)]:
        bw = (mw - 4) / 2.4
        for i in range(n):
            c.rect(mx + 2 + i * (bw + .6), my + mh - (yy0 + hh) / 2650 * mh,
                   bw, hh / 2650 * mh, fill=CATS[cat]["color"], outline=dark(CATS[cat]["color"], .2), width=.2, r=.25)
    c.rect(mx + 2, my + mh - 2390 / 2650 * mh, mw - 4, 390 / 2650 * mh,
           fill=CATS["top"]["color"], outline=dark(CATS["top"]["color"], .2), width=.2, r=.25)
    c.line(mx, my + mh - 2000 / 2650 * mh, mx + mw, my + mh - 2000 / 2650 * mh, FRAME, .4)
    c.text(mx + mw / 2, my + mh + 1.0, "5 层 / 4 箱层 + 顶", 5.0, MUTED, anchor="mt")

    # metrics
    c.line(x + 7, y + 40.0, x + w - 7, y + 40.0, RULE, .25)
    c.text(x + 7, y + 43.2, "345", 16, GREEN_D, "n")
    c.text(x + 21, y + 46.6, "mm 箱层净高", 6.2, MUTED)
    c.text(x + 78, y + 43.2, "1380", 16, GREEN_D, "n")
    c.text(x + 98, y + 46.6, "mm 中央通道", 6.2, MUTED)

    # reasons
    ry = y + 57.5
    reasons = [
        ("01", "1–8 号全部放得下", "5 号 32 cm 高，净高还剩 2.5 cm。"),
        ("02", "10 号能放顶部", "深 50 cm 放得下 41 cm；40 cm 深不行。"),
        ("03", "64 个前排箱 + 8 个顶箱", "26 m 货架，预留约 30% 余位。"),
    ]
    for i, (num, t1, t2) in enumerate(reasons):
        yy = ry + i * 25.5
        c.text(x + 7, yy, num, 7.2, ORANGE, "n")
        c.text(x + 15, yy - .4, t1, 9.0, INK, "b")
        c.text(x + 15, yy + 5.0, t2, 6.9, MUTED)
        if i < 2:
            c.line(x + 15, yy + 11.6, x + w - 7, yy + 11.6, mix(RULE, BG, .35), .2)
    c.line(x + 7, y + 116.0, x + w - 7, y + 116.0, RULE, .25)
    c.text(x + 7, y + 118.8, "不选 6 层：净高 27 cm，5 号放不下，3/8 号只剩 1 cm。", 6.3, MUTED)
    c.text(x + 7, y + 124.4, "不选 4 层：净高 47 cm，适合大件，箱数少 20 个。", 6.3, MUTED)
    c.text(x + 7, y + h - 8.0, "先按 A 方案买箱；B/C 只换层板与箱型。", 6.4, GREEN, "b")

    # scheme cards
    cards = [
        ("A", "均衡型", "5 层 × 50 深", 72, "2.26", "综合首选 · 取放轻松", "P2", True),
        ("B", "细分型", "6 层 × 40 深", 94, "2.11", "小件、文具、药品多", "P3", False),
        ("C", "大件型", "4 层 × 50 深", 52, "2.17", "被褥、冬衣、大件多", "P4", False),
    ]
    cy, ch, cw = 214.0, 66, 122
    for i, (key, name, spec, cnt, vol, note, pref, hi) in enumerate(cards):
        cx = 18 + i * (cw + 9)
        c.rect(cx, cy, cw, ch, fill=PAPER if not hi else "#FBF3E8",
               outline=ORANGE if hi else RULE, width=.9 if hi else .3, r=2.0)
        c.text(cx + 7, cy + 5.2, key, 20, ORANGE if hi else GREEN, "n")
        c.text(cx + 17, cy + 5.2, name, 11, INK, "b")
        if hi:
            c.rect(cx + cw - 20, cy + 5.6, 14, 5.2, fill=ORANGE, r=2.6)
            c.text(cx + cw - 13, cy + 8.2, "推荐", 5.4, "#FFFFFF", "b", anchor="mm")
        c.text(cx + 7, cy + 16.4, spec, 7.6, MUTED)
        c.text(cx + 7, cy + 23.0, str(cnt), 25, GREEN_D if not hi else ORANGE, "n")
        c.text(cx + 7 + c.tw(str(cnt), 25, "n") + 1.2, cy + 34.2, "箱", 6.8, MUTED)
        c.text(cx + cw - 7, cy + 26.0, vol, 11.5, INK, "n", anchor="rt")
        c.text(cx + cw - 7, cy + 31.8, "m³", 6.2, MUTED, anchor="rt")
        c.text(cx + 7, cy + 44.0, note, 6.8, MUTED)
        mixline = {"A": "箱型：2/3/5/6 号为主，顶 10 号",
                   "B": "箱型：1/2/3 号为主，顶 9 号",
                   "C": "箱型：8/9/10 号为主，顶 10 号"}[key]
        c.text(cx + 7, cy + 50.0, mixline, 6.2, GREEN_D)
        c.text(cx + cw - 7, cy + ch - 7.2, pref, 6.4, MUTED, anchor="rt")
        c.line(cx + 7, cy + 40.0, cx + cw - 7, cy + 40.0, mix(RULE, BG, .3), .2)

    footer(c, "尺寸单位 mm · 现场 4000×2380×2650；门洞 1030、距上墙 130 按图推断 · 平面按 500 深；B 方案 400 深，通道 1580 · 底留 500 为板面高",
           "01 / 05")


if __name__ == "__main__":
    dpi = int(sys.argv[1]) if len(sys.argv) > 1 else 150
    out = sys.argv[2] if len(sys.argv) > 2 else r"E:\deepseek\储藏室系统开发\work\p1.png"
    c = C(dpi)
    page1(c)
    c.img.save(out, quality=95)
    print("saved", out, c.img.size)
