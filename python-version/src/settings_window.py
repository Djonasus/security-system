from PyQt5.QtWidgets import (
    QMainWindow,
    QWidget,
    QLabel,
    QLineEdit, 
    QPushButton,
    QCheckBox,
    QFileDialog,
    QPushButton,
    QHBoxLayout, QVBoxLayout,
)

from .opt import Options

class SettingsWindow(QMainWindow):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Настройки")
        self.resize(500, 200)

        self.init_ui()

    def init_ui(self) -> None:
        central_widget = QWidget(self)
        self.setCentralWidget(central_widget)

        saving_layout = QHBoxLayout()
        self.save_path_label = QLabel(Options.video_save_path)
        button = QPushButton("Выбрать")
        button.clicked.connect(self.on_get_save_dir_button_clicked)
        saving_layout.addWidget(self.save_path_label, 0)
        saving_layout.addWidget(button, 1)

        central_widget.setLayout(saving_layout)

    def on_get_save_dir_button_clicked(self) -> None:
        path = str(QFileDialog.getExistingDirectory(self, "Выберите папку"))
        if path != "":
            self.save_path_label.setText(path)
            Options.video_save_path = path
