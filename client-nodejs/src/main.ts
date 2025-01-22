import * as faceapi from 'face-api.js';
import { RegVector, VerifyVector } from './api';

// Элементы DOM
const video = document.getElementById('webcam') as HTMLVideoElement;
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const RegButton = document.getElementById('regBtn') as HTMLButtonElement;
const AuthButton = document.getElementById('authBtn') as HTMLButtonElement;
const NameInput = document.getElementById('nameField') as HTMLInputElement;
const ResultField = document.getElementById('result') as HTMLParagraphElement;

// Загрузка моделей
async function loadModels() {
    await faceapi.nets.tinyFaceDetector.loadFromUri('/weights');
    await faceapi.nets.faceLandmark68TinyNet.loadFromUri('/weights');
    await faceapi.nets.faceRecognitionNet.loadFromUri('/weights');
}

// Запуск веб-камеры
async function startWebcam() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
    } catch (error) {
        console.error('Ошибка доступа к камере:', error);
    }
}

// Захват кадра с видео и извлечение вектора лица
async function captureAndDetectFace() : Promise<Float32Array | undefined> {
    // Устанавливаем размеры canvas равными размерам видео
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Рисуем текущий кадр видео на canvas
    const context = canvas.getContext('2d');
    if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Преобразуем canvas в изображение
        const image = new Image();
        image.src = canvas.toDataURL('image/png');

        // Ждем загрузки изображения
        await new Promise((resolve) => (image.onload = resolve));

        // Извлекаем вектор лица
        const faceVector = await getFaceVector(image);

        if (faceVector) {
            return faceVector;
            // console.log('Вектор лица:', faceVector);
        } else {
            return undefined;
            // console.log('Лицо не обнаружено.');
        }
    }
}

// Функция для извлечения вектора лица
async function getFaceVector(image: HTMLImageElement): Promise<Float32Array | null> {
    const detections = await faceapi
        .detectSingleFace(image, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks(true)
        .withFaceDescriptor();

    if (detections) {
        return detections.descriptor;
    }

    return null;
}

// Инициализация
async function main() {
    await loadModels();
    await startWebcam();

    // Обработчик нажатия на кнопку "Capture"
    // RegButton.addEventListener('click', captureAndDetectFace);
    RegButton.addEventListener('click', async () => {
        const userName = NameInput.value;
        const faceVector = await captureAndDetectFace();

        if (faceVector) {
            // Загрузка вектора лица на сервер
            await RegVector({user_name: userName, face_vector: faceVector});
            ResultField.textContent = `Вектор лица "${userName}" загружен`;
        } else {
            ResultField.textContent = 'Лицо не обнаружено.';
        }
    });

    AuthButton.addEventListener('click', async () => {
        const userName = NameInput.value;
        const faceVector = await captureAndDetectFace();

        if (faceVector) {
            // Проверка вектора лица на сервере
            const isMatch = await VerifyVector({user_name: userName, face_vector: faceVector});

            if (isMatch) {
                ResultField.textContent = `Вы успешно авторизованы как "${userName}"`;
            } else {
                ResultField.textContent = 'Неверный вектор лица.';
            }
        } else {
            ResultField.textContent = 'Лицо не обнаружено.';
        }
    });
}

// Запуск
main();