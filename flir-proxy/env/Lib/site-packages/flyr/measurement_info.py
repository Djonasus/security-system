from enum import Enum
from io import BytesIO
from typing import BinaryIO, List, Optional, Tuple


class Tool(Enum):
    NONE = 0
    SPOT = 1
    AREA = 2
    ELLIPSE = 3
    LINE = 4
    ENDPOINT = 5
    ALARM = 6
    UNUSED = 7
    DIFFERENCE = 8


# TODO Use specific Params types instead of list[int]
# SpotParams = tuple[int, int]
# AreaParams = tuple[int, int, int, int]
# EllipseParams = tuple[int, int, int, int, int, int]
# LineParams = tuple[int, int, int, int]
# Params = SpotParams | AreaParams | EllipseParams | LineParams | None


class Measurement:
    tool: Tool
    params: List[int]
    label: str

    def __init__(self, tool: Tool, params: List[int], label: str):
        self.tool = tool
        self.params = params
        self.label = label


def parse_measurements(
    stream: BinaryIO, metadata: Tuple[int, int, int, int]
) -> List[Measurement]:
    (_, _, offset, length) = metadata
    stream.seek(offset)
    measurements_bytes = stream.read(length)
    stream = BytesIO(measurements_bytes)
    stream.seek(12, 1)  # ignore first bytes

    measurements = []
    measurement_length = int.from_bytes(stream.read(1), "big") - 1
    while measurement_length > 0:
        measurement_bytes = BytesIO(stream.read(measurement_length))
        measurement = parse_measurement(measurement_bytes)
        if measurement:
            measurements.append(measurement)

        measurement_length = int.from_bytes(stream.read(1), "big") - 1
    return measurements


def parse_measurement(stream: BinaryIO) -> Optional[Measurement]:
    stream.seek(3, 1)
    num_bytes_params = int.from_bytes(stream.read(1), "big")
    num_bytes_label = int.from_bytes(stream.read(2), "big")

    stream.seek(3, 1)
    tool = int.from_bytes(stream.read(1), "big")
    # measurement_no = int.from_bytes(stream.read(2), "big")

    stream.seek(24, 1)
    params: List[int] = []
    while len(params) * 2 < num_bytes_params:
        param = int.from_bytes(stream.read(2), "big")
        params.append(param)

    label = stream.read(num_bytes_label).decode("utf-16be").rstrip("\x00")

    values = [v.value for v in Tool]
    return Measurement(Tool(tool), params, label) if tool in values else None
