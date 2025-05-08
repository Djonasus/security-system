from PyQt5.QtWidgets import (
    QMainWindow, QWidget,
    QTabWidget, QGroupBox, QScrollArea,
    QHBoxLayout, QVBoxLayout, QGridLayout, QFormLayout,
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

class PlayerList(QWidget):
    def __init__(self, connect_player_handler, parent=None):
        super().__init__(parent)

        self.connect_handler = connect_player_handler

        self.ip_addr_textbox = QLineEdit()
        self.connect_button = QPushButton("Подключить")
        self.connect_button.pressed.connect(self.connect_player)

        self.players = []
        self.players_groupbox = QGroupBox()
        self.list_form = QFormLayout()
        self.scroll = QScrollArea()
        self.scroll.setWidget(self.players_groupbox)
        self.scroll.setWidgetResizable(True)

        self.init_layout()

    def init_layout(self):
        self.main_layout = QVBoxLayout()

        self.connect_layout = QHBoxLayout()
        self.connect_layout.addWidget(self.ip_addr_textbox)
        self.connect_layout.addWidget(self.connect_button)

        self.main_layout.addLayout(self.connect_layout, 0)
        self.main_layout.addWidget(QHLine(), 0)
        self.main_layout.addWidget(QLabel("Подключенные камеры"))
        self.main_layout.addWidget(self.scroll, 1)
        self.setLayout(self.main_layout)

    def connect_player(self):
        ip = self.ip_addr_textbox.text()
        player = self.connect_handler(ip)
        self.players.append(PlayerDescriptorWidget(player))
        self.list_form.addRow(self.players[-1])
        self.list_form.addRow(QHLine())
        self.players_groupbox.setLayout(self.list_form)

class PlayerDescriptorWidget(QWidget):
    def __init__(self, player, parent=None):
        super().__init__(parent)
        self.player = player
        self.init_layout()

    def init_layout(self):
        self.main_layout = QVBoxLayout()
        self.main_layout.addWidget(QLabel(self.player.device_ip))
        camera_info = []
        if self.player._optical_stream.is_opened():
            camera_info.append("Оптическая")
        if self.player._thermal_stream.is_opened():
            camera_info.append("Тепловизионная")
        self.main_layout.addWidget(QLabel(', '.join(camera_info)))
        self.setLayout(self.main_layout)
