from PIL import Image, ImageDraw, ImageFont
import os

SIZE = 256
img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

# 圆角方形底
d.rounded_rectangle([8, 8, SIZE - 8, SIZE - 8], radius=54, fill=(251, 245, 236, 255))
d.rounded_rectangle([8, 8, SIZE - 8, SIZE - 8], radius=54, outline=(150, 104, 63, 255), width=10)

# 木质横梁
d.rounded_rectangle([28, 30, SIZE - 28, 58], radius=12, fill=(189, 143, 96, 255))

font_paths = [
    r"C:\Windows\Fonts\msyhbd.ttc",
    r"C:\Windows\Fonts\msyh.ttc",
    r"C:\Windows\Fonts\simhei.ttf",
]
font = None
for p in font_paths:
    if os.path.exists(p):
        font = ImageFont.truetype(p, 132)
        break
if font is None:
    font = ImageFont.load_default()

text = "暖"
bbox = d.textbbox((0, 0), text, font=font)
tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
x = (SIZE - tw) / 2 - bbox[0]
y = 62 + (150 - th) / 2 - bbox[1]
d.text((x, y), text, font=font, fill=(122, 82, 48, 255))

os.makedirs("build", exist_ok=True)
img.save("build/icon.png")
img.save("build/icon.ico", sizes=[(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)])
print("icon written", os.path.getsize("build/icon.ico"))
