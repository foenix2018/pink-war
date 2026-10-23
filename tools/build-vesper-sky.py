"""Convert the licensed Poly Haven RGBE panorama into a local SDR sky texture.

Usage: python3 tools/build-vesper-sky.py source.hdr output.webp
The original HDR source and SHA-256 are recorded in assets/cc0/sources.json.
Requires numpy and Pillow; no network access and no game code generation.
"""
import io
import re
import sys
import numpy as np
from PIL import Image


def read_rgbe(path):
    stream = io.BytesIO(open(path, 'rb').read())
    while stream.readline().strip():
        pass
    match = re.fullmatch(rb'-Y (\d+) \+X (\d+)\s*', stream.readline())
    if not match:
        raise ValueError('Expected a standard -Y +X RGBE panorama')
    height, width = map(int, match.groups())
    rgbe = np.empty((height, width, 4), dtype=np.uint8)
    for row in range(height):
        header = stream.read(4)
        if header[:2] != b'\x02\x02' or int.from_bytes(header[2:], 'big') != width:
            raise ValueError('Expected Radiance channel RLE')
        for channel in range(4):
            column = 0
            while column < width:
                length = stream.read(1)[0]
                if length > 128:
                    count = length - 128
                    rgbe[row, column:column + count, channel] = stream.read(1)[0]
                else:
                    count = length
                    rgbe[row, column:column + count, channel] = np.frombuffer(stream.read(count), np.uint8)
                column += count
    return rgbe[:, :, :3].astype(np.float32) * np.exp2(rgbe[:, :, 3:4].astype(np.float32) - 136)


if __name__ == '__main__':
    rgb = read_rgbe(sys.argv[1])
    # Exposure and restrained chroma: W01 is a desolate morning, not M02 neon.
    rgb *= .62
    luminance = (rgb * [.2126, .7152, .0722]).sum(2, keepdims=True)
    rgb = luminance * .68 + rgb * .32
    rgb = rgb * (2.51 * rgb + .03) / (rgb * (2.43 * rgb + .59) + .14)
    rgb = np.clip(rgb, 0, 1)
    srgb = np.where(rgb <= .0031308, rgb * 12.92, 1.055 * np.power(rgb, 1 / 2.4) - .055)
    Image.fromarray(np.uint8(srgb * 255)).save(sys.argv[2], quality=87)
