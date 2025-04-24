import * as faceapi from 'face-api.js';

// --- Конфигурация --- 
const MODEL_URL = '/weights'; // Путь к папке с моделями face-api.js
const detectionInterval = 100; // Интервал обнаружения лиц (в миллисекундах)

// --- Получение элементов DOM ---
const videoCanvas = document.getElementById('visCanvas') as HTMLCanvasElement;
const resultCanvas = document.getElementById('visCanvas__result') as HTMLCanvasElement;
const operationForm = document.forms.namedItem('operation_form') as HTMLFormElement;
const operateButton = document.getElementById('operateButton') as HTMLButtonElement;

if (!videoCanvas || !resultCanvas || !operationForm || !operateButton) {
  console.error('Не удалось найти необходимые элементы DOM!');
  alert('Ошибка: не найдены необходимые элементы интерфейса.');
  throw new Error('Критическая ошибка: элементы DOM не найдены');
}

// Инициализация размеров canvas
videoCanvas.width = 640;
videoCanvas.height = 480;
resultCanvas.width = videoCanvas.width;
resultCanvas.height = videoCanvas.height;

// --- Инициализация face-api.js ---
async function loadModels() {
  console.log('Начинаем загрузку моделей face-api.js...');
  try {
    console.log('Загрузка TinyFaceDetector...');
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    console.log('TinyFaceDetector загружен успешно');

    console.log('Загрузка FaceLandmark68TinyNet...');
    await faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL);
    console.log('FaceLandmark68TinyNet загружен успешно');

    console.log('Загрузка FaceRecognitionNet...');
    await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
    console.log('FaceRecognitionNet загружен успешно');

    console.log('Все модели успешно загружены!');
    startFaceDetection();
  } catch (error) {
    console.error('Ошибка при загрузке моделей:', error);
    alert('Не удалось загрузить необходимые модели. Проверьте консоль для деталей.');
  }
}

// --- Обнаружение лиц ---
async function detectFaces() {
  if (!videoCanvas || !resultCanvas) {
    console.log('detectFaces: videoCanvas или resultCanvas не определены');
    return;
  }
  console.log('detectFaces: вызов начат');
  console.log('videoCanvas.width/height:', videoCanvas.width, videoCanvas.height);
  console.log('resultCanvas.width/height:', resultCanvas.width, resultCanvas.height);
  const ctx_ok = resultCanvas.getContext('2d');
  if (!ctx_ok) {
    console.log('detectFaces: не удалось получить 2D контекст resultCanvas');
  } else {
    console.log('detectFaces: 2D контекст resultCanvas получен');
  }
  const detections = await faceapi
    .detectAllFaces(videoCanvas, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks(true)
    .withFaceDescriptors();
  console.log('detectFaces: detections.length =', detections.length);

  // Подгоняем размер resultCanvas под videoCanvas
  const displaySize = { width: videoCanvas.width, height: videoCanvas.height };
  faceapi.matchDimensions(resultCanvas, displaySize);

  // Очищаем предыдущие результаты
  const ctx = resultCanvas.getContext('2d');
  if (ctx) {
      ctx.clearRect(0, 0, resultCanvas.width, resultCanvas.height);
  }

  // Рисуем результаты
  if (detections.length > 0) {
    const resizedDetections = faceapi.resizeResults(detections, displaySize);

    // Рисуем рамки обнаружения
    faceapi.draw.drawDetections(resultCanvas, resizedDetections);
    // Рисуем точки лица
    faceapi.draw.drawFaceLandmarks(resultCanvas, resizedDetections);

    // Добавляем информацию о количестве обнаруженных лиц
    resizedDetections.forEach(result => {
      const box = result.detection.box;
      const text = [`Лицо обнаружено`];
      new faceapi.draw.DrawTextField(text, box.bottomLeft).draw(resultCanvas);
    });
  }
}

// --- Запуск обнаружения ---
function startFaceDetection() {
  console.log('Запуск обнаружения лиц...');
  if (!videoCanvas || !resultCanvas) {
    console.error('Canvas элементы не инициализированы!');
    return;
  }

  // Проверяем, что контексты canvas доступны
  const videoCtx = videoCanvas.getContext('2d');
  const resultCtx = resultCanvas.getContext('2d');
  
  if (!videoCtx || !resultCtx) {
    console.error('Не удалось получить 2D контекст для canvas элементов!');
    return;
  }

  // Добавляем небольшую задержку перед запуском детектора
  setTimeout(() => {
    console.log('Начинаем обнаружение лиц...');
    setInterval(detectFaces, detectionInterval);
  }, 1000); // Задержка 1 секунда
}

// --- Обработка действий пользователя (Регистрация/Идентификация) ---
operateButton?.addEventListener('click', async () => {
    const operationType = (operationForm.elements.namedItem('operation_type') as HTMLSelectElement).value;
    const username = (operationForm.elements.namedItem('username') as HTMLInputElement).value;

    if (!username && operationType === 'registration') {
        alert('Пожалуйста, введите имя пользователя для регистрации.');
        return;
    }

    console.log(`Выполняется операция: ${operationType}, Пользователь: ${username || 'N/A'}`);

    // Получаем текущие дескрипторы лиц с видео
    const detections = await faceapi
        .detectAllFaces(videoCanvas, new faceapi.SsdMobilenetv1Options())
        .withFaceLandmarks()
        .withFaceDescriptors();

    if (detections.length === 0) {
        alert('Лица не найдены на видео. Попробуйте снова.');
        return;
    }

    // TODO: Реализовать логику регистрации и идентификации
    // - Регистрация: Сохранить дескриптор(ы) лица с именем пользователя (например, в localStorage или на сервере)
    // - Идентификация: Сравнить текущие дескрипторы с сохраненными и найти совпадение

    alert(`Операция '${operationType}' для пользователя '${username || 'идентификация'}' еще не реализована.`);

});

// --- Старт --- 
document.addEventListener('DOMContentLoaded', () => {
  // Ждем инициализации JSMpeg плеера
  const checkVideoReady = setInterval(() => {
    const videoCtx = videoCanvas.getContext('2d');
    if (videoCtx) {
      clearInterval(checkVideoReady);
      console.log('Видеопоток инициализирован, запускаем face-api.js...');
      loadModels();
    }
  }, 100); // Проверяем каждые 100мс
});