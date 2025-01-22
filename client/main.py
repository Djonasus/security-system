import cv2
import face_recognition
import requests
import json

# URL сервера
SERVER_URL = "http://localhost:8000/api"

# Функция для получения вектора лица из изображения
def get_face_vector_from_frame(frame):
    # Конвертируем изображение в формат RGB
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    # Получаем вектор лица
    encodings = face_recognition.face_encodings(rgb_frame)
    if len(encodings) == 0:
        raise ValueError("Лицо не обнаружено в кадре!")
    return encodings[0]

# Функция для захвата изображения с веб-камеры
def capture_image_from_webcam():
    print("Запуск веб-камеры. Нажмите 'q', чтобы сделать снимок.")
    cap = cv2.VideoCapture(0)  # Открываем веб-камеру
    if not cap.isOpened():
        raise RuntimeError("Не удалось открыть веб-камеру!")
    
    face_frame = None
    while True:
        ret, frame = cap.read()
        if not ret:
            print("Не удалось считать кадр с веб-камеры.")
            continue
        
        # Отображаем текущий кадр
        cv2.imshow("Веб-камера (нажмите 'q' для снимка)", frame)
        
        # Нажмите 'q', чтобы выбрать текущий кадр
        if cv2.waitKey(1) & 0xFF == ord('q'):
            face_frame = frame
            break
    
    cap.release()
    cv2.destroyAllWindows()
    
    if face_frame is None:
        raise RuntimeError("Не удалось захватить изображение с веб-камеры.")
    return face_frame

# Функция для регистрации нового пользователя
def register_face(user_name):
    try:
        frame = capture_image_from_webcam()
        face_vector = get_face_vector_from_frame(frame).tolist()  # Преобразуем вектор в список
        payload = {
            "user_name": user_name,
            "face_vector": face_vector
        }
        print(json.dump(payload))
        response = requests.post(f"{SERVER_URL}/register_face", json=payload)
        if response.status_code == 200:
            print("Успешная регистрация:", response.json())
        else:
            print("Ошибка регистрации:", response.json())
    except Exception as e:
        print("Ошибка при регистрации:", str(e))

# Функция для проверки лица
def verify_face(user_name):
    try:
        frame = capture_image_from_webcam()
        face_vector = get_face_vector_from_frame(frame).tolist()  # Преобразуем вектор в список
        payload = {
            "user_name": user_name,
            "face_vector": face_vector
        }
        response = requests.post(f"{SERVER_URL}/verify_face", json=payload)
        if response.status_code == 200:
            print("Лицо распознано:", response.json())
        else:
            print("Лицо не распознано или ошибка:", response.json())
    except Exception as e:
        print("Ошибка при проверке лица:", str(e))

# Основное меню клиента
def main():
    print("Добро пожаловать в систему авторизации!")
    print("1. Зарегистрировать новое лицо")
    print("2. Проверить лицо")
    choice = input("Выберите действие (1/2): ")

    if choice == "1":
        user_name = input("Введите имя пользователя: ")
        register_face(user_name)
    elif choice == "2":
        user_name = input("Введите имя пользователя: ")
        verify_face(user_name)
    else:
        print("Неверный выбор.")

if __name__ == "__main__":
    main()
