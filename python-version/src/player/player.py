from PyQt5.QtWidgets import (
    QMainWindow, QWidget,
    QHBoxLayout, QVBoxLayout,
    QLabel, QLineEdit, QPushButton, QSlider, QButtonGroup, QCheckBox,
    QSizePolicy, 
)

from PyQt5.QtGui import (
    QPixmap, QImage,
    QPainter, QPen, QColor, QFont
)

from PyQt5.QtCore import (
    pyqtSignal, QTimer,
    QThread,
    QPoint,
    QEventLoop,
)

import cv2

from PyQt5.QtCore import Qt

from threading import Thread
from datetime import datetime

from .client import StreamClient, RTSPClient, FileStreamClient
from .detecter_thread import ObjectDetecterThread
from .nn import allowed_labels
from .frame_buffer import FrameBuffer
from ..opt import Options
from ..qt_widget_utils import QVLine

from .alarm_controller import AlarmController

import numpy as np
from typing import Optional
from os import path

from .alarm import (
    alarm_relay1_on,
    alarm_relay1_off,
    alarm_relay2_on,
    alarm_relay2_off,
)

class Player(QWidget):
    def __init__(self, device_ip, parent=None):
        super().__init__(parent)
        self.device_ip = device_ip

        self._update_image_timer = QTimer()
        self._update_image_timer.timeout.connect(self.update_player)

        self._optical_stream: StreamClient = RTSPClient(self.device_ip, Options.optical_stream_name)
        self._optical_detecter_thread = ObjectDetecterThread(self._optical_stream, skip_frames=10)
        self._optical_detecter_thread.finished.connect(
            lambda: self.on_finished_thread(self._optical_stream))

        self._thermal_stream: StreamClient = RTSPClient(self.device_ip, Options.thermal_stream_name)
        self._thermal_detecter_thread = ObjectDetecterThread(self._thermal_stream, skip_frames=10)
        self._thermal_detecter_thread.finished.connect(
            lambda: self.on_finished_thread(self._thermal_stream))

        self.stream_info_label = QLabel(self.device_ip)
        self.stream_info_label.setMargin(0)
        self.optical_player = QLabel()
        self.optical_player.setSizePolicy(QSizePolicy.Policy.Ignored, QSizePolicy.Policy.Ignored)
        self.thermal_player = QLabel()
        self.thermal_player.setSizePolicy(QSizePolicy.Policy.Ignored, QSizePolicy.Policy.Ignored)

        ### TODO: Refactor
        self.sensivity = 0.5
        self.intruder_bounds_color = QColor.fromRgb(255, 0, 0)
        self.font_size = 14
        self.intruder_labels = set()
        self.need_optical_update = False
        self.need_thermal_update = False
        self.is_alarm_mode = False
        self.need_record = False
        self.max_frames = 25
        self.intruder_detected = False
        ###

        self._optical_detecter_thread._need_detection = self.need_optical_update
        self._thermal_detecter_thread._need_detection = self.need_thermal_update

        self.optical_buffer: Optional[FrameBuffer] = None
        self.thermal_buffer: Optional[FrameBuffer] = None

        self.init_layout()

    def init_layout(self) -> None:
        self.main_layout = QVBoxLayout(self)

        self.player_layout = QHBoxLayout(self)
        self.player_layout.addWidget(self.optical_player)
        self.player_layout.addWidget(self.thermal_player)

        # self.main_layout.addWidget(QLabel(self._optical_stream.stream_info()[0]), 0)
        self.main_layout.addLayout(self.player_layout, 1)

    def add_intruder(self, intruder):
        self.intruder_labels.add(intruder)

    def remove_intruder(self, intruder):
        if intruder in self.intruder_labels:
            self.intruder_labels.remove(intruder)

    def optical_detection_off(self): 
        self.need_optical_update = False
        self._optical_detecter_thread.disable_detection()

    def optical_detection_on(self):
        self.need_optical_update = True
        self._optical_detecter_thread.enable_detection()

    def thermal_detection_off(self):
        self.need_thermal_update = False
        self._thermal_detecter_thread.disable_detection()

    def thermal_detection_on(self):
        self.need_thermal_update = True
        self._thermal_detecter_thread.enable_detection()

    def has_capture(self):
        return self._optical_stream.is_opened() and self._thermal_stream.is_opened()
        
    def get_capture(self):
        self._optical_stream.get_capture()
        if self._optical_stream.is_opened():
            self._optical_detecter_thread.start()
            self.optical_buffer = FrameBuffer(5, 15, self._optical_stream.fps, self._optical_stream.resolution())
            self._update_image_timer.start(int(1000//self._optical_stream.fps))

        self._thermal_stream.get_capture()
        if self._thermal_stream.is_opened():
            self._thermal_detecter_thread.start()
            self.thermal_buffer = FrameBuffer(5, 15, self._thermal_stream.fps, self._thermal_stream.resolution())
            self._update_image_timer.start(int(1000//self._thermal_stream.fps))

    def _draw_boxes(self, image, results, sensivity=0.5, color=(0, 255, 0), scale=(1, 1), border=(0, 0)):
        painter = QPainter(image)
        line_thickness = 2
        simple_pen = QPen(QColor.fromRgb(*color), line_thickness)
        intruder_pen = QPen(self.intruder_bounds_color, line_thickness)

        painter.setFont(QFont("Arial", self.font_size))
        for (x, y, w, h), label, score in results:
            painter.setPen(simple_pen)
            x, w = int(x*scale[0]+border[0]), int(w*scale[0]-border[0])
            y, h = int(y*scale[1]+border[1]), int(h*scale[1]-border[1])
            if score > sensivity:
                if self.is_intruder(label):
                    painter.setPen(intruder_pen)
                painter.drawRect(x, y, w, h)
                painter.drawEllipse(QPoint(x+w//2, y+h//2), 2, 2)
                confidence = int(round(score, 2)*100)
                painter.drawText(x+5, y-5, f"{label} {confidence}%")
        painter.end()

    def _resize_image(self, image, width, height):
        h, w, _ = image.shape
        if h > height:
            ratio = height/h
            image = cv2.resize(image,(int(image.shape[1]*ratio),int(image.shape[0]*ratio)))
        h, w, _ = image.shape
        if w > width:
            ratio = width/w
            image = cv2.resize(image,(int(image.shape[1]*ratio),int(image.shape[0]*ratio)))
        h, w, _ = image.shape
        if h < height and w < width:
            hless = height/h
            wless = width/w
            if(hless < wless):
                image = cv2.resize(image, (int(image.shape[1] * hless), int(image.shape[0] * hless)))
            else:
                image = cv2.resize(image, (int(image.shape[1] * wless), int(image.shape[0] * wless)))
        h, w, _ = image.shape
        v_border = 0
        if h < height:
            v_border = height - h
            v_border /= 2
            image = cv2.copyMakeBorder(image, int(v_border), int(v_border), 0, 0, cv2.BORDER_CONSTANT)
        h_border = 0
        if w < width:
            h_border = width - w
            h_border /= 2
            image = cv2.copyMakeBorder(image, 0, 0, int(h_border), int(h_border), cv2.BORDER_CONSTANT)
        image = cv2.resize(image, (width, height), interpolation=cv2.INTER_AREA)
        return image, h_border, v_border

    def _get_scaled_pixmap(self, frame, player):
        height, width, _ = frame.shape
        p_width = player.width() if player.width() > 0 else width
        p_height = player.height() if player.height() > 0 else height
        
        frame, h_border, v_border = self._resize_image(frame, p_width, p_height)
        h, w, _ = frame.shape
        bytes_per_line = w * 3

        qimage = QImage(frame.data, w, h, bytes_per_line, QImage.Format_BGR888)
        pixmap = QPixmap(qimage).scaled(player.frameGeometry().size())
    
        scale_x = w/width
        scale_y = h/height

        return pixmap, scale_x, scale_y, h_border, v_border

    def _update_border_by_intruders(self, player, have_intruder):
        if have_intruder:
            player.setStyleSheet('border: 7px solid red;')
        else:
            player.setStyleSheet('border: 7px transparent;')

    def _update_optical_frame_buffer(self, frame: np.ndarray):
        if frame is not None:
            if self.optical_buffer is not None:
                if self.intruder_detected:
                    self.optical_buffer.add_alarm_frame(frame)
                else:
                    self.optical_buffer.add_frame(frame)

    def _update_thermal_frame_buffer(self, frame: np.ndarray):
        if frame is not None:
            if self.thermal_buffer is not None:
                if self.intruder_detected:
                    self.thermal_buffer.add_alarm_frame(frame)
                else:
                    self.thermal_buffer.add_frame(frame)

    def _update_player(self, player, frame, results):
        self._update_image(frame, results, player)
        self._update_border_by_intruders(player, self._have_intruder(results))

    def _update_borders(self, optical_results, thermal_results):    
        self._update_border_by_intruders(self.optical_player, False)
        self._update_border_by_intruders(self.thermal_player, False)
        have_intruder_optical = self._have_intruder(optical_results)
        have_intruder_thermal = self._have_intruder(thermal_results)
        if self.need_optical_update and have_intruder_optical and self.need_thermal_update and have_intruder_thermal:
            self._update_border_by_intruders(self.optical_player, True)
            self._update_border_by_intruders(self.thermal_player, True)
        elif self.need_optical_update and have_intruder_optical and not self.need_thermal_update:
            self._update_border_by_intruders(self.optical_player, True)
        elif self.need_thermal_update and have_intruder_thermal and not self.need_optical_update:
            self._update_border_by_intruders(self.thermal_player, True)

    def _update_image(self, frame, results, player: QLabel) -> None: 
        if frame is not None and results is not None:
            pixmap, scale_x, scale_y, h_border, v_border = self._get_scaled_pixmap(frame, player)
            
            self._draw_boxes(pixmap, results, sensivity=self.sensivity, scale=(scale_x, scale_y), border=(h_border, v_border))
            player.setPixmap(pixmap)

            self._update_border_by_intruders(player, self._have_intruder(results))

    def update_player(self) -> None:
        optical_frame = self._optical_detecter_thread.frame
        optical_results = self._optical_detecter_thread.results
        thermal_frame = self._thermal_detecter_thread.frame
        thermal_results = self._thermal_detecter_thread.results

        self._update_image(optical_frame, optical_results, self.optical_player)
        self._update_image(thermal_frame, thermal_results, self.thermal_player)
        self._update_borders(optical_results, thermal_results)

        self._update_optical_frame_buffer(optical_frame)
        self._update_thermal_frame_buffer(thermal_frame)

        self._update_alarm(optical_results, thermal_results)

    def _need_alarm(self, optical_results, thermal_results):
        if self.is_alarm_mode:
            have_intruder_optical = self._have_intruder(optical_results)
            have_intruder_thermal = self._have_intruder(thermal_results)
            if self.need_optical_update and have_intruder_optical and self.need_thermal_update and have_intruder_thermal:
                return True
            elif self.need_optical_update and have_intruder_optical and not self.need_thermal_update:
                return True
            elif self.need_thermal_update and have_intruder_thermal and not self.need_optical_update:
                return True
        return False

    def _update_alarm(self, optical_results, thermal_results):
        if self._need_alarm(optical_results, thermal_results):
            self.intruder_detected = True
            self._ready_to_save = True
            AlarmController.start_alarm()
        else:
            if self.intruder_detected:
                self.intruder_detected = False
                if self._ready_to_save and self.need_record:
                    self.save_buffer_to_file()
                    self._ready_to_save = False

    def save_buffer_to_file(self):
        if self.optical_buffer is not None:
            now = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
            filepath = path.join(Options.video_save_path, f"{now}_optical.mp4")
            save_to_file_thread = Thread(target=self.optical_buffer.write_to_file, args=(filepath,))
            save_to_file_thread.start()

        if self.thermal_buffer is not None:
            now = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
            filepath = path.join(Options.video_save_path, f"{now}_thermal.mp4")
            save_to_file_thread = Thread(target=self.thermal_buffer.write_to_file, args=(filepath,))
            save_to_file_thread.start()

    def is_intruder(self, label):
        return label in self.intruder_labels

    def _have_intruder(self, results):
        if results is not None:
            return any(score > self.sensivity and self.is_intruder(label) for _, label, score in results)
        return False

    def on_finished_thread(self, stream: StreamClient) -> None:
        stream.release()
