from PyQt5.QtCore import (
    QThread,
)

from .client import StreamClient
from .nn import detect_objects

import threading

class ObjectDetecterThread(QThread):
    def __init__(self, stream: StreamClient, skip_frames=0):
        QThread.__init__(self)
        self.stream = stream
        self.frame = None
        self.results = []
        self.max_frames = skip_frames
        self._count_frames_to_skip = skip_frames
        self._need_detection = True
        self._lock = threading.Lock()
        self._running = True

    @property
    def _count_frames(self):
        if self._count_frames_to_skip > self.max_frames:
            self._count_frames_to_skip = 0
        return self._count_frames_to_skip

    def disable_detection(self):
        self._need_detection = False
        self.results = []

    def enable_detection(self):
        self._need_detection = True
        self._count_frames_to_skip = self.max_frames

    def run(self):
        while self._running:
            with self._lock:
                if self.stream.is_opened():
                    self.__next_frame()

    def __next_frame(self):
        exist, frame = self.stream.next_frame()
        if exist:
            self.frame = frame
            if self._count_frames == self.max_frames:
                if self._need_detection:
                    self.results = detect_objects(frame)
                else:
                    self.results = []
            self._count_frames_to_skip += 1


    def quit(self) -> None:
        with self._lock:
            self._running = False
            self.stream.release()
            self.terminate()
            return super().quit()
