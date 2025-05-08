from PyQt5.QtWidgets import (
    QMainWindow, QWidget,
    QTabWidget,
    QHBoxLayout, QVBoxLayout, QGridLayout,
    QLabel, QLineEdit, QPushButton, QSlider, QButtonGroup, QCheckBox,
    QSizePolicy, QSpacerItem,
)

from PyQt5.QtGui import (
    QPixmap, QImage,
    QPainter, QPen, QColor, QFont
)

from PyQt5.QtCore import (
    pyqtSignal, QTimer,
    QPoint,
)

from PyQt5.QtCore import Qt

from .qt_widget_utils import *
from .player.alarm import (
    alarm_relay1_on,
    alarm_relay1_off,
    alarm_relay2_on,
    alarm_relay2_off
)
from .player.nn import allowed_labels

from .player.player import Player

from .player.alarm_controller import AlarmController

class ControlPanel(QWidget):
    def __init__(self, player: Player, parent=None):
        super().__init__(parent)

        self.player = player


        self.sensivity_slider = QSlider(Qt.Orientation.Horizontal)
        self.sensivity_slider.setRange(0, 100)
        self.sensivity_slider.setValue(50)
        self.sensivity_slider.valueChanged.connect(self._on_sensivity_slider_value_change)
        self.sensivity_slider.setTickPosition(QSlider.TicksBelow)
        self.sensivity_slider.setTickInterval(5)
        self.sensivity_slider.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Minimum)

        self.processing_rate_slider = QSlider(Qt.Orientation.Horizontal)
        self.processing_rate_slider.setRange(15, 45)
        self.processing_rate_slider.setValue(25)
        self.processing_rate_slider.valueChanged.connect(self._on_processing_slider_value_change)
        self.processing_rate_slider.setTickPosition(QSlider.TicksBelow)
        self.processing_rate_slider.setTickInterval(1)
        self.processing_rate_slider.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Minimum)

        self.alarm_mode_button = QPushButton('Режим охраны')
        self.alarm_mode_button.setCheckable(True)
        self.alarm_mode_button.clicked.connect(self.toggle_alarm_mode)

        self.sound_alarm_off_button = QPushButton('Выключить сирену')
        self.sound_alarm_off_button.clicked.connect(AlarmController.disable_alarm)

        self.record_before_alarm_duration_sec: int = 5
        self.record_after_alarm_duration_sec: int = 15
        self.need_record_button = QCheckBox("Делать запись нарушителя")
        self.need_record_button.clicked.connect(self.update_need_record)
        self.record_before_alarm_duration_textbox = QLineEdit(str(self.record_before_alarm_duration_sec))
        self.record_before_alarm_duration_textbox.editingFinished.connect(self.on_before_alarm_duration_textbox_edit)
        self.record_after_alarm_duration_textbox = QLineEdit(str(self.record_after_alarm_duration_sec))
        self.record_after_alarm_duration_textbox.editingFinished.connect(self.on_after_alarm_duration_textbox_edit)

        self.need_optical_update_button = QCheckBox("Обнаружение по оптическому")
        self.need_optical_update_button.setChecked(True)
        self.need_optical_update_button.clicked.connect(self.update_optical_detect_need)

        self.need_thermal_update_button = QCheckBox("Обнаружение по тепловизионному")
        self.need_thermal_update_button.setChecked(True)
        self.need_thermal_update_button.clicked.connect(self.update_thermal_detect_need)

        self._update_confidence_timer = QTimer()
        self._update_confidence_timer.timeout.connect(self._update_confidence_label)

        self.init_layout()

    def init_layout(self):
        self.setStyleSheet('''
            QPushButton[checkable="true"]::checked {
                background: solid red;
            }
        ''')

        self.control_layout = QVBoxLayout()
        self._init_capture_control_layout()
        self.control_layout.addWidget(QHLine(), 0)
        self._init_alarm_layout()
        self.control_layout.addWidget(QHLine(), 0)
        self._init_intruders_layout()
        self.control_layout.addWidget(QHLine(), 0)
        self._init_video_save_layout()
        self.control_layout.addWidget(QHLine(), 0)
        self._init_confidence_display_layout()
        self.control_layout.addWidget(QLabel(), 1)

        self.setLayout(self.control_layout)

    def _init_capture_control_layout(self):
        self.control_layout.addWidget(QLabel('Чувствительность'), 0)
        self.control_layout.addWidget(self.sensivity_slider, 0)
        self.control_layout.addWidget(QLabel('Скорость обработки'), 0)
        self.control_layout.addWidget(self.processing_rate_slider, 0)

    def _init_alarm_layout(self):
        self.control_layout.addWidget(QLabel('Охрана'), 0)
        self.control_layout.addWidget(self.alarm_mode_button, 0)
        self.control_layout.addWidget(self.sound_alarm_off_button, 0)

    def _init_intruders_layout(self):
        self.control_layout.addWidget(QLabel('Обнаружение нарушителей'), 0)
        self.intruders_group = QButtonGroup()
        self.intruders_group.setExclusive(False)
        for title in allowed_labels:
            button = QPushButton(title)
            button.setCheckable(True)
            self.control_layout.addWidget(button)
            self.intruders_group.addButton(button)

        self.intruders_group.buttonClicked.connect(self.intruder_choose_button_clicked)

        self.control_layout.addWidget(self.need_optical_update_button)
        self.control_layout.addWidget(self.need_thermal_update_button)

    def intruder_choose_button_clicked(self, button):
        label = button.text()
        if self.player is not None:
            if button.isChecked():
                self.player.add_intruder(label)
            else:
                self.player.remove_intruder(label)
        

    def _init_video_save_layout(self):
        self.control_layout.addWidget(QLabel('Запись тревожного события'), 0)
        self.control_layout.addWidget(self.need_record_button, 0)

        duration_before_control_layout = QHBoxLayout()
        duration_before_control_layout.addWidget(QLabel("Длительность до тревоги (сек)"))
        duration_before_control_layout.addWidget(self.record_before_alarm_duration_textbox)
        self.control_layout.addLayout(duration_before_control_layout, 0)

        duration_after_control_layout = QHBoxLayout()
        duration_after_control_layout.addWidget(QLabel("Длительность после тревоги (сек)"))
        duration_after_control_layout.addWidget(self.record_after_alarm_duration_textbox)
        self.control_layout.addLayout(duration_after_control_layout, 0)

    def _init_confidence_display_layout(self):
        self.confidence_label = QLabel('0%')

        confidence_layout = QHBoxLayout()
        confidence_layout.addWidget(QLabel('Вероятность обнаружения:'), 0)
        confidence_layout.addWidget(self.confidence_label, 1)

        self.control_layout.addLayout(confidence_layout, 0)

    def _on_sensivity_slider_value_change(self):
        value = self.sensivity_slider.value()
        self.player.sensivity = value / 100

    def _on_processing_slider_value_change(self):
        max_rate = self.processing_rate_slider.maximum()
        cur_rate = self.processing_rate_slider.value()
        processing_rate = max_rate - cur_rate
        self.player._optical_detecter_thread.max_frames = processing_rate
        self.player._thermal_detecter_thread.max_frames = processing_rate

    def toggle_alarm_mode(self):
        if self.alarm_mode_button.isChecked():
            AlarmController.alarm_mode_on()
            self.alarm_mode_button.setStyleSheet('background-color: green')
            if self.player is not None:
                self.player.is_alarm_mode = True
        else:
            AlarmController.alarm_mode_off()
            self.alarm_mode_button.setStyleSheet('background-color: none')
            if self.player is not None:
                self.player.is_alarm_mode = False

    def on_before_alarm_duration_textbox_edit(self):
        text = self.record_before_alarm_duration_textbox.text()
        min_record_duration = 0
        max_record_duration = 300
        if text.isdigit():
            duration_sec = int(text)
            if min_record_duration < duration_sec <= max_record_duration:
                self.record_before_alarm_duration_sec = duration_sec
                self.player.optical_buffer.update_buffer_size(self.record_before_alarm_duration_sec)
        else:
            self.record_before_alarm_duration_textbox.setText(str(self.record_before_alarm_duration_sec))

    def on_after_alarm_duration_textbox_edit(self):
        text = self.record_after_alarm_duration_textbox.text()
        min_record_duration = 0
        max_record_duration = 300
        if text.isdigit():
            duration_sec = int(text)
            if min_record_duration < duration_sec <= max_record_duration:
                self.record_after_alarm_duration_sec = duration_sec
                self.player.optical_buffer.update_alarm_buffer_size(self.record_after_alarm_duration_sec)
        else:
            self.record_after_alarm_duration_textbox.setText(str(self.record_after_alarm_duration_sec))

    def update_optical_detect_need(self):
        if self.need_optical_update_button.isChecked():
            self.player.optical_detection_on()
        else:
            self.player.optical_detection_off()

    def update_thermal_detect_need(self):
        if self.need_thermal_update_button.isChecked():
            self.player.thermal_detection_on()
        else:
            self.player.thermal_detection_off()

    def update_need_record(self):
        if self.need_record_button.isChecked():
            self.player.need_record = True
        else:
            self.player.need_record = False

    def change_player(self, player):
        if self.player != player:
            self.player = player
            self._update_confidence_timer.start(int(1000//self.player._optical_stream.fps))
            self.sensivity_slider.setValue(int(player.sensivity * 100))
            self.processing_rate_slider.setValue(player._optical_detecter_thread.max_frames)
            self.need_optical_update_button.setChecked(player.need_optical_update)
            self.need_thermal_update_button.setChecked(player.need_thermal_update)
            self.need_record_button.setChecked(player.need_record)
            self.alarm_mode_button.setChecked(player.is_alarm_mode)
            for button in self.intruders_group.buttons():
                if button.text() in self.player.intruder_labels:
                    button.setChecked(True)
                else:
                    button.setChecked(False)

    def _update_confidence_label(self):
        if self.player is not None:
            optical_results = self.player._optical_detecter_thread.results
            thermal_results = self.player._thermal_detecter_thread.results
            p0 = sum(score for _, _, score in optical_results) / len(optical_results) if len(optical_results) > 0 else 0
            p1 = sum(score for _, _, score in thermal_results) / len(thermal_results) if len(thermal_results) > 0 else 0
            self._average_confidence = round(1-(1-p0)*(1-p1), 4) * 100
            self.confidence_label.setText(f'{self._average_confidence}%')
        else:
            self.confidence_label.setText("0%")
