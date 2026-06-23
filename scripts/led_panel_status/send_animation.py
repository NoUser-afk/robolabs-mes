from __future__ import annotations

import argparse
import asyncio
import io
import math
import time
from pathlib import Path

from PIL import Image, ImageDraw

from panel_status import HEIGHT, WIDTH, P08FPanel, load_config


def blend(a: tuple[int, int, int], b: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return tuple(int(x + (y - x) * t) for x, y in zip(a, b))


def make_red_lines_frames(count: int = 32) -> list[Image.Image]:
    frames: list[Image.Image] = []
    for frame in range(count):
        image = Image.new("RGB", (WIDTH, HEIGHT), (0, 0, 0))
        pixels = image.load()
        phase = frame / count

        # Dark red satin base from the previous calmer version.
        for y in range(HEIGHT):
            for x in range(WIDTH):
                vignette = 1.0 - abs(y - 7.5) / 9.0
                wave = (math.sin((x * 0.22) - phase * math.tau) + 1.0) / 2.0
                red = int(8 + 34 * vignette + 22 * wave)
                pixels[x, y] = (red, 0, int(red * 0.08))

        draw = ImageDraw.Draw(image)

        # The old calm contours, plus extra red-only diagonal strokes.
        for y_base, strength in ((4, 120), (11, 90)):
            points: list[tuple[int, int]] = []
            for x in range(-2, WIDTH + 2):
                y = y_base + int(math.sin((x * 0.35) + phase * math.tau) * 1.2)
                points.append((x, y))
            draw.line(points, fill=(strength, 0, 12), width=1)

        # Red gloss sweeps in several offsets, replacing the white sweep.
        sweep_base = phase * (WIDTH + HEIGHT + 12) - 10
        for offset, peak, halo in ((0, 235, 130), (12, 185, 95), (24, 150, 80)):
            sweep = (sweep_base + offset) % (WIDTH + HEIGHT + 12) - 6
            for y in range(HEIGHT):
                for x in range(WIDTH):
                    distance = abs((x + y * 0.9) - sweep)
                    if distance < 0.75:
                        pixels[x, y] = (peak, 0, 20)
                    elif distance < 1.9:
                        base = pixels[x, y]
                        pixels[x, y] = (max(base[0], halo), 0, max(base[2], 14))
                    elif distance < 3.1:
                        base = pixels[x, y]
                        pixels[x, y] = (max(base[0], 80), 0, max(base[2], 10))

        frames.append(image)
    return frames


def encode_gif(frames: list[Image.Image], duration_ms: int) -> bytes:
    output = io.BytesIO()
    frames[0].save(
        output,
        format="GIF",
        save_all=True,
        append_images=frames[1:],
        duration=duration_ms,
        loop=0,
        disposal=2,
        optimize=False,
    )
    return output.getvalue()


async def run(args: argparse.Namespace) -> None:
    config = load_config(args.config)
    address = args.address or config["address"]
    frames = make_red_lines_frames(args.frames)
    gif = encode_gif(frames, args.duration)
    args.save_gif.write_bytes(gif)
    if args.render_only:
        print(f"rendered animation {args.save_gif} bytes={len(gif)} frames={len(frames)}")
        return

    name = args.name or f"an{int(time.time()) % 10000:04d}"
    async with P08FPanel(address=address, chunk_size=args.chunk_size) as panel:
        await panel.upload_media_and_show(name, gif, media_type="gif")
    print(f"sent animation name={name} bytes={len(gif)} frames={len(frames)}")


def parse_args() -> argparse.Namespace:
    root = Path(__file__).resolve().parent
    parser = argparse.ArgumentParser(description="Send a looping red line GIF to the P08F panel.")
    parser.add_argument("--config", type=Path, default=root / "config.json")
    parser.add_argument("--address", default=None)
    parser.add_argument("--name", default=None)
    parser.add_argument("--frames", type=int, default=32)
    parser.add_argument("--duration", type=int, default=65)
    parser.add_argument("--chunk-size", type=int, default=180)
    parser.add_argument("--save-gif", type=Path, default=root / "last_animation.gif")
    parser.add_argument("--render-only", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    asyncio.run(run(args))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
