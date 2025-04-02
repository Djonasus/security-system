import * as faceapi from 'face-api.js';
import { RegVector, VerifyVector } from './api';

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

interface detectorResult {
    positions: faceapi.Point[] | undefined,
    descriptors: Float32Array | undefined
}

async function captureAndDetectFace(): Promise<detectorResult> {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext('2d');
    if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Детекция лица и landmarks
        // const detections = await faceapi
        //     .detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions())
        //     .withFaceLandmarks(true)
        //     .withFaceDescriptor();
        // const det_singleFace = await faceapi.detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions());
        // const det_landmarks = faceapi.detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks(true)
        const detections = await faceapi.detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks(true).withFaceDescriptor();
        // console.log(detections?.landmarks.positions);

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

// Захват кадра с видео и извлечение вектора лица
// async function captureAndDetectFace() : Promise<Float32Array | undefined> {
//     // Устанавливаем размеры canvas равными размерам видео
//     canvas.width = video.videoWidth;
//     canvas.height = video.videoHeight;

//     // Рисуем текущий кадр видео на canvas
//     const context = canvas.getContext('2d');
//     if (context) {
//         context.drawImage(video, 0, 0, canvas.width, canvas.height);

//         // Преобразуем canvas в изображение
//         const image = new Image();
//         image.src = canvas.toDataURL('image/png');

//         // Ждем загрузки изображения
//         await new Promise((resolve) => (image.onload = resolve));

//         // Извлекаем вектор лица
//         const faceVector = await getFaceVector(image);

//         if (faceVector) {
//             return faceVector;
//             // console.log('Вектор лица:', faceVector);
//         } else {
//             return undefined;
//             // console.log('Лицо не обнаружено.');
//         }
//     }
// }

// Функция для извлечения вектора лица
// async function getFaceVector(image: HTMLImageElement): Promise<Float32Array | null> {
//     const detections = await faceapi
//         .detectSingleFace(image, new faceapi.TinyFaceDetectorOptions())
//         .withFaceLandmarks(true)
//         .withFaceDescriptor();

//     if (detections) {
//         return detections.descriptor;
//     }

//     return null;
// }

// Инициализация
async function main() {
    await loadModels();
    await startWebcam();

    // Обработчик нажатия на кнопку "Capture"
    // RegButton.addEventListener('click', captureAndDetectFace);
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
    
    AuthButton.addEventListener('click', async () => {
        DebugLabel.textContent = "";
        const userName = NameInput.value;
        const faceVector = await captureAndDetectFace();
    
        if (faceVector.descriptors) {
            // Преобразуем Float32Array в number[]
            const faceVectorArray = Array.from(faceVector.descriptors as Float32Array);
            DebugLabel.textContent = faceVectorArray.toString();
            LandmarksLabel.textContent = (faceVector.positions as faceapi.Point[]).toString();
            // Проверка вектора лица на сервере
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
