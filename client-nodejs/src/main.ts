import * as faceapi from 'face-api.js';
import { detectorResult } from './models/detector-result';
import { RegVector, VerifyVector } from './api';

type Detection = faceapi.WithFaceDescriptor<faceapi.WithFaceLandmarks<{detection: faceapi.FaceDetection}, faceapi.FaceLandmarks68>> 

// --- Получение элементов DOM ---
const videoCanvas = document.getElementById('visCanvas') as HTMLCanvasElement;
const resultCanvas = document.getElementById('visCanvas__result') as HTMLCanvasElement;
const thermResultCanvas = document.getElementById('thermCanvas__result') as HTMLCanvasElement;
const thermCanvas = document.getElementById('thermCanvas') as HTMLCanvasElement; // Добавляем тепловой canvas

const operationForm = document.forms.namedItem('operation_form') as HTMLFormElement;

const operateButton = document.getElementById('operateButton') as HTMLButtonElement;
const justCheckButton = document.getElementById('justCheckButton') as HTMLButtonElement;

const landmarksLabel = document.getElementById('landmarkPositions') as HTMLLabelElement;
const descriptorsLabel = document.getElementById('descriptors') as HTMLLabelElement;
const resultLabel = document.getElementById('result-label') as HTMLLabelElement;

if (!videoCanvas || !resultCanvas || !thermCanvas || !operationForm || !operateButton) { // Проверяем thermCanvas
  console.error('Не удалось найти необходимые элементы DOM!');
  alert('Ошибка: не найдены необходимые элементы интерфейса.');
  throw new Error('Критическая ошибка: элементы DOM не найдены');
}

// Инициализация размеров canvas
videoCanvas.width = 704;
videoCanvas.height = 576;
thermResultCanvas.width = 704;
thermResultCanvas.height = 576;

thermCanvas.width = 640;
thermCanvas.height = 480;

// --- Инициализация face-api.js ---
async function loadModels() {
  console.log('Начинаем загрузку моделей face-api.js...');
  try {
    await faceapi.nets.tinyFaceDetector.loadFromUri(`/weights`);
    await faceapi.nets.faceLandmark68TinyNet.loadFromUri('/weights');
    await faceapi.nets.faceRecognitionNet.loadFromUri('/weights');

    console.log('Модели face-api.js успешно загружены!');
    
  } catch (error) {
    console.error('Ошибка при загрузке моделей:', error);
    alert('Не удалось загрузить необходимые модели. Проверьте консоль для деталей.');
  }
}

// --- Рисование лица на resultCanvas---
// Результрующие канвасы учавствуют в расчетах и только потом используются для визуализации
async function drawFace() {
  if (!videoCanvas || !resultCanvas) {
    console.log('detectFaces: videoCanvas или resultCanvas не определены');
    return;
  }

  const ctx = resultCanvas.getContext('2d');
  const ctx2 = thermResultCanvas.getContext('2d');
  if (ctx && ctx2) {

    // Рисуем оптическое изображение
    ctx.drawImage(videoCanvas, 0, 0, resultCanvas.width, resultCanvas.height);

    // Размещаем тепло-карту согласно оптическому захвату
    // Значения были найдены эмперически, что называется "на глаз"
    ctx2.drawImage(thermCanvas, (704-640)/1.5, (576-480)/1.5, thermCanvas.width * 2.2, thermCanvas.height * 2.3);
  }
}

async function drawLandmarks(detection: Detection, data: {leftEye: {x: number, y: number, clr: number}}) {
    if (detection) {
        const resizedDetections = faceapi.resizeResults(detection, { width: resultCanvas.width, height: resultCanvas.height });
        const resizedDetections2 = faceapi.resizeResults(detection, {width: thermResultCanvas.width, height: thermResultCanvas.height});

        const landmarks = resizedDetections2.landmarks;

        faceapi.draw.drawFaceLandmarks(resultCanvas, resizedDetections);
        faceapi.draw.drawFaceLandmarks(thermResultCanvas, resizedDetections2);

        const noseTip = landmarks.getNose()[2];
        const leftEyeInnerCorner = landmarks.positions[39];
        const rightEyeInnerCorner = landmarks.positions[42];
        const rightEyeBrow = landmarks.getRightEyeBrow();
        const leftEyeBrow = landmarks.getLeftEyeBrow();

        const thermalLeftEyeBrow = leftEyeBrow.map((point) => ({x: point.x, y: point.y}));
        const thermalRightEyeBrow = rightEyeBrow.map((point) => ({x: point.x, y: point.y}));

        // Координаты носа
        const thermalNoseX = noseTip.x;
        const thermalNoseY = noseTip.y;

        // Координаты левого глаза (внутренний уголок глаза)
        const thermalLeftEyeX = leftEyeInnerCorner.x;
        const thermalLeftEyeY = leftEyeInnerCorner.y;

        // Координаты правого глаза (внутренний уголок глаза)
        const thermalRightEyeX = rightEyeInnerCorner.x;
        const thermalRightEyeY = rightEyeInnerCorner.y;

        const ctx = thermResultCanvas.getContext('2d', { willReadFrequently: true });

        if (!ctx) {
            return;
        }

        // Рисуем точки
        ctx.fillStyle = 'red'; // Нос - красный
        ctx.beginPath();
        ctx.arc(thermalNoseX, thermalNoseY, 3, 0, 2 * Math.PI);
        ctx.fill();

        ctx.fillStyle = 'blue'; // Глаза - синие
        ctx.beginPath();
        ctx.arc(thermalLeftEyeX, thermalLeftEyeY, 3, 0, 2 * Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(thermalRightEyeX, thermalRightEyeY, 3, 0, 2 * Math.PI);
        ctx.fill();

        thermalLeftEyeBrow.forEach((point) => {
            ctx.fillStyle = 'green' // Бровь - зеленая
            ctx.beginPath();
            ctx.arc(point.x, point.y, 3,0,2 * Math.PI);
            ctx.fill(); 
        });

        thermalRightEyeBrow.forEach((point) => {
            ctx.fillStyle = 'green' // Бровь - зеленая
            ctx.beginPath();
            ctx.arc(point.x, point.y, 3,0,2 * Math.PI);
            ctx.fill(); 
        });

        console.log(data);
        
        ctx.fillText(data.leftEye.clr.toString(), data.leftEye.x, data.leftEye.y+15);
    }
}

// --- Проверка на спуфинг (Liveness Check) ---
async function checkLiveness(detection: Detection): Promise<boolean> {
    // Адаптируем лицевые координаты под тепловую карту
    const resizedDetections = faceapi.resizeResults(detection, {width: thermResultCanvas.width, height: thermResultCanvas.height});
    const landmarks = resizedDetections.landmarks;

    // Получаем данные с теплового canvas
    // const ctx = thermResultCanvas.getContext('2d', { willReadFrequently: true });
    const ctx = thermResultCanvas.getContext('2d');
    let thermalImageData: ImageData;

    if (!ctx) {
        console.error('Ошибка при получении данных изображения с теплового canvas');
        return false;
    }

    try {
        thermalImageData = ctx.getImageData(0, 0, thermResultCanvas.width, thermResultCanvas.height);
    } catch (error) {
        console.error('Ошибка при получении данных изображения с теплового canvas:', error);
        return false; // Пропускаем проверку при ошибке
    }
    const thermalData = thermalImageData.data; // Массив RGBA
    const width = thermResultCanvas.width;
    

    // Функция для получения средней температуры в области (усреднение канала R)
    const getAverageTemperature = async (points: faceapi.Point[]): Promise<number> => {
        let sum: number = 0;
        
        await (points.forEach(async p => {
            sum += await getPixelValue(p.x, p.y);
        }));

        return sum / points.length;
    };

    // Функция для получения значения пикселя (яркости) в точке (x, y) с учетом масштаба и смещения
    // Предполагаем, что тепловое изображение в градациях серого, используем R канал
    const getPixelValue = async (videoX: number, videoY: number): Promise<number> => {

        // const x = Math.round(videoX + (704-640)/1.5);
        // const y = Math.round(videoY + (576-480)/1.5);
        
        const x = Math.round(videoX);
        const y = Math.round(videoY);
        
        
        const index = ((y * (width * 4)) + (x * 4));
        // console.log({X: videoX, Y: videoY});
        
        // console.log({R: thermalData[index], G: thermalData[index+1], B: thermalData[index+2]});
        
        return thermalData[index];
    }

    // Получаем точки

    const nosePoint = landmarks.getNose()[2];
    const leftEyeCorner = landmarks.positions[39];
    const rightEyeCorner = landmarks.positions[42];

    const leftEyeBrowTemp = await getAverageTemperature(landmarks.getLeftEyeBrow());
    const rightEyeBrowTemp = await getAverageTemperature(landmarks.getRightEyeBrow());

    const tNose = await getPixelValue(nosePoint.x, nosePoint.y);
    const tLeftEye = await getPixelValue(leftEyeCorner.x, leftEyeCorner.y);
    const tRightEye = await getPixelValue(rightEyeCorner.x, rightEyeCorner.y);

    await drawLandmarks(detection, {leftEye: {x: leftEyeCorner.x, y: leftEyeCorner.y, clr: tLeftEye}});

    console.log({leftEyeBrowTemp, rightEyeBrowTemp, tNose, tLeftEye, tRightEye});
    

    return true
}
  

// --- Обработка ввода ---
async function perfomInput(justLiveCheck: boolean = true) {
    console.log("ABOBA");
    
    const operationType = (operationForm.elements.namedItem('operation_type') as HTMLSelectElement).value;
    const username = (operationForm.elements.namedItem('username') as HTMLInputElement).value;

    if (!username && !justLiveCheck) { // Проверяем имя только при регистрации
        alert('Пожалуйста, введите имя пользователя для регистрации.');
        return;
    }

    console.log(`Выполняется операция: ${operationType}, Пользователь: ${username || 'N/A'}`);

    // Получаем текущие дескрипторы лиц с видео
    const detection = await faceapi
        .detectSingleFace(videoCanvas, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks(true)
        .withFaceDescriptor();

    if (!detection) {
        alert('Лица не найдены на видео или происходит попытка спуфинга. Попробуйте снова.');
        return;
    }

    // Рисуем лицо
    drawFace();
    // drawLandmarks(detection);

    // --- Проверка на спуфинг --- 
    const isLive = await checkLiveness(detection); // Передаем весь объект detection
    if (!isLive) {
        alert('Обнаружена попытка спуфинга! Операция отменена.');
        landmarksLabel.textContent = "";
        descriptorsLabel.textContent = "";
        return;
    } else {
        // drawLandmarks(detection);
    }
    // --- Конец проверки на спуфинг ---

    const data: detectorResult = {
        positions: detection.landmarks.positions,
        descriptors: detection.descriptor
    };

    landmarksLabel.textContent = "Позиции лицевых точек: " + JSON.stringify(data.positions);
    descriptorsLabel.textContent = "Дескрипторы: " + JSON.stringify(data.descriptors, null, 2);

    
    if (justLiveCheck) return;

    if (operationType === 'registration') {
        console.log("Регистрация нового лица");
        // Регистрация
        const array = Array.from(data.descriptors as Float32Array);
        await RegVector({ user_name: username.trim(), face_vector: array});
        resultLabel.textContent = "Регистрация завершена успешно.";
    } else if (operationType === 'identify') {
        // Идентификация
        console.log("Идентификация лица");
        const array = Array.from(data.descriptors as Float32Array);
        const result = await VerifyVector({ user_name: username.trim(), face_vector: array});
        if (result) {
            resultLabel.textContent = `Вы успешно вошли как "${username}"`;
        } else {
            resultLabel.textContent = 'Неверный вектор лица.';
        }
    }
}

// Основная программа
(async () => {
    await loadModels();
    // --- Обработка действий пользователя (Регистрация/Идентификация) ---
    operateButton?.addEventListener('click', () => perfomInput(false));
    justCheckButton?.addEventListener('click', () => perfomInput(true));

    thermResultCanvas.addEventListener('mousedown', getCursorPosition);
})();

function getCursorPosition(event: MouseEvent) {
    const rect = thermResultCanvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    console.log("x: " + x + " y: " + y)
}