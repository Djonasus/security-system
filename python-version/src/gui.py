from PyQt5.QtWidgets import (
    QMainWindow, QWidget,
    QTabWidget,
    QHBoxLayout, QVBoxLayout, QGridLayout,
    QLabel, QLineEdit, QPushButton, QSlider, QButtonGroup, QCheckBox,
    QSizePolicy, QSpacerItem,
    QMessageBox,
)

from PyQt5.QtGui import (
    QPixmap, QImage, QIcon,
    QPainter, QPen, QColor, QFont
)

from PyQt5.QtCore import (
    pyqtSignal, QTimer,
    QPoint,
)

from PyQt5.QtCore import Qt

from threading import Thread
from datetime import datetime

from .player.player import Player
from .player.client import RTSPClient
from .player.nn import allowed_labels
from .player.alarm import (
    alarm_relay1_on,
    alarm_relay1_off,
    alarm_relay2_on,
    alarm_relay2_off
)
from .player.player import Player
from .player.frame_buffer import FrameBuffer
from .player.detecter_thread import ObjectDetecterThread
from .menubar import MenuBar
from .control_panel import ControlPanel
from .player_list import PlayerList
from .opt import Options
from .qt_widget_utils import *


from math import sqrt, ceil

import numpy as np
from typing import List

from .player.alarm_controller import AlarmController

class ClientWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Система охраны")
        self.setMinimumSize(700, 270)
        self.setMenuBar(MenuBar())
        AlarmController.init()
        self.setWindowIcon(QIcon('icon.ico'))
        
        self.intruder_bounds_color = QColor.fromRgb(255, 0, 0)

        self.players: List[Player] = []
        self.have_expanded_label = False

        self._init_ui()

    def __player_id_to_coord(self, n):
        line = ceil(sqrt(n))-1
        row = n - (line**2 + line) - 1
        return (row, line) if row >= 0 else (line, line + row)

    def _init_player_layout(self):
        if len(self.players) > 0:
            row, col = self.__player_id_to_coord(len(self.players))
            self.player_layout.addWidget(self.players[-1], row, col)

    def _init_ui(self):
        central_widget = QWidget(self)
        self.setCentralWidget(central_widget)

        self.player_layout = QGridLayout()
        self._init_player_layout()

        self.control_panel = ControlPanel(None)
        self.players_connector = PlayerList(self.add_player)

        tab = QTabWidget()
        tab.addTab(self.control_panel, "Управление")
        tab.addTab(self.players_connector, "Камеры")

        self.control_layout = QVBoxLayout()
        self.control_layout.addWidget(tab)

        window_layout = QHBoxLayout()
        window_layout.addLayout(self.player_layout, 1)
        window_layout.addWidget(QVLine())
        window_layout.addLayout(self.control_layout, 0)

        central_widget.setLayout(window_layout)

    def add_player(self, ip):
        player = Player(ip)
        player.get_capture()
        self.players.append(player)
        player.mouseReleaseEvent = lambda _: self._choose_player_event(player)
        player.mouseDoubleClickEvent = lambda _: self._expand_player_to_fullscreen(player)
        self.control_panel.change_player(player)
        self._init_player_layout()
        return player

    def _choose_player_event(self, player):
        self.control_panel.change_player(player)

    def _expand_player_to_fullscreen(self, player: Player):
        player_id = self.players.index(player)
        if self.have_expanded_label:
            for i in range(len(self.players)):
                row, col = self.__player_id_to_coord(i+1)
                self.player_layout.setRowStretch(row, 0)
                self.player_layout.setColumnStretch(col, 0)
            self.have_expanded_label = False
        else:
            row, col = self.__player_id_to_coord(player_id+1)
            self.player_layout.setRowStretch(row, 1)
            self.player_layout.setColumnStretch(col, 1)
            self.have_expanded_label = True

    ### Unused
    def toggle_alarm_mode(self):
        if self.alarm_mode_button.isChecked():
            self.alarm_mode_button.setStyleSheet('background-color: green')
            self.intruder_detected = False
            self.alarm_active = False
            alarm_relay1_on()
        else:
            self.alarm_mode_button.setStyleSheet('background-color: none')
            self._disable_alarm()
    ###
        
    def closeEvent(self, event):
        msg = QMessageBox(self)
        msg.setWindowTitle("Выход")
        msg.setIcon(QMessageBox.Question)
        msg.setText("Вы действительно хотите выйти?")

        buttonAceptar  = msg.addButton("Да", QMessageBox.YesRole)    
        buttonCancelar = msg.addButton("Нет", QMessageBox.RejectRole) 
        msg.setDefaultButton(buttonCancelar)
        msg.exec_()

        if msg.clickedButton() == buttonAceptar:
            event.accept()
        elif msg.clickedButton() == buttonCancelar:
            event.ignore()

    def on_finished_thread(self, stream: RTSPClient) -> None:
        stream.capture.release()
