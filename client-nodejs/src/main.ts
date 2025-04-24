import * as faceapi from 'face-api.js';

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
    await faceapi.nets.tinyFaceDetector.loadFromUri(`/weights`);
    await faceapi.nets.faceLandmark68TinyNet.loadFromUri('/weights');
    await faceapi.nets.faceRecognitionNet.loadFromUri('/weights');
    console.log('Модели face-api.js успешно загружены!');
    
    // startFaceDetection(); // Убираем автозапуск
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
  // Копируем изображение с videoCanvas на resultCanvas
  const ctx = resultCanvas.getContext('2d');
  if (ctx) {
    ctx.drawImage(videoCanvas, 0, 0, resultCanvas.width, resultCanvas.height);
  }
  const detections = await faceapi
    .detectAllFaces(videoCanvas, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks(true)
    .withFaceDescriptors();
  if (detections.length > 0) {
    // Корректируем координаты под размер resultCanvas
    const displaySize = { width: resultCanvas.width, height: resultCanvas.height };
    const resizedDetections = faceapi.resizeResults(detections, displaySize);
    faceapi.draw.drawFaceLandmarks(resultCanvas, resizedDetections);
    resizedDetections.forEach(result => {
      const box = result.detection.box;
      const text = [`Лицо обнаружено`];
      new faceapi.draw.DrawTextField(text, box.bottomLeft).draw(resultCanvas);
    });
  }
}

async function perfomInput() {
    const operationType = (operationForm.elements.namedItem('operation_type') as HTMLSelectElement).value;
    const username = (operationForm.elements.namedItem('username') as HTMLInputElement).value;

    if (!username && operationType === 'registration') {
        alert('Пожалуйста, введите имя пользователя для регистрации.');
        return;
    }

    console.log(`Выполняется операция: ${operationType}, Пользователь: ${username || 'N/A'}`);

    // Получаем текущие дескрипторы лиц с видео
    const detections = await faceapi
        .detectAllFaces(videoCanvas, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks(true)
        .withFaceDescriptors();

    if (detections.length === 0) {
        alert('Лица не найдены на видео. Попробуйте снова.');
        return;
    }

    // TODO: Реализовать логику регистрации и идентификации
    // - Регистрация: Сохранить дескриптор(ы) лица с именем пользователя (например, в localStorage или на сервере)
    // - Идентификация: Сравнить текущие дескрипторы с сохраненными и найти совпадение

    // alert(`Операция '${operationType}' для пользователя '${username || 'идентификация'}' еще не реализована.`);

    detectFaces();
}

// Основная программа
(async () => {
    await loadModels();
    // --- Обработка действий пользователя (Регистрация/Идентификация) ---
    operateButton?.addEventListener('click', perfomInput);
  // startFaceDetection();
})();