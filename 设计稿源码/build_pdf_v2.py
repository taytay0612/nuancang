# -*- coding: utf-8 -*-
"""Render the 4-page V2 boards at 300 dpi and assemble the PDF + previews."""
import os
import sys
from PIL import Image
from render_design import C
from render_v2 import page1
from render_v2_p2 import page2
from render_v2_p3 import page3
from render_v2_p4 import page4

OUT = r"E:\deepseek\储藏室系统开发\output"
PAGES = os.path.join(OUT, "pages")


def main(dpi=300):
    os.makedirs(PAGES, exist_ok=True)
    specs = [("01", page1), ("02", page2), ("03", page3), ("04", page4)]
    paths = []
    for name, fn in specs:
        print("render", name, flush=True)
        c = C(dpi)
        fn(c)
        p = os.path.join(PAGES, f"{name}.png")
        c.img.save(p, optimize=True)
        paths.append(p)
        prev = c.img.resize((1600, int(1600 * c.img.height / c.img.width)), Image.LANCZOS)
        prev.save(os.path.join(OUT, f"预览_{name}.jpg"), quality=92, optimize=True)

    imgs = [Image.open(p).convert("RGB") for p in paths]
    pdf = os.path.join(OUT, "储藏室收纳系统_设计方案_3号8号_A3.pdf")
    imgs[0].save(pdf, "PDF", resolution=float(dpi), save_all=True, append_images=imgs[1:],
                 quality=95, title="储藏室收纳系统设计方案 / 3号+8号",
                 author="DSH", subject="四柜放箱、一柜灵活；5个货架位置按图不变", creator="Pillow")
    print("saved", pdf, os.path.getsize(pdf) / 1024 / 1024, "MB")


if __name__ == "__main__":
    main(int(sys.argv[1]) if len(sys.argv) > 1 else 300)
