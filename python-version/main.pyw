from PyQt5.QtWidgets import QApplication

from src.gui import ClientWindow

if __name__ == '__main__':
    import sys
    app = QApplication(sys.argv)
    app.aboutToQuit.connect(app.deleteLater)

    window = ClientWindow(*sys.argv[1:])

    window.show()

    sys.exit(app.exec_())
