import * as faceapi from 'face-api.js';
import { detectorResult } from './models/detector-result';
import { RegVector, VerifyVector } from './api';

// --- Получение элементов DOM ---
const videoCanvas = document.getElementById('visCanvas') as HTMLCanvasElement;
const resultCanvas = document.getElementById('visCanvas__result') as HTMLCanvasElement;
const thermResultCanvas = document.getElementById('thermCanvas__result') as HTMLCanvasElement;
const thermCanvas = document.getElementById('thermCanvas') as HTMLCanvasElement; // Добавляем тепловой canvas

const operationForm = document.forms.namedItem('operation_form') as HTMLFormElement;
const operateButton = document.getElementById('operateButton') as HTMLButtonElement;
const checkButton = document.getElementById('checkButton') as HTMLButtonElement;

const xoLabel = document.getElementById("xoLabel") as HTMLLabelElement;
const yoLabel = document.getElementById("yoLabel") as HTMLLabelElement;

let Xoffset: string = "0";
let Yoffset: string = "0";
let scaleFactor = 0.75;

changeOffsetX();
changeOffsetY();

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
resultCanvas.width = 704;
resultCanvas.height = 576;

thermCanvas.width = 640;
thermCanvas.height = 480;
thermResultCanvas.width = 640;
thermResultCanvas.height = 480;


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
async function drawFace(detection: faceapi.WithFaceDescriptor<faceapi.WithFaceLandmarks<{detection: faceapi.FaceDetection}, faceapi.FaceLandmarks68>>) {

    // const Xoffset = (operationForm.elements.namedItem('xOffset') as HTMLInputElement).value;
    // const Yoffset = (operationForm.elements.namedItem('yOffset') as HTMLInputElement).value;

  if (!videoCanvas || !resultCanvas) {
    console.log('detectFaces: videoCanvas или resultCanvas не определены');
    return;
  }

  const ctx = resultCanvas.getContext('2d');
  const thermCtx = thermResultCanvas.getContext('2d');
  if (!ctx && !thermCtx) {
    console.log('detectFaces: Не удалось получить контекст 2D для resultCanvas');
    return;
  }

  ctx!.drawImage(videoCanvas, 0, 0, videoCanvas.width, videoCanvas.height);
  faceapi.draw.drawFaceLandmarks(resultCanvas, detection);

  thermCtx!.drawImage(thermCanvas, 0, 0, thermResultCanvas.width, thermResultCanvas.height);
  faceapi.draw.drawFaceLandmarks(thermResultCanvas, detection);

  // Визуализация точек считывания температуры
  const thermalCtxForDrawing = thermResultCanvas.getContext('2d');
  if (thermalCtxForDrawing) {
    const landmarks = detection.landmarks;
    const noseTip = landmarks.getNose()[3];
    const leftEyeInnerCorner = landmarks.positions[39];
    const rightEyeInnerCorner = landmarks.positions[42];

    // Координаты носа
    const thermalNoseX = noseTip.x;
    const thermalNoseY = noseTip.y;

    // Координаты левого глаза (внутренний уголок глаза)
    const thermalLeftEyeX = leftEyeInnerCorner.x;
    const thermalLeftEyeY = leftEyeInnerCorner.y;

    // Координаты правого глаза (внутренний уголок глаза)
    const thermalRightEyeX = rightEyeInnerCorner.x;
    const thermalRightEyeY = rightEyeInnerCorner.y;

    // Рисуем точки
    thermalCtxForDrawing.fillStyle = 'red'; // Нос - красный
    thermalCtxForDrawing.beginPath();
    thermalCtxForDrawing.arc(thermalNoseX, thermalNoseY, 3, 0, 2 * Math.PI);
    thermalCtxForDrawing.fill();

    thermalCtxForDrawing.fillStyle = 'blue'; // Глаза - синие
    thermalCtxForDrawing.beginPath();
    thermalCtxForDrawing.arc(thermalLeftEyeX, thermalLeftEyeY, 3, 0, 2 * Math.PI);
    thermalCtxForDrawing.fill();
    thermalCtxForDrawing.beginPath();
    thermalCtxForDrawing.arc(thermalRightEyeX, thermalRightEyeY, 3, 0, 2 * Math.PI);
    thermalCtxForDrawing.fill();
  }
}

async function checkLiveness(
    detection: faceapi.WithFaceDescriptor<
      faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }, faceapi.FaceLandmarks68>
    >
  ): Promise<boolean> {
    const thermalCtx = thermCanvas.getContext('2d');
    if (!thermalCtx) {
      console.error('Thermal context not found');
      return false;
    }

    const { width: thermWidth, height: thermHeight } = thermCanvas;
    const { width: videoWidth, height: videoHeight } = videoCanvas; // Получаем размеры видео холста

    console.log(`Thermal canvas size: ${thermWidth}x${thermHeight}`);
    console.log(`Video canvas size: ${videoWidth}x${videoHeight}`);
    
    const thermalData = thermalCtx.getImageData(0, 0, thermWidth, thermHeight).data;

    // Вычисляем коэффициенты масштабирования
    const scaleX = thermWidth / videoWidth;
    const scaleY = thermHeight / videoHeight;

    // Функция для получения значения пикселя (яркости) в точке (x, y) с учетом масштаба и смещения
    // Предполагаем, что тепловое изображение в градациях серого, используем R канал
    function getPixelValue(videoX: number, videoY: number, pointName: string): number { // Добавляем имя точки для логирования

        // Применяем только масштаб для получения координат на исходном тепловом холсте
        const thermalX = videoX * scaleX;
        const thermalY = videoY * scaleY;

        // Ограничиваем координаты границами теплового холста
        const clampedX = Math.max(0, Math.min(Math.round(thermalX), thermWidth - 1));
        const clampedY = Math.max(0, Math.min(Math.round(thermalY), thermHeight - 1));

        const index = (clampedY * thermWidth + clampedX) * 4;

        // Логирование координат
        console.log(`[${pointName}] Video coords: (${videoX.toFixed(2)}, ${videoY.toFixed(2)}) -> Thermal coords (raw): (${thermalX.toFixed(2)}, ${thermalY.toFixed(2)}) -> Clamped: (${clampedX}, ${clampedY}) -> Index: ${index}`);

        // Проверка на всякий случай, хотя после clamp она не должна срабатывать
        if (index < 0 || index >= thermalData.length) {
            console.error(`Clamped pixel coordinates (${clampedX}, ${clampedY}) resulted in out-of-bounds index ${index}.`);
            
            return 0; 
        }
        // Если координаты были за пределами, выводим предупреждение
        if (Math.round(thermalX) !== clampedX || Math.round(thermalY) !== clampedY) {
             console.warn(`Original pixel coordinates (${thermalX}, ${thermalY}) were out of bounds. Used clamped values (${clampedX}, ${clampedY}).`);
        }

        return thermalData[index]; // R канал
    }

    // 1. Получаем ключевые точки лица
    const landmarks = detection.landmarks;
    const noseTip = landmarks.getNose()[3]; // Кончик носа (точка 34)
    // Получаем внутренние уголки глаз (ближе к носу)
    const leftEyeInnerCorner = landmarks.positions[39]; // Внутренний угол левого глаза
    const rightEyeInnerCorner = landmarks.positions[42]; // Внутренний угол правого глаза

    // 2. Получаем значения температуры (яркости) в этих точках, используя координаты с видео холста
    const tNose = getPixelValue(noseTip.x, noseTip.y, 'Nose');
    const tLeftEye = getPixelValue(leftEyeInnerCorner.x, leftEyeInnerCorner.y, 'LeftEye');
    const tRightEye = getPixelValue(rightEyeInnerCorner.x, rightEyeInnerCorner.y, 'RightEye');

    // 3. Проверяем характерный разброс температур
    const eyeAvg = (tLeftEye + tRightEye) / 2;
    // const eyesWarmerThanNose = tNose < eyeAvg; // У живого человека нос обычно холоднее глаз

    // Проверка на минимальную разницу (чтобы отсечь почти одинаковые температуры, как у телефона)
    // const minimalDifferenceThreshold = 3; // Уменьшенный порог минимальной разницы
    // const hasMinimalDifference = Math.abs(eyeAvg - tNose) > minimalDifferenceThreshold;

    // Проверка на разумную разницу (чтобы отсечь слишком большие, нереалистичные перепады)
    // const reasonableDifferenceThreshold = 30; // Увеличенный порог максимальной разумной разницы
    // const reasonableDifference = Math.abs(eyeAvg - tNose) < reasonableDifferenceThreshold;

    // соотношение точек (в большинстве случаев, у человека этот показатель выше 1, когда как у изображения он ниже)
    const ratio = tNose / eyeAvg;

    // Итоговое решение: отношение глаз к носу должно быть больше 1 И должна быть минимальная разница И разница должна быть разумной
    // const isLive = (eyesWarmerThanNose && hasMinimalDifference && reasonableDifference) || ratio > 1;
    
    // const isLive = ratio > 1 && hasMinimalDifference && reasonableDifference; 
    const isLive = ratio >= 1; 

    console.log('Thermal points:', { tNose, tLeftEye, tRightEye, eyeAvg });
    console.log('Conditions:', { ratio });
    console.log('-> isLive:', isLive);

    return isLive;
}
  

// --- Обработка ввода ---
async function perfomInput(senddata: boolean) {
    const operationType = (operationForm.elements.namedItem('operation_type') as HTMLSelectElement).value;
    const username = (operationForm.elements.namedItem('username') as HTMLInputElement).value;

    if (!username && senddata) { // Проверяем имя только при регистрации
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
    await drawFace(detection);

    // --- Проверка на спуфинг --- 
    const isLive = await checkLiveness(detection); // Передаем весь объект detection
    if (!isLive) {
        alert('Обнаружена попытка спуфинга! Операция отменена.');
        landmarksLabel.textContent = "";
        descriptorsLabel.textContent = "";
        return;
    }
    // --- Конец проверки на спуфинг ---

    const data: detectorResult = {
        positions: detection.landmarks.positions,
        descriptors: detection.descriptor
    };

    landmarksLabel.textContent = "Позиции лицевых точек: " + JSON.stringify(data.positions);
    descriptorsLabel.textContent = "Дескрипторы: " + JSON.stringify(data.descriptors, null, 2);

    if (senddata) {
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
}

function changeOffsetX() {
    Xoffset = (operationForm.elements.namedItem('xOffset') as HTMLInputElement).value;
    xoLabel.textContent = Xoffset;
}

function changeOffsetY() {
    Yoffset = (operationForm.elements.namedItem('yOffset') as HTMLInputElement).value;
    yoLabel.textContent = Yoffset;
}

// Основная программа
(async () => {
    await loadModels();
    // --- Обработка действий пользователя (Регистрация/Идентификация) ---
    operateButton?.addEventListener('click', () => {perfomInput(true)});
    checkButton?.addEventListener('click', () => {perfomInput(false)});

    (operationForm.elements.namedItem('xOffset') as HTMLInputElement).addEventListener('change', changeOffsetX);
    (operationForm.elements.namedItem('yOffset') as HTMLInputElement).addEventListener('change', changeOffsetY);
})();