"""Generate dependency-free, supersampled gateway grid icons inside the maskable safe area."""
from pathlib import Path
import struct
import zlib

OUTPUT = Path(__file__).resolve().parents[1] / 'public' / 'icons'
COLORS = ['9360eb', 'eb609f', '60bfeb', 'eb9f60', 'ebcb60', '60ebd0', '6075eb', '7deb60', 'eb6060']

def chunk(kind, data):
    return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data))

for size in [180, 192, 512]:
    rows = bytearray()
    for y in range(size):
        rows.append(0)
        for x in range(size):
            total = [0, 0, 0]
            for sy in range(4):
                for sx in range(4):
                    px, py = (x + (sx + .5) / 4) / size, (y + (sy + .5) / 4) / size
                    color = (244, 242, 239)
                    for i, hex_color in enumerate(COLORS):
                        cx, cy = .3 + (i % 3) * .2, .3 + (i // 3) * .2
                        if (px - cx) ** 2 + (py - cy) ** 2 <= .065 ** 2:
                            color = tuple(int(hex_color[j:j + 2], 16) for j in (0, 2, 4))
                            break
                    for c in range(3):
                        total[c] += color[c]
            rows.extend(round(c / 16) for c in total)
    png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0))
    png += chunk(b'IDAT', zlib.compress(rows)) + chunk(b'IEND', b'')
    OUTPUT.mkdir(parents=True, exist_ok=True)
    (OUTPUT / ('apple-touch-icon.png' if size == 180 else f'icon-{size}.png')).write_bytes(png)
