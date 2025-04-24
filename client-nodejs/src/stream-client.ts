import { detectorResult } from './models/detector-result';

export class StreamClient {
    private visCanvas: HTMLCanvasElement;
    private thermCanvas: HTMLCanvasElement;
    private wsVisual: WebSocket;
    private wsThermal: WebSocket;

    constructor() {
        this.visCanvas = document.getElementById("visCanvas") as HTMLCanvasElement;
        this.thermCanvas = document.getElementById("thermCanvas") as HTMLCanvasElement;

        if (!this.visCanvas || !this.thermCanvas) {
            throw new Error('Не удалось найти элементы canvas');
        }

        // Инициализация WebSocket соединений
        this.wsVisual = new WebSocket('ws://localhost:4000/major');
        this.wsThermal = new WebSocket('ws://localhost:4000/minor');

        this.setupWebSocketHandlers();
    }

    private setupWebSocketHandlers() {
        // Обработчики для визуального потока
        this.wsVisual.onmessage = (event) => {
            this.drawFrame(event.data, this.visCanvas);
        };

        this.wsVisual.onerror = (error) => {
            console.error('Ошибка WebSocket (визуальный поток):', error);
        };

        // Обработчики для теплового потока
        this.wsThermal.onmessage = (event) => {
            this.drawFrame(event.data, this.thermCanvas);
        };

        this.wsThermal.onerror = (error) => {
            console.error('Ошибка WebSocket (тепловой поток):', error);
        };
    }

    private drawFrame(frame: Blob, canvas: HTMLCanvasElement) {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const url = URL.createObjectURL(frame);
        const img = new Image();
        
        img.onload = () => {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(url);
        };
        
        img.src = url;
    }

    public disconnect() {
        if (this.wsVisual) this.wsVisual.close();
        if (this.wsThermal) this.wsThermal.close();
    }
}