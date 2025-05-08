import os
import cv2

from ..opt import Options

from typing import Tuple, List
from abc import abstractmethod
import numpy as np

class StreamClient():
    def __init__(self):
        self.capture: cv2.VideoCapture = cv2.VideoCapture()

    @abstractmethod
    def get_capture(self) -> None: ...

    @abstractmethod
    def next_frame(self) -> Tuple[bool, np.ndarray]: ...

    @abstractmethod
    def stream_info(self) -> List[str]: ...

    def resolution(self) -> Tuple[int, int]:
        width = int(self.capture.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(self.capture.get(cv2.CAP_PROP_FRAME_HEIGHT))
        return (width, height)

    @property
    def fps(self) -> float:
        return self.capture.get(cv2.CAP_PROP_FPS)

    def is_opened(self):
        return self.capture.isOpened()

    def timestamp(self):
        return self.capture.get(cv2.CAP_PROP_POS_MSEC)

    def release(self):
        self.capture.release()

    def __exit__(self, ext_type, exc_value, traceback):
        self.capture.release()

class RTSPClient(StreamClient):
    def __init__(self, device_ip: str, stream_name: str):
        super().__init__()
        self.capture.set(cv2.CAP_PROP_BUFFERSIZE, 2)
        self.device_ip: str = device_ip
        self.stream_name: str  = stream_name

    def get_capture(self) -> None:
        self.stream_url: str = f"rtsp://{Options.cam_login}:{Options.cam_password}@{self.device_ip}:{Options.rtsp_port}/{self.stream_name}"
        os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = '|'.join(Options.ffmpeg_opt)

        self.capture = cv2.VideoCapture(self.stream_url, cv2.CAP_FFMPEG)

    def next_frame(self) -> Tuple[bool, np.ndarray]:
        exist, frame = self.capture.read()
        return exist, frame

    def stream_info(self) -> List[str]:
        return [self.device_ip, self.stream_name]

class FileStreamClient(StreamClient):
    def __init__(self, path: str):
        super().__init__()
        self.capture.set(cv2.CAP_PROP_BUFFERSIZE, 2)
        self.path: str = path

    def get_capture(self) -> None:
        self.capture = cv2.VideoCapture(self.path)
    
    def next_frame(self) -> Tuple[bool, np.ndarray]:
        exist, frame = self.capture.read()
        return exist, frame

    def stream_info(self) -> List[str]:
        return [self.path]
