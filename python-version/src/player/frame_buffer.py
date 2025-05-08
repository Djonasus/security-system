import os
import cv2
import numpy as np

from collections import deque

class FrameBuffer():
    def __init__(self, duration_before, duration_after, fps, resolution):
        self._duration_before = duration_before
        self._duration_after = duration_after
        self._capture_fps = int(fps)
        self._resolution = resolution
        self.buffer_length = self._duration_before * self._capture_fps
        self.alarm_buffer_length = self._duration_after * self._capture_fps
        self.frame_buffer: deque = deque(maxlen=self.buffer_length)
        self.alarm_frame_buffer: deque = deque(maxlen=self.alarm_buffer_length)

    def update_buffer_size(self, seconds: int):
        self.buffer_length = seconds * self._capture_fps
        self.frame_buffer = deque(maxlen=self.buffer_length)

    def update_alarm_buffer_size(self, seconds: int):
        self.alarm_buffer_length = seconds * self._capture_fps
        self.alarm_frame_buffer = deque(maxlen=self.alarm_buffer_length)

    def add_frame(self, frame: np.ndarray) -> None:
        self.frame_buffer.append(frame)
            
    def add_alarm_frame(self, frame: np.ndarray) -> None:
        self.alarm_frame_buffer.append(frame)
        
    def _refresh_buffer(self) -> None:
        self.frame_buffer = deque(maxlen=self.buffer_length)
        self.alarm_frame_buffer = deque(maxlen=self.alarm_buffer_length)
            
    def write_to_file(self, filepath: str) -> None:
        frames = deque()
        frames.extend(self.frame_buffer)
        frames.extend(self.alarm_frame_buffer)
        fourcc = cv2.VideoWriter_fourcc(*'MP4V')
        dirs = os.path.dirname(filepath)
        os.makedirs(dirs, exist_ok=True)
        writer = cv2.VideoWriter(filepath, fourcc, self._capture_fps, self._resolution)   
        for frame in frames:
            writer.write(frame)
            
        self._refresh_buffer()
