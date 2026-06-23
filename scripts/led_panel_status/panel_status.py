from __future__ import annotations

import argparse
import asyncio
import datetime as dt
import json
import math
import os
import random
import struct
import subprocess
import sys
import time
import urllib.parse
import urllib.request
import zlib
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable

from bleak import BleakClient

try:
    import psutil
except ImportError:  # pragma: no cover - setup.ps1 installs it
    psutil = None


WRITE_UUID = "0000a08f-0000-1000-8000-00805f9b34fb"
NOTIFY_UUID = "0000f08f-0000-1000-8000-00805f9b34fb"
WIDTH = 32
HEIGHT = 16


FONT_3X5: dict[str, tuple[str, str, str, str, str]] = {
    " ": ("000", "000", "000", "000", "000"),
    "-": ("000", "000", "111", "000", "000"),
    ":": ("000", "010", "000", "010", "000"),
    "0": ("111", "101", "101", "101", "111"),
    "1": ("010", "110", "010", "010", "111"),
    "2": ("111", "001", "111", "100", "111"),
    "3": ("111", "001", "111", "001", "111"),
    "4": ("101", "101", "111", "001", "001"),
    "5": ("111", "100", "111", "001", "111"),
    "6": ("111", "100", "111", "101", "111"),
    "7": ("111", "001", "001", "001", "001"),
    "8": ("111", "101", "111", "101", "111"),
    "9": ("111", "101", "111", "001", "111"),
    "A": ("010", "101", "111", "101", "101"),
    "C": ("111", "100", "100", "100", "111"),
    "D": ("110", "101", "101", "101", "110"),
    "F": ("111", "100", "110", "100", "100"),
    "G": ("111", "100", "101", "101", "111"),
    "I": ("111", "010", "010", "010", "111"),
    "L": ("100", "100", "100", "100", "111"),
    "N": ("101", "111", "111", "111", "101"),
    "O": ("111", "101", "101", "101", "111"),
    "P": ("111", "101", "111", "100", "100"),
    "R": ("110", "101", "110", "101", "101"),
    "S": ("111", "100", "111", "001", "111"),
    "T": ("111", "010", "010", "010", "010"),
    "U": ("101", "101", "101", "101", "111"),
    "W": ("101", "101", "111", "111", "101"),
    "X": ("101", "101", "010", "101", "101"),
}

FONT_5X7: dict[str, tuple[str, str, str, str, str, str, str]] = {
    " ": ("00000", "00000", "00000", "00000", "00000", "00000", "00000"),
    "-": ("00000", "00000", "00000", "11111", "00000", "00000", "00000"),
    "0": ("01110", "10001", "10011", "10101", "11001", "10001", "01110"),
    "1": ("00100", "01100", "00100", "00100", "00100", "00100", "01110"),
    "2": ("01110", "10001", "00001", "00010", "00100", "01000", "11111"),
    "3": ("11110", "00001", "00001", "01110", "00001", "00001", "11110"),
    "4": ("00010", "00110", "01010", "10010", "11111", "00010", "00010"),
    "5": ("11111", "10000", "10000", "11110", "00001", "00001", "11110"),
    "6": ("01110", "10000", "10000", "11110", "10001", "10001", "01110"),
    "7": ("11111", "00001", "00010", "00100", "01000", "01000", "01000"),
    "8": ("01110", "10001", "10001", "01110", "10001", "10001", "01110"),
    "9": ("01110", "10001", "10001", "01111", "00001", "00001", "01110"),
    "C": ("01111", "10000", "10000", "10000", "10000", "10000", "01111"),
    "R": ("11110", "10001", "10001", "11110", "10100", "10010", "10001"),
}


Color = tuple[int, int, int]


@dataclass
class WeatherState:
    temperature_c: int | None = None
    code: int | None = None
    updated_at: float = 0.0
    error: str | None = None


@dataclass
class PcState:
    cpu_percent: int
    ram_percent: int
    cpu_temp_c: int | None
    weather_temp_c: int | None
    weather_code: int | None
    now: dt.datetime


def crc16_modbus(data: bytes) -> int:
    crc = 0xFFFF
    for byte in data:
        crc ^= byte
        for _ in range(8):
            if crc & 1:
                crc = ((crc >> 1) ^ 0xA001) & 0xFFFF
            else:
                crc = (crc >> 1) & 0xFFFF
    return crc


def make_a0(cmd: int, payload: bytes = b"") -> bytes:
    body = bytes([0xA0, cmd, 3 + len(payload)]) + payload
    return body + crc16_modbus(body).to_bytes(2, "little")


def make_a2(transfer_id: int, total_chunks: int, seq: int, payload: bytes) -> bytes:
    body = (
        bytes([0xA2])
        + transfer_id.to_bytes(2, "little")
        + total_chunks.to_bytes(2, "little")
        + seq.to_bytes(2, "little")
        + len(payload).to_bytes(2, "little")
        + payload
    )
    return body + crc16_modbus(payload).to_bytes(2, "little")


def png_chunk(kind: bytes, data: bytes) -> bytes:
    return (
        struct.pack(">I", len(data))
        + kind
        + data
        + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)
    )


def encode_png_rgb(width: int, height: int, pixels: list[list[Color]]) -> bytes:
    raw = bytearray()
    for row in pixels:
        raw.append(0)
        for red, green, blue in row:
            raw.extend((red, green, blue))
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    return (
        b"\x89PNG\r\n\x1a\n"
        + png_chunk(b"IHDR", ihdr)
        + png_chunk(b"IDAT", zlib.compress(bytes(raw), 9))
        + png_chunk(b"IEND", b"")
    )


def blank_canvas() -> list[list[Color]]:
    return [[(0, 0, 0) for _ in range(WIDTH)] for _ in range(HEIGHT)]


def text_width(text: str) -> int:
    if not text:
        return 0
    return len(text) * 4 - 1


def large_text_width(text: str) -> int:
    if not text:
        return 0
    return len(text) * 6 - 1


def draw_text(
    pixels: list[list[Color]],
    x: int,
    y: int,
    text: str,
    color: Color,
    dim: Color | None = None,
) -> int:
    current_x = x
    for ch in text.upper():
        glyph = FONT_3X5.get(ch, FONT_3X5[" "])
        for gy, row in enumerate(glyph):
            for gx, bit in enumerate(row):
                px = current_x + gx
                py = y + gy
                if 0 <= px < WIDTH and 0 <= py < HEIGHT:
                    if bit == "1":
                        pixels[py][px] = color
                    elif dim is not None and pixels[py][px] == (0, 0, 0):
                        pixels[py][px] = dim
        current_x += 4
    return current_x


def draw_large_text(
    pixels: list[list[Color]],
    x: int,
    y: int,
    text: str,
    color: Color,
    thick: bool = True,
    stretch_y: bool = False,
) -> int:
    current_x = x
    for ch in text.upper():
        glyph = FONT_5X7.get(ch, FONT_5X7[" "])
        for gy, row in enumerate(glyph):
            for gx, bit in enumerate(row):
                if bit != "1":
                    continue
                for ox in ((0, 1) if thick else (0,)):
                    px = current_x + gx + ox
                    py = y + gy + (1 if stretch_y and gy >= 4 else 0)
                    for sy in ((0, 1) if stretch_y and gy == 3 else (0,)):
                        target_y = py + sy
                        if 0 <= px < WIDTH and 0 <= target_y < HEIGHT:
                            pixels[target_y][px] = color
        current_x += 6
    return current_x


def clamp_percent(value: float | int | None) -> int:
    if value is None:
        return 0
    return max(0, min(100, int(round(float(value)))))


def color_for_load(value: int) -> Color:
    if value >= 90:
        return (255, 40, 30)
    if value >= 70:
        return (255, 150, 0)
    return (20, 255, 90)


def color_for_temp(value: int | None) -> Color:
    if value is None:
        return (120, 120, 120)
    if value >= 85:
        return (255, 40, 30)
    if value >= 70:
        return (255, 150, 0)
    return (255, 220, 30)


def format_two_or_three(value: int | None) -> str:
    if value is None:
        return "--"
    value = max(-99, min(199, int(value)))
    if value < 0:
        return f"{value:d}"
    if value > 99:
        return f"{value:03d}"
    return f"{value:02d}"


def format_load(value: int) -> str:
    return f"{max(0, min(99, value)):02d}"


def weather_label(code: int | None) -> str:
    if code is None:
        return "WX "
    if code == 0:
        return "SUN"
    if code in (1, 2, 3):
        return "CLD"
    if code in (45, 48):
        return "FOG"
    if 51 <= code <= 67 or 80 <= code <= 82:
        return "RAN"
    if 71 <= code <= 77 or 85 <= code <= 86:
        return "SNW"
    if code >= 95:
        return "STM"
    return "WX "


def render_status_frame(state: PcState) -> bytes:
    pixels = blank_canvas()

    cpu_color = color_for_load(state.cpu_percent)
    ram_color = (255, 180, 0)

    cpu_text = format_load(state.cpu_percent)
    ram_text = format_load(state.ram_percent)
    time_text = state.now.strftime("%H:%M")

    draw_text(pixels, 0, 1, "C", cpu_color)
    draw_large_text(pixels, 4, 0, cpu_text, cpu_color, thick=False, stretch_y=True)
    draw_text(pixels, 17, 1, "R", ram_color)
    draw_large_text(pixels, 21, 0, ram_text, ram_color, thick=False, stretch_y=True)
    draw_text(pixels, (WIDTH - text_width(time_text)) // 2, 11, time_text, (220, 220, 220))

    return encode_png_rgb(WIDTH, HEIGHT, pixels)


def load_config(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def get_cpu_temp_from_psutil() -> int | None:
    if psutil is None or not hasattr(psutil, "sensors_temperatures"):
        return None
    try:
        temps = psutil.sensors_temperatures(fahrenheit=False)
    except Exception:
        return None
    candidates: list[float] = []
    for entries in temps.values():
        for entry in entries:
            label = (getattr(entry, "label", "") or "").lower()
            current = getattr(entry, "current", None)
            if current is None:
                continue
            if "cpu" in label or "package" in label or "core" in label or not label:
                candidates.append(float(current))
    return sane_temperature(candidates)


def get_cpu_temp_from_wmi() -> int | None:
    command = r"""
$namespaces = @('root\LibreHardwareMonitor', 'root\OpenHardwareMonitor')
foreach ($ns in $namespaces) {
  $sensor = Get-CimInstance -Namespace $ns -ClassName Sensor -ErrorAction SilentlyContinue |
    Where-Object {
      $_.SensorType -eq 'Temperature' -and
      ($_.Name -match 'CPU|Package|Core|Tctl|Tdie' -or $_.Identifier -match 'cpu')
    } |
    Sort-Object Value -Descending |
    Select-Object -First 1
  if ($sensor) {
    [Console]::Out.WriteLine($sensor.Value)
    exit 0
  }
}
$acpi = Get-CimInstance -Namespace root/wmi -ClassName MSAcpi_ThermalZoneTemperature -ErrorAction SilentlyContinue |
  Select-Object -First 1
if ($acpi) {
  [Console]::Out.WriteLine(($acpi.CurrentTemperature / 10) - 273.15)
}
"""
    try:
        result = subprocess.run(
            ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command],
            check=False,
            capture_output=True,
            text=True,
            timeout=6,
        )
    except Exception:
        return None
    values: list[float] = []
    for line in result.stdout.splitlines():
        line = line.strip().replace(",", ".")
        if not line:
            continue
        try:
            values.append(float(line))
        except ValueError:
            continue
    return sane_temperature(values)


def sane_temperature(values: list[float]) -> int | None:
    sane = [value for value in values if 0.0 < value < 120.0]
    if not sane:
        return None
    return int(round(max(sane)))


def collect_pc_state(weather: WeatherState) -> PcState:
    if psutil is None:
        cpu = 0
        ram = 0
    else:
        cpu = clamp_percent(psutil.cpu_percent(interval=0.2))
        ram = clamp_percent(psutil.virtual_memory().percent)

    temp = get_cpu_temp_from_psutil()
    if temp is None:
        temp = get_cpu_temp_from_wmi()

    return PcState(
        cpu_percent=cpu,
        ram_percent=ram,
        cpu_temp_c=temp,
        weather_temp_c=weather.temperature_c,
        weather_code=weather.code,
        now=dt.datetime.now(),
    )


def fetch_weather(config: dict[str, Any]) -> WeatherState:
    if not config.get("enabled", True):
        return WeatherState()

    latitude = config.get("latitude")
    longitude = config.get("longitude")
    if latitude is None or longitude is None:
        return WeatherState(error="weather coordinates are missing")

    params = {
        "latitude": latitude,
        "longitude": longitude,
        "current": "temperature_2m,weather_code",
        "timezone": config.get("timezone", "auto"),
        "forecast_days": 1,
    }
    url = "https://api.open-meteo.com/v1/forecast?" + urllib.parse.urlencode(params)
    try:
        with urllib.request.urlopen(url, timeout=8) as response:
            data = json.loads(response.read().decode("utf-8"))
        current = data.get("current") or {}
        temperature = current.get("temperature_2m")
        code = current.get("weather_code", current.get("weathercode"))
        return WeatherState(
            temperature_c=None if temperature is None else int(round(float(temperature))),
            code=None if code is None else int(code),
            updated_at=time.monotonic(),
        )
    except Exception as exc:
        return WeatherState(error=str(exc), updated_at=time.monotonic())


def frame_file_name(base_name: str, frame_index: int) -> str:
    safe = "".join(ch for ch in base_name.lower() if ch.isalnum()) or "pc"
    prefix = safe[:2]
    # Use a changing name so the panel cannot reuse a cached file/display entry.
    return f"{prefix}{int(time.time()) % 100000:05d}{frame_index % 10}"


class NotificationBus:
    def __init__(self) -> None:
        self._items: list[bytes] = []
        self._event = asyncio.Event()

    def push(self, data: bytearray) -> None:
        self._items.append(bytes(data))
        self._event.set()

    def clear(self) -> None:
        self._items.clear()
        self._event.clear()

    async def wait_for(self, predicate: Callable[[bytes], bool], timeout: float) -> bytes | None:
        deadline = time.monotonic() + timeout
        start = 0
        while time.monotonic() < deadline:
            for item in self._items[start:]:
                if predicate(item):
                    return item
            start = len(self._items)
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                break
            try:
                await asyncio.wait_for(self._event.wait(), timeout=min(remaining, 0.2))
            except asyncio.TimeoutError:
                pass
            self._event.clear()
        return None


class P08FPanel:
    def __init__(self, address: str, chunk_size: int = 180) -> None:
        self.address = address
        self.chunk_size = chunk_size
        self.bus = NotificationBus()
        self.client: BleakClient | None = None

    async def __aenter__(self) -> "P08FPanel":
        self.client = BleakClient(self.address, timeout=20.0)
        await self.client.__aenter__()
        await self.client.start_notify(NOTIFY_UUID, lambda _sender, data: self.bus.push(data))
        await self.handshake()
        return self

    async def __aexit__(self, exc_type: object, exc: object, tb: object) -> None:
        if self.client is not None:
            try:
                await self.client.stop_notify(NOTIFY_UUID)
            finally:
                await self.client.__aexit__(exc_type, exc, tb)

    async def write(self, packet: bytes) -> None:
        if self.client is None:
            raise RuntimeError("Panel is not connected")
        await self.client.write_gatt_char(WRITE_UUID, packet, response=False)

    async def handshake(self) -> None:
        self.bus.clear()
        await self.write(make_a0(0x00, b"CCHIP"))
        challenge_response = await self.bus.wait_for(
            lambda item: len(item) >= 12
            and item[0] == 0xA1
            and item[1] == 0x00
            and item[3:8] == b"CCHIP",
            timeout=3.0,
        )
        if challenge_response is None:
            raise RuntimeError("No CCHIP challenge response from panel")
        challenge = challenge_response[8:10]
        answer = (int.from_bytes(challenge, "little") ^ 0x4C24).to_bytes(2, "little")

        self.bus.clear()
        await self.write(make_a0(0x01, b"CCHIP" + answer))
        auth_response = await self.bus.wait_for(
            lambda item: len(item) >= 11
            and item[0] == 0xA1
            and item[1] == 0x01
            and item[3:8] == b"CCHIP",
            timeout=3.0,
        )
        if auth_response is None or auth_response[8] != 0:
            value = auth_response.hex(" ") if auth_response else "no response"
            raise RuntimeError(f"CCHIP auth failed: {value}")

    async def upload_png_and_show(self, name: str, png: bytes) -> None:
        name_bytes = name.encode("ascii")
        if len(name_bytes) > 20:
            raise ValueError("Panel file name is too long")

        self.bus.clear()
        await self.write(make_a0(0x09, bytes([len(name_bytes)]) + name_bytes))
        await self.bus.wait_for(
            lambda item: len(item) >= 6 and item[0] == 0xA1 and item[1] == 0x09,
            timeout=1.2,
        )

        file_payload = (
            bytes([0x07])
            + (len(name_bytes) + 1 + len(png)).to_bytes(2, "little")
            + b"\x00\x00"
            + bytes([len(name_bytes)])
            + name_bytes
            + png
        )
        total_chunks = math.ceil(len(file_payload) / self.chunk_size)
        transfer_id = random.randint(1, 0xFFFF)

        self.bus.clear()
        for seq in range(1, total_chunks + 1):
            part = file_payload[(seq - 1) * self.chunk_size : seq * self.chunk_size]
            await self.write(make_a2(transfer_id, total_chunks, seq, part))
            await asyncio.sleep(0.04)

        await self.bus.wait_for(
            lambda item: len(item) >= 6
            and ((item[0] == 0xA1 and item[1] == 0x07) or item[0] in (0xA3, 0xA4)),
            timeout=3.0,
        )

        display_payload = (
            bytes([0x01, len(name_bytes)])
            + name_bytes
            + bytes.fromhex("02 01 00 03 02 00 00")
        )
        self.bus.clear()
        await self.write(make_a0(0x0B, display_payload))
        ack = await self.bus.wait_for(
            lambda item: len(item) >= 6 and item[0] == 0xA1 and item[1] == 0x0B,
            timeout=3.0,
        )
        if ack is None or ack[3] != 1:
            value = ack.hex(" ") if ack else "no response"
            raise RuntimeError(f"Display command failed: {value}")


async def run(args: argparse.Namespace) -> None:
    config = load_config(args.config)
    address = args.address or config.get("address")
    if not address:
        raise RuntimeError("Panel BLE address is missing")

    interval = args.interval or int(config.get("interval_seconds", 60))
    file_name = args.file_name or config.get("file_name", "pcstat")
    weather_config = config.get("weather") or {}
    weather = fetch_weather(weather_config)
    weather_refresh = int(weather_config.get("refresh_seconds", 900))

    if psutil is not None:
        psutil.cpu_percent(interval=None)

    if args.render_only:
        state = collect_pc_state(weather)
        png = render_status_frame(state)
        output = args.save_png or Path(__file__).resolve().parent / "last_frame.png"
        output.write_bytes(png)
        print(
            f"rendered {output} "
            f"cpu={state.cpu_percent}% ram={state.ram_percent}% "
            f"temp={state.cpu_temp_c if state.cpu_temp_c is not None else '--'}C "
            f"weather={state.weather_temp_c if state.weather_temp_c is not None else '--'}C"
        )
        return

    async with P08FPanel(address=address, chunk_size=args.chunk_size) as panel:
        frame_index = 0
        next_frame_at = time.monotonic()
        while True:
            if weather_config.get("enabled", True) and (
                time.monotonic() - weather.updated_at > weather_refresh
            ):
                weather = fetch_weather(weather_config)

            state = collect_pc_state(weather)
            png = render_status_frame(state)
            if args.save_png:
                args.save_png.write_bytes(png)
            current_file_name = file_name if args.once and args.file_name else frame_file_name(file_name, frame_index)
            await panel.upload_png_and_show(current_file_name, png)

            print(
                f"sent {state.now:%H:%M:%S} "
                f"name={current_file_name} "
                f"cpu={state.cpu_percent}% ram={state.ram_percent}% "
                f"temp={state.cpu_temp_c if state.cpu_temp_c is not None else '--'}C",
                flush=True,
            )
            if args.once:
                return
            frame_index += 1
            if args.count is not None and frame_index >= args.count:
                return
            next_frame_at += max(1, interval)
            await asyncio.sleep(max(0.0, next_frame_at - time.monotonic()))


def parse_args() -> argparse.Namespace:
    root = Path(__file__).resolve().parent
    parser = argparse.ArgumentParser(description="Send PC status to P08F BLE LED panel.")
    parser.add_argument("--config", type=Path, default=root / "config.json")
    parser.add_argument("--address", default=None)
    parser.add_argument("--interval", type=int, default=None)
    parser.add_argument("--file-name", default=None)
    parser.add_argument("--chunk-size", type=int, default=180)
    parser.add_argument("--once", action="store_true")
    parser.add_argument("--count", type=int, default=None)
    parser.add_argument("--render-only", action="store_true")
    parser.add_argument("--save-png", type=Path, default=None)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        asyncio.run(run(args))
    except KeyboardInterrupt:
        return 130
    except Exception as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
