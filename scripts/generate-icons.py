"""
Генерация PNG-иконок Uplink из SVG-дизайна.
Использует Pillow (без внешних SVG-зависимостей) — рисует иконку программно.

Запуск: python scripts/generate-icons.py
"""

from PIL import Image, ImageDraw
import os

OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'web', 'public')

SIZES = {
    'favicon-16x16.png':       16,
    'favicon-32x32.png':       32,
    'apple-touch-icon.png':    180,
    'uplink-icon-192.png':     192,
    'uplink-icon-512.png':     512,
}


def lerp_color(c1, c2, t):
    return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))


def draw_icon(size: int) -> Image.Image:
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    s = size

    # Скруглённый прямоугольник с градиентом #6366f1 -> #4f46e5
    c_top = (99, 102, 241)
    c_bot = (79, 70, 229)
    radius = round(s * 96 / 512)

    # Рисуем градиент по строкам внутри скруглённого прямоугольника
    # Сначала рисуем прямоугольник сплошным цветом, потом маскируем углы
    for y in range(s):
        t = y / (s - 1)
        color = lerp_color(c_top, c_bot, t)
        draw.line([(0, y), (s, y)], fill=color + (255,))

    # Маска для скруглённых углов — применяем через антиалиасинг
    mask = Image.new('L', (s, s), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle([0, 0, s - 1, s - 1], radius=radius, fill=255)
    img.putalpha(mask)

    draw = ImageDraw.Draw(img)

    # --- Стрелка вверх ---
    # Параметры масштабируются пропорционально размеру
    scale = s / 512
    sw = max(2, round(50 * scale))       # stroke width
    sw_sm = max(1, round(42 * scale))    # smile stroke width

    # Вершина стрелки
    ax = round(256 * scale)
    ay_top = round(130 * scale)
    ay_bot = round(350 * scale)
    a_left = round(160 * scale)
    a_right = round(352 * scale)
    a_arm_y = round(248 * scale)

    # Линия вниз (хвост стрелки)
    draw.line([(ax, ay_top), (ax, ay_bot)], fill='white', width=sw)

    # Левое плечо: от (a_left, a_arm_y) до (ax, ay_top)
    draw.line([(a_left, a_arm_y), (ax, ay_top)], fill='white', width=sw)
    # Правое плечо
    draw.line([(a_right, a_arm_y), (ax, ay_top)], fill='white', width=sw)

    # --- Улыбка (дуга внизу) ---
    # Квадратичная кривая Безье: M 162 395 Q 256 470 350 395
    # Аппроксимируем через polyline
    px, py = round(162 * scale), round(395 * scale)
    cx, cy = round(256 * scale), round(470 * scale)
    ex, ey = round(350 * scale), round(395 * scale)

    steps = max(20, size)
    points = []
    for i in range(steps + 1):
        t = i / steps
        bx = (1 - t) ** 2 * px + 2 * (1 - t) * t * cx + t ** 2 * ex
        by = (1 - t) ** 2 * py + 2 * (1 - t) * t * cy + t ** 2 * ey
        points.append((bx, by))

    if len(points) >= 2:
        draw.line(points, fill='white', width=sw_sm)

    return img


def main():
    os.makedirs(OUT_DIR, exist_ok=True)

    for filename, size in SIZES.items():
        img = draw_icon(size)
        path = os.path.join(OUT_DIR, filename)
        img.save(path, 'PNG')
        print(f'  {size}x{size}  ->  {filename}')

    # favicon.svg = копия SVG
    svg_src = os.path.join(OUT_DIR, 'uplink-icon.svg')
    svg_dst = os.path.join(OUT_DIR, 'favicon.svg')
    with open(svg_src, 'r', encoding='utf-8') as f:
        content = f.read()
    with open(svg_dst, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'  SVG  ->  favicon.svg')

    print('Готово.')


if __name__ == '__main__':
    main()
