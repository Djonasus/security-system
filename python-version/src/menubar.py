from PyQt5.QtWidgets import (
    QMenuBar,
    QMenu,
    QAction,
    QFileDialog,
)

from PyQt5.QtCore import Qt
from .opt import Options

class MenuBar(QMenuBar):
    def __init__(self):
        super().__init__()
        self._choose_path_button = QAction("Путь для сохранения видео", self)
        self._choose_path_button.triggered.connect(self.on_button_clicked)
        self._path_label = QAction(Options.video_save_path, self)
        self.addAction(self._choose_path_button)
        self.addAction(self._path_label)

    def on_button_clicked(self):
        directory = QFileDialog.getExistingDirectory(self, 'Выберите директорию')
        if directory:
            print(directory)
            self._path_label.setText(directory)
            Options.video_save_path = directory