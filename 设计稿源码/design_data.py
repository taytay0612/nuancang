# -*- coding: utf-8 -*-
"""储藏室收纳系统：方案数据与校验。尺寸单位 mm，容积单位 L。"""

ROOM = {"L": 4000, "W": 2380, "H": 2650}
SHELF_H = 2000
BOTTOM = 500
TOP_CLEAR = 650
CLEAR_SIDE = 20          # 两侧立柱占用
GAP = 5                  # 箱间缝
DOOR = {"width": 1030, "offset": 130}

BOXES = {
    1:  {"w": 270, "d": 180, "h": 160, "v": 7.776,  "label": "1号", "vol": "9L",  "use": "药品、文具、小工具、数据线"},
    2:  {"w": 330, "d": 220, "h": 170, "v": 12.342, "label": "2号", "vol": "11L", "use": "食品、口罩、文具、零碎"},
    3:  {"w": 340, "d": 250, "h": 260, "v": 22.100, "label": "3号", "vol": "21L", "use": "A4 文件、书籍、相册"},
    4:  {"w": 360, "d": 300, "h": 200, "v": 21.600, "label": "4号", "vol": "19L", "use": "合同、证件、档案、票据"},
    5:  {"w": 350, "d": 320, "h": 320, "v": 35.840, "label": "5号", "vol": "33L", "use": "零食、囤货、衣物、工具"},
    6:  {"w": 440, "d": 300, "h": 240, "v": 31.680, "label": "6号", "vol": "31L", "use": "食品、衣物、搬家杂物"},
    8:  {"w": 480, "d": 320, "h": 260, "v": 39.936, "label": "8号", "vol": "37L", "use": "鞋、床品、礼物、杂物"},
    9:  {"w": 500, "d": 350, "h": 360, "v": 63.000, "label": "9号", "vol": "58L", "use": "春夏衣物、被褥"},
    10: {"w": 570, "d": 410, "h": 390, "v": 91.086, "label": "10号", "vol": "83L", "use": "秋冬衣物、被褥"},
}

CATS = {
    "food":    {"name": "食品", "color": "#D99A3E"},
    "textile": {"name": "衣物", "color": "#5F8F80"},
    "archive": {"name": "档案", "color": "#6F82A6"},
    "bedding": {"name": "床品", "color": "#6F82A6"},
    "tools":   {"name": "工具", "color": "#B06A4E"},
    "misc":    {"name": "清洁杂项", "color": "#8F8270"},
    "flex":    {"name": "灵活柜", "color": "#7D887D"},
    "top":     {"name": "顶部换季", "color": "#3E5C6B"},
}

# rows: 从下到上；L1 为最低箱层（板面 500），TOP 为 2000 顶板
SCHEMES = {
    "A": {
        "title": "均衡型",
        "tag": "推荐",
        "tiers": 5,
        "pitch": 375,
        "clear": 345,
        "depth": 500,
        "aisle": 2380 - 1000,
        "levels": [("L1", 500), ("L2", 875), ("L3", 1250), ("L4", 1625)],
        "shelves": [
            {"id": 1, "len": 1500, "cat": "food", "rows": {
                "L1": [3, 3, 3, 3, 3], "L2": [3, 3, 3, 3, 3], "L3": [3, 3, 3, 3, 3],
                "L4": [3, 3, 3, 3, 3], "TOP": []}},
            {"id": 2, "len": 1500, "cat": "textile", "rows": {
                "L1": [3, 3, 3, 3, 3], "L2": [3, 3, 3, 3, 3], "L3": [3, 3, 3, 3, 3],
                "L4": [3, 3, 3, 3, 3], "TOP": []}},
            {"id": 3, "len": 1500, "cat": "bedding", "rows": {
                "L1": [8, 8, 8, 8], "L2": [8, 8, 8, 8], "L3": [8, 8, 8, 8],
                "L4": [8, 8, 8, 8], "TOP": []}},
            {"id": 4, "len": 1000, "cat": "flex", "rows": {
                "L1": [], "L2": [], "L3": [], "L4": [], "TOP": []}},
            {"id": 5, "len": 1000, "cat": "flex", "rows": {
                "L1": [], "L2": [], "L3": [], "L4": [], "TOP": []}},
        ],
    },
}


def box_dims(b, rotated=False):
    """Placement footprint: 3号 25 along length / 34 depth; 8号 32 along length / 48 depth."""
    if rotated and b == 3:
        return 250, 340
    if rotated and b == 8:
        return 320, 480
    return BOXES[b]["w"], BOXES[b]["d"]


def row_boxes(sh, lev, rear=False):
    if rear:
        return sh.get("rear", {}).get(lev, [])
    return sh["rows"].get(lev, [])


def shelf_capacity(scheme):
    s = SCHEMES[scheme]
    result = []
    for sh in s["shelves"]:
        clear_len = sh["len"] - 2 * CLEAR_SIDE
        for lev in sh["rows"]:
            front = row_boxes(sh, lev, False)
            rear = row_boxes(sh, lev, True)
            used = sum(box_dims(b, True)[0] for b in front) + GAP * max(0, len(front) - 1)
            used_r = sum(box_dims(b, True)[0] for b in rear) + GAP * max(0, len(rear) - 1)
            max_h = max([BOXES[b]["h"] for b in front + rear], default=0)
            max_d = max([box_dims(b, True)[1] for b in front], default=0) + max([box_dims(b, True)[1] for b in rear], default=0)
            limit_h = TOP_CLEAR if lev == "TOP" else s["clear"]
            ok = used <= clear_len and used_r <= clear_len and max_h <= limit_h and max_d <= s["depth"]
            result.append({
                "shelf": sh["id"], "lev": lev, "used": used, "used_rear": used_r,
                "clear_len": clear_len, "n": len(front) + len(rear),
                "max_h": max_h, "max_d": max_d, "ok": ok,
            })
    return result


def bom(scheme):
    counts = {}
    locations = {}
    for sh in SCHEMES[scheme]["shelves"]:
        for lev in sh["rows"]:
            for b in row_boxes(sh, lev, False) + row_boxes(sh, lev, True):
                counts[b] = counts.get(b, 0) + 1
                locations.setdefault(b, [])
                key = f'{sh["id"]}-{lev}'
                if key not in locations[b]:
                    locations[b].append(key)
    total_v = sum(BOXES[b]["v"] * n for b, n in counts.items())
    return counts, locations, total_v


def validate():
    problems = []
    for key in SCHEMES:
        for row in shelf_capacity(key):
            if not row["ok"]:
                problems.append((key, row))
    return problems


if __name__ == "__main__":
    problems = validate()
    print("ROOM", ROOM)
    for key in SCHEMES:
        s = SCHEMES[key]
        counts, locs, vol = bom(key)
        print(f'\n== {key} {s["title"]}  {s["tiers"]}层 净高{s["clear"]} 深{s["depth"]} 通道{s["aisle"]}')
        print("  BOM:", " ".join(f'{BOXES[b]["label"]}×{n}' for b, n in sorted(counts.items())))
        print(f'  total={sum(counts.values())} boxes, volume={vol/1000:.2f} m3')
        for b, n in sorted(counts.items()):
            print(f'   {BOXES[b]["label"]:>4} {BOXES[b]["w"]}x{BOXES[b]["d"]}x{BOXES[b]["h"]}  x{n:<2}  {locs[b]}')
        if key == "A":
            for row in shelf_capacity(key):
                print("   ", row)
    print("\nPROBLEMS:", problems)
