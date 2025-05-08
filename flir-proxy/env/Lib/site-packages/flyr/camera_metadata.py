from typing import Optional, Dict, Any, Union, BinaryIO
import re
import datetime as dt

import PIL.Image as pili
import PIL.ExifTags as pilx


_search_pattern = re.compile("(.)([A-Z][a-z]+)")
_replace_pattern = re.compile("([a-z0-9])([A-Z])")


def _camel_to_snake(name):
    name = re.sub(_search_pattern, r"\1_\2", name)
    return re.sub(_replace_pattern, r"\1_\2", name).lower()


def _convert_to_degrees(value):
    d = value[0]
    m = value[1]
    s = value[2]
    return d + (m / 60.0) + (s / 3600.0)


class CameraMetadata:
    """An object to access EXIF values in the photograph (not the thermogram).
    These are mostly the same, but can differ when it comes to image width
    and height.
    """

    __exif: pili.Exif

    def __init__(self, src: Union[str, BinaryIO]):
        """Instantiate an obejct to access exif values in a human readable way.

        Parameters
        ----------
        src: str
            The path to the FLIR image to read.
        """
        with pili.open(src) as img:
            self.__exif = img.getexif()

    def __getitem__(self, key: str) -> Optional[Any]:
        data = self.data
        data.update(self.gps_data)
        return data.get(key)

    @property
    def data(self) -> Dict[str, Any]:
        """Raw EXIF data embedded in this image."""
        return {
            _camel_to_snake(pilx.TAGS.get(k, str(k))): v for k, v in self.__exif.items()
        }

    @property
    def gps_data(self) -> Dict[str, Any]:
        """Raw GPS data embedded in this image."""
        return {
            _camel_to_snake(pilx.GPSTAGS.get(k, str(k))): v
            for k, v in self.__exif.get_ifd(34853).items()
        }

    @property
    def make(self) -> Optional[str]:
        val: Optional[str] = self.__exif.get(271)
        return val.strip().strip("\x00") if isinstance(val, str) else None

    @property
    def model(self) -> Optional[str]:
        val: Optional[str] = self.__exif.get(272)
        return val.strip().strip("\x00") if isinstance(val, str) else None

    @property
    def x_resolution(self) -> Optional[float]:
        val: Optional[float] = self.__exif.get(282)
        return round(float(val), 4) if val is not None else None

    @property
    def y_resolution(self) -> Optional[float]:
        val: Optional[float] = self.__exif.get(283)
        return round(float(val), 4) if val is not None else None

    @property
    def software(self) -> Optional[str]:
        val: Optional[str] = self.__exif.get(305)
        return val.strip().strip("\x00") if isinstance(val, str) else None

    @property
    def date_time(self) -> Optional[dt.datetime]:
        parse = lambda v: dt.datetime.strptime(v, "%Y:%m:%d %H:%M:%S")
        val = self.__exif.get(306)
        ret = None
        try:
            ret = parse(val)
        except:
            pass
        return None if val is None else ret

    @property
    def gps_latitude(self) -> Optional[float]:
        ref = self.__exif.get_ifd(34853).get(1)
        val = self.__exif.get_ifd(34853).get(2)
        if val is None or ref is None:
            return None

        mult = -1 if ref != "N" else 1
        val = _convert_to_degrees(val) * mult
        return val

    @property
    def gps_longitude(self) -> Optional[float]:
        ref = self.__exif.get_ifd(34853).get(3)
        val = self.__exif.get_ifd(34853).get(4)
        if val is None or ref is None:
            return None

        mult = -1 if ref != "E" else 1
        val = _convert_to_degrees(val) * mult
        return val

    @property
    def gps_altitude(self) -> Optional[float]:
        val = self.__exif.get_ifd(34853).get(6)
        return None if val is None else round(float(val), 4)

    @property
    def gps_image_direction(self) -> Optional[float]:
        val = self.__exif.get_ifd(34853).get(17)
        return None if val is None else round(float(val), 4)

    @property
    def gps_map_datum(self) -> Optional[str]:
        val = self.__exif.get_ifd(34853).get(18)
        return None if not isinstance(val, str) else val.strip().strip("\x00")

    @property
    def focal_length(self) -> Optional[float]:
        val: Optional[float] = self.__exif.get(37386)
        return round(val, 4) if isinstance(val, float) else None


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("-f", "--file", required=True)
    args = parser.parse_args()

    cm = CameraMetadata(args.file)
    print(cm.data)
    print(cm.gps_data)
    print(cm.date_time)
    print(cm.gps_altitude)
    print(cm.gps_image_direction)
    print(cm.gps_latitude)
    print(cm.gps_longitude)
    print(cm.gps_map_datum)
    print(cm.make)
    print(cm.model)
    print(cm.software)
    print(cm.x_resolution)
    print(cm.y_resolution)
