"""Bake the approved portal sounds with an original, irregular electric discharge."""
from pathlib import Path
import hashlib
import json
import subprocess
import wave

import numpy as np
from scipy.signal import butter, sosfilt

RATE = 32000
ASSETS = Path(__file__).resolve().parents[1] / 'dist/assets/audio/portals'

# Each group follows one phase of the portal animation.
ARCS = {
    'open': [
        (.16, .17, .22, -.42), (.42, .12, .26, .36), (.69, .22, .33, -.20),
        (1.11, .18, .29, .38), (1.40, .27, .41, -.4), (1.79, .36, .54, .30),
        (2.10, .22, .35, -.32), (2.38, .19, .19, .2),
    ],
    'close': [
        (.07, .20, .24, .24), (.39, .17, .22, -.28), (.85, .16, .27, .28),
        (1.18, .19, .34, -.35), (1.48, .19, .48, .12), (1.72, .16, .30, -.16),
    ],
}


def band(noise, low, high):
    return sosfilt(butter(2, [low, high], fs=RATE, btype='bandpass', output='sos'), noise)


def spark(rng, seconds):
    time = np.arange(round(seconds * RATE)) / RATE
    noise = rng.standard_normal(len(time))
    # Damped crackle with an initial snap and a softer, irregular body.
    split = band(noise, 1400, 7700)
    body = band(noise, 460, 3100)
    envelope = np.minimum(1, time / .0015) * np.exp(-time / rng.uniform(.008, .021))
    envelope *= np.clip((seconds - time) / .008, 0, 1)
    return (.62 * split + .38 * body) * envelope


def crackle(rng, frames, groups):
    result = np.zeros((frames, 2), dtype=np.float64)
    for start, span, intensity, pan in groups:
        offsets = [0]
        while offsets[-1] < span - .035:
            offsets.append(offsets[-1] + rng.uniform(.021, .065))
        for index, offset in enumerate(offsets):
            start_frame = round((start + offset) * RATE)
            sample = spark(rng, min(.086, span - offset + .045))
            power = intensity * (1 if index == 0 else rng.uniform(.20, .65))
            stereo_pan = np.clip(pan + rng.uniform(-.27, .27), -.85, .85)
            panning = np.sqrt([1 - stereo_pan, 1 + stereo_pan])
            end = min(frames, start_frame + len(sample))
            result[start_frame:end] += sample[:end - start_frame, None] * power * panning
    return result


def file_hash(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def bake(kind, seed):
    source = ASSETS / f'{kind}-cc0-v4.wav'
    dest = ASSETS / f'{kind}-cc0-v5.wav'
    samples = subprocess.check_output([
        'ffmpeg', '-v', 'error', '-i', str(source), '-ar', str(RATE), '-ac', '2',
        '-f', 'f32le', '-',
    ])
    base = np.frombuffer(samples, dtype='<f4').reshape(-1, 2)
    discharge = crackle(np.random.default_rng(seed), len(base), ARCS[kind])
    mixed = base * .84 + discharge
    peak = np.max(np.abs(mixed))
    mixed *= min(1, .89 / peak)
    with wave.open(str(dest), 'wb') as wav:
        wav.setparams((2, 2, RATE, 0, 'NONE', 'not compressed'))
        wav.writeframes(np.rint(mixed * 32767).astype('<i2').tobytes())
    return {
        'phase': kind,
        'file': dest.name,
        'sha256': file_hash(dest),
        'base': source.name,
        'baseSha256': file_hash(source),
        'bytes': dest.stat().st_size,
        'seconds': len(base) / RATE,
        'peakDBFS': round(float(20 * np.log10(np.max(np.abs(mixed)))), 2),
    }


if __name__ == '__main__':
    metadata = {
        'sound': 'Approved Kenney mix with original Pink Wars electrical crackle',
        'license': 'CC0-1.0',
        'sourceRegister': 'source-manifest.json',
        'sampleRateHz': RATE,
        'files': [bake('open', 6387), bake('close', 7741)],
    }
    (ASSETS / 'mix-v5.json').write_text(json.dumps(metadata, indent=2) + '\n')
    print(json.dumps(metadata, indent=2))
