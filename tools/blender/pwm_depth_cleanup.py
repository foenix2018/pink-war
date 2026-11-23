"""Remove depth conflicts from the Blender export after vertex quantization."""

import argparse
from array import array
import gzip
import json
from pathlib import Path
import struct
import sys


def clean(model, payload, *, emissive_double_sided=False):
    if sys.byteorder != 'little':
        raise RuntimeError('PWM1 quantization requires little-endian arrays')
    seen_by_material = {}
    duplicates = collapsed = 0
    for primitive in model['primitives']:
        material = primitive['material']
        settings = model['materials'][material]
        double_sided = (settings.get('doubleSided') or settings['alpha'] < 1
                        or (emissive_double_sided and settings['emissive'] >= 2))
        seen = seen_by_material.setdefault(material, set())
        start = primitive['position']
        positions = array('h', payload[start:start + primitive['vertices'] * 6])
        positions = list(zip(positions[::3], positions[1::3], positions[2::3]))
        index_type = 'I' if primitive['index32'] else 'H'
        start = primitive['index']
        indices = array(index_type)
        indices.frombytes(payload[start:start + primitive['indices'] * indices.itemsize])
        kept = array(index_type)
        for a, b, c in zip(indices[::3], indices[1::3], indices[2::3]):
            pa, pb, pc = positions[a], positions[b], positions[c]
            if pa == pb or pb == pc or pc == pa:
                collapsed += 1
                continue
            if double_sided:
                face = tuple(sorted((pa, pb, pc)))
            elif pa < pb and pa < pc:
                face = (pa, pb, pc)
            elif pb < pc:
                face = (pb, pc, pa)
            else:
                face = (pc, pa, pb)
            if face in seen:
                duplicates += 1
                continue
            seen.add(face)
            kept.extend((a, b, c))
        primitive['indices'] = len(kept)
        # Keep buffer offsets stable. Vacated index slots compress to nearly nothing.
        encoded = kept.tobytes()
        payload[start:start + len(indices) * kept.itemsize] = encoded.ljust(len(indices) * kept.itemsize, b'\0')
    return {'coincidentFacesRemoved': duplicates, 'collapsedFacesRemoved': collapsed}


def pack(model, payload):
    meta = json.dumps(model, ensure_ascii=False, separators=(',', ':')).encode()
    meta += b' ' * (-len(meta) % 4)
    return b'PWM1' + struct.pack('<I', len(meta)) + meta + payload


def refresh(path, stats_path, *, emissive_double_sided=False):
    raw = gzip.decompress(path.read_bytes())
    if raw[:4] != b'PWM1':
        raise ValueError(f'{path} is not a PWM1 model')
    base = 8 + struct.unpack_from('<I', raw, 4)[0]
    model = json.loads(raw[8:base])
    payload = bytearray(raw[base:])
    changes = clean(model, payload, emissive_double_sided=emissive_double_sided)
    if not any(changes.values()):
        return changes
    cleaned = pack(model, payload)
    path.write_bytes(gzip.compress(cleaned, compresslevel=9, mtime=0))
    stats = json.loads(stats_path.read_text())
    stats.update(changes, triangles=sum(p['indices'] // 3 for p in model['primitives']),
                 pwmBytes=len(cleaned), downloadBytes=path.stat().st_size)
    stats_path.write_text(json.dumps(stats, indent=2, ensure_ascii=False) + '\n')
    return changes


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('model', type=Path)
    parser.add_argument('stats', type=Path)
    parser.add_argument('--emissive-double-sided', action='store_true')
    args = parser.parse_args()
    print(args.model.name, refresh(args.model, args.stats,
                                   emissive_double_sided=args.emissive_double_sided))
