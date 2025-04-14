import * as faceapi from 'face-api.js';
import { IAntiSpoofingMethod } from "./antiSpoofingMethod";

export class CheckEyeBlink implements IAntiSpoofingMethod {

    private readonly eyeThreshold = 0.2; // Порог изменения глаза
    private lastEyeStates: { left: number; right: number }[] = [];


    public check(detections: faceapi.FaceLandmarks68): boolean {

        // Получаем параметры глаз
        const leftEye = detections.positions.slice(36, 42);
        const rightEye = detections.positions.slice(42, 48);

        // Вычисляем соотношение сторон глаз
        const eyeAspectRatio = (eyePoints: faceapi.Point[]) => {
            const vertical = Math.hypot(
                eyePoints[1].x - eyePoints[5].x,
                eyePoints[1].y - eyePoints[5].y
            );
            const horizontal = Math.hypot(
                eyePoints[3].x - eyePoints[0].x,
                eyePoints[3].y - eyePoints[0].y
            );
            return vertical / horizontal;
        };

        const currentState = {
            left: eyeAspectRatio(leftEye),
            right: eyeAspectRatio(rightEye)
        };

        // Проверяем историю состояний
        this.lastEyeStates.push(currentState);
        if(this.lastEyeStates.length > 5) this.lastEyeStates.shift();

        // Определяем мигание
        const diffs = this.lastEyeStates.slice(1).map((s, i) => ({
            left: s.left - this.lastEyeStates[i].left,
            right: s.right - this.lastEyeStates[i].right
        }));

        return diffs.some(d => 
            Math.abs(d.left) > this.eyeThreshold && 
            Math.abs(d.right) > this.eyeThreshold
        );
    }
    
}