import * as faceapi from 'face-api.js';
import { RegVector, VerifyVector } from './api';

// Обертка результата обнаружения
type detectorResult = {
    positions: faceapi.Point[] | undefined,
    descriptors: Float32Array | undefined
}

// Элементы DOM
const video = document.getElementById('webcam') as HTMLVideoElement;
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const RegButton = document.getElementById('regBtn') as HTMLButtonElement;
const AuthButton = document.getElementById('authBtn') as HTMLButtonElement;
const NameInput = document.getElementById('nameField') as HTMLInputElement;
const ResultField = document.getElementById('result') as HTMLParagraphElement;
const DebugLabel = document.getElementById('debugInfo') as HTMLParagraphElement;
const LandmarksLabel = document.getElementById('landmarksInfo') as HTMLParagraphElement;

// Загрузка моделей
async function loadModels() {
    await faceapi.nets.tinyFaceDetector.loadFromUri(`/weights`);
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

// Функция обнаружения опорных точек и составления дескриптора
async function captureAndDetectFace(): Promise<detectorResult> {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext('2d');
    if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Детекция лица и landmarks
        const detections = await faceapi.detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks(true).withFaceDescriptor();

        if (detections) {
            // Отрисовка landmarks
            faceapi.draw.drawFaceLandmarks(canvas, detections.landmarks);
            return {descriptors: detections.descriptor, positions: detections.landmarks.positions};
        } else {
            context.clearRect(0, 0, canvas.width, canvas.height);
            return {descriptors: undefined, positions: undefined};
        }
    }
    return {descriptors: undefined, positions: undefined};
}

// Инициализация. Основной поток программы
async function main() {
    await loadModels();
    await startWebcam();

    // Обработчик нажатия на кнопку "Регистрация"
    RegButton.addEventListener('click', async () => {
        DebugLabel.textContent = "";
        const userName = NameInput.value;
        const faceVector = await captureAndDetectFace();
    
        if (faceVector) {
            // Преобразуем Float32Array в number[]
            const faceVectorArray = Array.from(faceVector.descriptors as Float32Array);
            // Загрузка вектора лица на сервер
            await RegVector({ user_name: userName, face_vector: (faceVectorArray) });
            ResultField.textContent = `Вектор лица "${userName}" загружен`;

            
        } else {
            ResultField.textContent = 'Лицо не обнаружено.';
        }
    });
    
    // Обработчик нажатия на кнопку "Авторизация"
    AuthButton.addEventListener('click', async () => {
        DebugLabel.textContent = "Дескрипторы: \n";
        LandmarksLabel.textContent = "Координаты: \n";
        const userName = NameInput.value;
        const faceVector = await captureAndDetectFace();
        
        if (faceVector.descriptors) {
            // Преобразуем Float32Array в number[]
            const faceVectorArray = Array.from(faceVector.descriptors as Float32Array);
            DebugLabel.textContent += faceVectorArray.toString();
            
            (faceVector.positions as faceapi.Point[]).forEach(p => {
                LandmarksLabel.textContent += Math.round(p.x) + ", "+Math.round(p.y)+"\n"
            });

            // Проверка вектора лица на сервере (Ассинхронная операция, которая отправляет вектор дескрипторов на сервер)
            const isMatch = await VerifyVector({ user_name: userName, face_vector: faceVectorArray });
    
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
