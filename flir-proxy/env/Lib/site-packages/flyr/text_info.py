from io import BytesIO
from typing import BinaryIO, Tuple


class TextInfo:
    def __init__(self):
        pass


def parse_text_info(stream: BinaryIO, metadata: Tuple[int, int, int, int]) -> TextInfo:
    (_, _, offset, length) = metadata
    stream.seek(offset)
    text_bytes = stream.read(length)
    text_stream = BytesIO(text_bytes)
    print(text_stream.getvalue().hex())

    return TextInfo()
