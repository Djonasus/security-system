from PyQt5.QtCore import (
    QTimer,
)

from .alarm import (
    alarm_relay1_on,
    alarm_relay1_off,
    alarm_relay2_on,
    alarm_relay2_off,
)

from enum import Enum

class AlarmState(Enum):
    ALARM_OFF = 0
    ALARM_MODE = 1,
    ALARM_ACTIVE = 2,
    SILENT_ALARM = 3,

class AlarmController:
    lamp_timer = QTimer()
    lamp_active = False
    state = AlarmState.ALARM_OFF

    @classmethod
    def init(cls):
        cls.lamp_timer.timeout.connect(AlarmController._toggle_lamp)

    @staticmethod
    def start_alarm():
        if AlarmController.state == AlarmState.ALARM_MODE:
            AlarmController.lamp_timer.start(500)
            alarm_relay1_on()
            AlarmController.state = AlarmState.ALARM_ACTIVE

    @staticmethod
    def disable_alarm():
        if AlarmController.state == AlarmState.ALARM_ACTIVE:
            alarm_relay1_off()
            alarm_relay2_off()
            AlarmController.state = AlarmState.SILENT_ALARM

    @staticmethod
    def alarm_mode_on():
        alarm_relay2_on()
        AlarmController.state = AlarmState.ALARM_MODE

    @staticmethod
    def alarm_mode_off():
        alarm_relay2_off()
        AlarmController.lamp_timer.stop()
        AlarmController.state = AlarmState.ALARM_OFF

    @staticmethod
    def _toggle_lamp():
        if AlarmController.lamp_active:
            alarm_relay2_off()
            AlarmController.lamp_active = False
        else:
            alarm_relay2_on()
            AlarmController.lamp_active = True
