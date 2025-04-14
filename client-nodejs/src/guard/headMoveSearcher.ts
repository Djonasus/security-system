import { FaceLandmarks68 } from "face-api.js";
import { IAntiSpoofingMethod } from "./antiSpoofingMethod";

export class HeadMoveSearcher implements IAntiSpoofingMethod {
    public check(detections: FaceLandmarks68): boolean {
        
    }
}