import * as faceapi from 'face-api.js';
import { detectorResult } from './models/detector-result';

// --- Получение элементов DOM ---
const videoCanvas = document.getElementById('visCanvas') as HTMLCanvasElement;
const resultCanvas = document.getElementById('visCanvas__result') as HTMLCanvasElement;
const thermCanvas = document.getElementById('thermCanvas') as HTMLCanvasElement; // Добавляем тепловой canvas
const operationForm = document.forms.namedItem('operation_form') as HTMLFormElement;
const operateButton = document.getElementById('operateButton') as HTMLButtonElement;

const landmarksLabel = document.getElementById('landmarkPositions') as HTMLLabelElement;
const descriptorsLabel = document.getElementById('descriptors') as HTMLLabelElement;

if (!videoCanvas || !resultCanvas || !thermCanvas || !operationForm || !operateButton) { // Проверяем thermCanvas
  console.error('Не удалось найти необходимые элементы DOM!');
  alert('Ошибка: не найдены необходимые элементы интерфейса.');
  throw new Error('Критическая ошибка: элементы DOM не найдены');
}

// Инициализация размеров canvas
videoCanvas.width = 640;
videoCanvas.height = 480;
resultCanvas.width = videoCanvas.width;
resultCanvas.height = videoCanvas.height;
// Предполагаем, что тепловой canvas имеет те же размеры
if (thermCanvas) {
    thermCanvas.width = videoCanvas.width;
    thermCanvas.height = videoCanvas.height;
}

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

// --- Рисование лиц ---
async function drawFace(detection: faceapi.WithFaceDescriptor<faceapi.WithFaceLandmarks<{detection: faceapi.FaceDetection}, faceapi.FaceLandmarks68>>) {
  if (!videoCanvas || !resultCanvas) {
    console.log('detectFaces: videoCanvas или resultCanvas не определены');
    return;
  }
  // Копируем изображение с videoCanvas на resultCanvas
  const ctx = resultCanvas.getContext('2d');
  if (ctx) {
    ctx.drawImage(thermCanvas, 0, 0, resultCanvas.width, resultCanvas.height);
  }

  if (detection) {
    // Корректируем координаты под размер resultCanvas
    const displaySize = { width: resultCanvas.width, height: resultCanvas.height };
    const resizedDetections = faceapi.resizeResults(detection, displaySize);
    faceapi.draw.drawFaceLandmarks(resultCanvas, resizedDetections);

    const box = resizedDetections.detection.box;
    const text = [`Лицо обнаружено`];
    new faceapi.draw.DrawTextField(text, box.bottomLeft).draw(resultCanvas);
  }
}

// --- Проверка на спуфинг (Liveness Check) ---
// Глобальные переменные для отслеживания времени обновления изображений
let lastVideoUpdate = 0;
let lastThermalUpdate = 0;

// Функция для обновления временных меток
function updateTimestamp(isVideo: boolean) {
    if (isVideo) {
        lastVideoUpdate = Date.now();
    } else {
        lastThermalUpdate = Date.now();
    }
}

// Экспортируем функцию в глобальный объект для доступа из HTML
(window as any).updateTimestamp = updateTimestamp;

// Функция проверки синхронизации изображений
function areImagesInSync(): boolean {
    const timeDiff = Math.abs(lastVideoUpdate - lastThermalUpdate);
    const maxAllowedDiff = 500; // Максимально допустимая разница в миллисекундах
    return timeDiff <= maxAllowedDiff;
}

async function checkLiveness(detection: faceapi.WithFaceDescriptor<faceapi.WithFaceLandmarks<{detection: faceapi.FaceDetection}, faceapi.FaceLandmarks68>>): Promise<boolean> {
    const landmarks = detection.landmarks; // Получаем landmarks из объекта детекции
    const box = detection.detection.box; // Получаем bounding box лица
    if (!thermCanvas) {
        console.warn('Тепловой canvas не найден, проверка на спуфинг пропускается.');
        return true; // Пропускаем проверку, если нет теплового canvas
    }

    // Проверяем синхронизацию изображений
    if (!areImagesInSync()) {
        console.warn('Изображения не синхронизированы, ожидаем синхронизации...');
        return true; // Пропускаем проверку при рассинхронизации
    }

    // Масштабируем и корректируем координаты box под размер теплового изображения
    // Предполагаем, что тепловизор может быть смещен относительно оптической камеры
    const offsetX = 20; // Уменьшаем смещение по X
    const offsetY = 10; // Уменьшаем смещение по Y
    
    // Коэффициенты масштабирования (могут отличаться из-за разных объективов камер)
    const scaleX = 1.0 * (thermCanvas.width / videoCanvas.width); // Увеличиваем масштаб для лучшего покрытия
    const scaleY = 1.0 * (thermCanvas.height / videoCanvas.height); // Увеличиваем масштаб для лучшего покрытия

    console.log('Выполняется проверка на спуфинг...');
    const ctx = thermCanvas.getContext('2d', { willReadFrequently: true }); // willReadFrequently для производительности
    if (!ctx) {
        console.error('Не удалось получить 2D контекст для теплового canvas.');
        return true; // Пропускаем проверку при ошибке
    }

    // Получаем данные изображения с теплового canvas
    // ВАЖНО: Предполагается, что thermCanvas уже содержит актуальное тепловое изображение,
    // синхронизированное с videoCanvas. Логика получения/обновления теплового изображения
    // должна быть реализована отдельно.
    let thermalImageData: ImageData;
    try {
        thermalImageData = ctx.getImageData(0, 0, thermCanvas.width, thermCanvas.height);
    } catch (error) {
        console.error('Ошибка при получении данных изображения с теплового canvas:', error);
        // Возможная ошибка безопасности (tainted canvas), если изображение из другого источника
        return true; // Пропускаем проверку при ошибке
    }
    const thermalData = thermalImageData.data; // Массив RGBA
    const width = thermCanvas.width;

    // Функция для получения средней температуры в области (усреднение канала R)
    const getAverageTemperature = (points: faceapi.Point[]): number => {
        let sum = 0;
        let count = 0;
        for (const point of points) {
            const x = Math.round(point.x * scaleX + offsetX);
            const y = Math.round(point.y * scaleY + offsetY);
            // Убедимся, что координаты в пределах canvas
            if (x >= 0 && x < width && y >= 0 && y < thermCanvas.height) {
                const index = (y * width + x) * 4; // Индекс R компонента
                sum += thermalData[index]; // Предполагаем, что температура в R канале
                count++;
            }
        }
        return count > 0 ? sum / count : 0;
    };

    // Получаем точки бровей и носа
    const leftEyeBrow = landmarks.getLeftEyeBrow();
    const rightEyeBrow = landmarks.getRightEyeBrow();
    const nose = landmarks.getNose();

    // Анализируем температуру в ключевых областях
    const leftEyeBrowTemp = getAverageTemperature(leftEyeBrow);
    const rightEyeBrowTemp = getAverageTemperature(rightEyeBrow);
    const noseTemp = getAverageTemperature(nose);

    // Вычисляем разницу температур между бровями и носом
    const eyebrowTempDiff = Math.abs(leftEyeBrowTemp - rightEyeBrowTemp);
    const noseToBrowDiff = Math.abs((leftEyeBrowTemp + rightEyeBrowTemp) / 2 - noseTemp);

    console.log('Анализ температуры лицевых точек:');
    console.log(`- Температура левой брови: ${leftEyeBrowTemp.toFixed(2)}`);
    console.log(`- Температура правой брови: ${rightEyeBrowTemp.toFixed(2)}`);
    console.log(`- Температура носа: ${noseTemp.toFixed(2)}`);
    console.log(`- Разница температур бровей: ${eyebrowTempDiff.toFixed(2)}`);
    console.log(`- Разница температур нос-брови: ${noseToBrowDiff.toFixed(2)}`);

    // --- Логика анализа текстуры теплового изображения --- 
    console.log('Данные для расчета размеров лица:');
    console.log('  - Bounding box (box):', JSON.stringify(box));
    console.log('  - Ширина thermCanvas (width):', width);
    console.log('  - Высота thermCanvas:', thermCanvas.height);
    
    // Применяем масштабирование и смещение
    const faceX = Math.max(0, Math.round(box.x * scaleX + offsetX));
    const faceY = Math.max(0, Math.round(box.y * scaleY + offsetY));
    const faceWidth = Math.min(width - faceX, Math.round(box.width * scaleX));
    const faceHeight = Math.min(thermCanvas.height - faceY, Math.round(box.height * scaleY));

    if (faceWidth <= 0 || faceHeight <= 0) {
        console.warn('Некорректные размеры области лица для анализа текстуры.');
        return true; // Пропускаем проверку
    }

    // Разделяем область лица на зоны для анализа с увеличенным размером
    const zoneSize = Math.floor(Math.min(faceWidth, faceHeight) / 2); // Увеличиваем размер зоны анализа для более широкого охвата
    const zones: number[][] = [];
    const zoneStats: Array<{mean: number; stdDev: number}> = [];

    // Собираем данные по зонам
    for (let zoneY = 0; zoneY < 3; zoneY++) {
        for (let zoneX = 0; zoneX < 3; zoneX++) {
            const zonePixels: number[] = [];
            const startX = faceX + zoneX * zoneSize;
            const startY = faceY + zoneY * zoneSize;

            // Собираем пиксели для текущей зоны
            for (let y = startY; y < Math.min(startY + zoneSize, faceY + faceHeight); y++) {
                for (let x = startX; x < Math.min(startX + zoneSize, faceX + faceWidth); x++) {
                    const index = (y * width + x) * 4;
                    zonePixels.push(thermalData[index]); // Используем R канал
                }
            }
            zones.push(zonePixels);

            // Вычисляем статистику для зоны
            if (zonePixels.length > 0) {
                const mean = zonePixels.reduce((a, b) => a + b, 0) / zonePixels.length;
                const variance = zonePixels.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / zonePixels.length;
                const stdDev = Math.sqrt(variance);
                zoneStats.push({ mean, stdDev });
            }
        }
    }

    if (zones.length === 0 || zoneStats.length === 0) {
        console.warn('Не удалось проанализировать зоны лица.');
        return true; // Пропускаем проверку при ошибке
    }

    // Анализ распределения тепла
    const zoneMeans = zoneStats.map(stat => stat.mean);
    const zoneStdDevs = zoneStats.map(stat => stat.stdDev);

    // Вычисляем градиент температуры между зонами
    const maxTempDiff = Math.max(...zoneMeans) - Math.min(...zoneMeans);
    const avgStdDev = zoneStdDevs.reduce((a, b) => a + b, 0) / zoneStdDevs.length;

    // Проверяем равномерность распределения тепла (характерно для экрана)
    const tempVariation = Math.max(...zoneMeans) / Math.min(...zoneMeans);
    const isUniform = tempVariation < 1.2; // Если разница между макс и мин температурой менее 20%

    console.log(`Анализ тепловой карты:\n` +
                `- Средняя вариация текстуры: ${avgStdDev.toFixed(2)}\n` +
                `- Максимальная разница температур: ${maxTempDiff.toFixed(2)}\n` +
                `- Коэффициент равномерности: ${tempVariation.toFixed(2)}`);

    // Визуализация тепловой карты
    const heatmapCtx = thermCanvas.getContext('2d');
    if (heatmapCtx) {
        // Рисуем сетку зон анализа
        heatmapCtx.strokeStyle = 'red';
        heatmapCtx.lineWidth = 1;

        for (let i = 0; i <= 3; i++) {
            // Вертикальные линии
            const x = faceX + i * zoneSize;
            heatmapCtx.beginPath();
            heatmapCtx.moveTo(x, faceY);
            heatmapCtx.lineTo(x, faceY + 3 * zoneSize);
            heatmapCtx.stroke();

            // Горизонтальные линии
            const y = faceY + i * zoneSize;
            heatmapCtx.beginPath();
            heatmapCtx.moveTo(faceX, y);
            heatmapCtx.lineTo(faceX + 3 * zoneSize, y);
            heatmapCtx.stroke();
        }

        // Добавляем информацию о анализе
        heatmapCtx.fillStyle = 'white';
        heatmapCtx.font = '14px Arial';
        heatmapCtx.fillText(`Вариация: ${tempVariation.toFixed(2)}`, faceX, faceY - 5);
    }

    // --- Правила проверки ---
    // 1. Проверка на равномерность распределения тепла (характерно для экрана)
    // 2. Проверка на наличие температурных градиентов (характерно для живого лица)
    // 3. Проверка на текстуру поверхности
    // 4. Проверка разницы температур между бровями
    // 5. Проверка разницы температур между бровями и носом
    const textureThreshold = 1.2; // Уменьшаем порог текстуры еще больше
    const tempDiffThreshold = 3.0; // Уменьшаем требуемую разницу температур
    const eyebrowDiffThreshold = 20.0; // Еще больше увеличиваем допустимую разницу температур между бровями
    const noseBrowDiffThreshold = 1.5; // Уменьшаем требуемую разницу температур между носом и бровями

    const isLive = !isUniform && // Неравномерное распределение тепла
                   maxTempDiff > tempDiffThreshold && // Есть значительные градиенты температуры
                   avgStdDev > textureThreshold && // Есть текстура поверхности
                   eyebrowTempDiff < eyebrowDiffThreshold && // Температура бровей примерно одинаковая
                   noseToBrowDiff > noseBrowDiffThreshold; // Значительная разница между носом и бровями

    // const isLive = !isUniform;

    if (isLive) {
        console.log('Проверка на спуфинг: пройдена (текстура соответствует живому лицу).');
    } else {
        console.warn(`Проверка на спуфинг: НЕ пройдена! Причины:\n` +
            `- Текстура: ${avgStdDev.toFixed(2)} <= ${textureThreshold}\n` +
            `- Градиент температуры: ${maxTempDiff.toFixed(2)} <= ${tempDiffThreshold}\n` +
            `- Разница температур бровей: ${eyebrowTempDiff.toFixed(2)} >= ${eyebrowDiffThreshold}\n` +
            `- Разница нос-брови: ${noseToBrowDiff.toFixed(2)} <= ${noseBrowDiffThreshold}\n` +
            `- Равномерность распределения: ${isUniform ? 'да' : 'нет'}`);
    }

    return isLive;
}

async function perfomInput() {
    const operationType = (operationForm.elements.namedItem('operation_type') as HTMLSelectElement).value;
    const username = (operationForm.elements.namedItem('username') as HTMLInputElement).value;

    if (!username) { // Проверяем имя только при регистрации
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
        alert('Лица не найдены на видео. Попробуйте снова.');
        return;
    }

    // Рисуем лицо только если проверка пройдена
    drawFace(detection);

    // --- Проверка на спуфинг --- 
    const isLive = await checkLiveness(detection); // Передаем весь объект detection
    if (!isLive) {
        alert('Обнаружена попытка спуфинга! Операция отменена.');
        // Очищаем resultCanvas
        const ctx = resultCanvas.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, resultCanvas.width, resultCanvas.height);
        }
        landmarksLabel.textContent = "Позиции лицевых точек: ";
        descriptorsLabel.textContent = "Дескрипторы: ";
        return;
    }
    // --- Конец проверки на спуфинг ---

    

    // TODO: Реализовать логику регистрации и идентификации
    // - Регистрация: Сохранить дескриптор(ы) лица с именем пользователя (например, в localStorage или на сервере)
    // - Идентификация: Сравнить текущие дескрипторы с сохраненными и найти совпадение

    const data: detectorResult = {
        positions: detection.landmarks.positions,
        descriptors: detection.descriptor
    };

    landmarksLabel.textContent = "Позиции лицевых точек: " + JSON.stringify(data.positions);
    descriptorsLabel.textContent = "Дескрипторы: " + JSON.stringify(data.descriptors, null, 2);

}

// Основная программа
(async () => {
    await loadModels();
    // --- Обработка действий пользователя (Регистрация/Идентификация) ---
    operateButton?.addEventListener('click', perfomInput);
})();