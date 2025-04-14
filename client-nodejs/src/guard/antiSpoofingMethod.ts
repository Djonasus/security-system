// В этом файле, как и в директории в целом, находятся реализации защиты от спуфинга.

import * as faceapi from 'face-api.js';

// Интерфейс, декларирующий структуру защиты. Он гарантирует совместимость между методами защиты от спуфинга.
export interface IAntiSpoofingMethod {
    check(detections: faceapi.FaceLandmarks68): boolean;
}