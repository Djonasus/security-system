import * as faceapi from 'face-api.js';

export type detectorResult = {
    positions: faceapi.Point[] | undefined,
    descriptors: Float32Array | undefined
}