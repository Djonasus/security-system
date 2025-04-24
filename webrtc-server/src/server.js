const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const mediasoup = require('mediasoup');
const { config } = require('./config');

class MediaSoupManager {
    constructor() {
        this.worker = null;
        this.router = null;
        this.transports = new Map();
        this.producers = new Map();
        this.consumers = new Map();
    }

    async init() {
        this.worker = await mediasoup.createWorker({
            rtcMinPort: config.mediasoup.worker.rtcMinPort,
            rtcMaxPort: config.mediasoup.worker.rtcMaxPort,
            logLevel: 'warn'
        });
        this.router = await this.worker.createRouter({
            mediaCodecs: config.mediasoup.router.mediaCodecs
        });
        console.log('Mediasoup worker и router инициализированы');
    }

    getRouterRtpCapabilities() {
        if (!this.router) throw new Error('Router не инициализирован');
        return this.router.rtpCapabilities;
    }

    async createWebRtcTransport() {
        if (!this.router) throw new Error('Router не инициализирован');
        const transport = await this.router.createWebRtcTransport({
            listenIps: [{ ip: '0.0.0.0', announcedIp: '127.0.0.1' }],
            enableUdp: true,
            enableTcp: true,
            preferUdp: true
        });
        this.transports.set(transport.id, transport);
        transport.on('close', () => this.transports.delete(transport.id));
        return transport;
    }

    async connectTransport(transportId, dtlsParameters) {
        const transport = this.transports.get(transportId);
        if (!transport) throw new Error('Transport не найден');
        await transport.connect({ dtlsParameters });
    }

    async createProducer(transportId, rtpParameters, kind) {
        const transport = this.transports.get(transportId);
        if (!transport) throw new Error('Transport не найден');
        const producer = await transport.produce({ kind, rtpParameters });
        this.producers.set(producer.id, producer);
        producer.on('close', () => this.producers.delete(producer.id));
        return producer;
    }

    async createConsumer(transportId, producerId, rtpCapabilities) {
        const transport = this.transports.get(transportId);
        const producer = this.producers.get(producerId);
        if (!transport || !producer) throw new Error('Transport или Producer не найден');
        if (!this.router.canConsume({ producerId: producer.id, rtpCapabilities })) {
            throw new Error('Невозможно потреблять поток');
        }
        const consumer = await transport.consume({
            producerId: producer.id,
            rtpCapabilities
        });
        this.consumers.set(consumer.id, consumer);
        consumer.on('close', () => this.consumers.delete(consumer.id));
        return consumer;
    }
}

// --- Инициализация сервера ---
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const mediasoupManager = new MediaSoupManager();

wss.on('connection', (ws) => {
    ws.on('message', async (msg) => {
        let data;
        try {
            data = JSON.parse(msg);
        } catch {
            ws.send(JSON.stringify({ type: 'error', data: { message: 'Некорректный JSON' } }));
            return;
        }

        try {
            switch (data.type) {
                case 'getRouterRtpCapabilities':
                    ws.send(JSON.stringify({
                        type: 'routerRtpCapabilities',
                        data: mediasoupManager.getRouterRtpCapabilities()
                    }));
                    break;
                case 'createWebRtcTransport': {
                    const transport = await mediasoupManager.createWebRtcTransport();
                    ws.send(JSON.stringify({
                        type: 'webRtcTransportCreated',
                        data: {
                            id: transport.id,
                            iceParameters: transport.iceParameters,
                            iceCandidates: transport.iceCandidates,
                            dtlsParameters: transport.dtlsParameters
                        }
                    }));
                    break;
                }
                case 'connectTransport':
                    await mediasoupManager.connectTransport(data.transportId, data.dtlsParameters);
                    ws.send(JSON.stringify({ type: 'transportConnected' }));
                    break;
                case 'produce': {
                    const producer = await mediasoupManager.createProducer(
                        data.transportId,
                        data.rtpParameters,
                        data.kind
                    );
                    ws.send(JSON.stringify({ type: 'produced', data: { id: producer.id } }));
                    break;
                }
                case 'consume': {
                    const consumer = await mediasoupManager.createConsumer(
                        data.transportId,
                        data.producerId,
                        data.rtpCapabilities
                    );
                    ws.send(JSON.stringify({
                        type: 'consumed',
                        data: {
                            id: consumer.id,
                            producerId: consumer.producerId,
                            kind: consumer.kind,
                            rtpParameters: consumer.rtpParameters
                        }
                    }));
                    break;
                }
                default:
                    ws.send(JSON.stringify({ type: 'error', data: { message: 'Неизвестный тип сообщения' } }));
            }
        } catch (err) {
            ws.send(JSON.stringify({ type: 'error', data: { message: err.message } }));
        }
    });

    ws.on('close', () => {
        // Здесь можно добавить очистку ресурсов, если нужно
    });
});

// Запуск сервера
(async () => {
    await mediasoupManager.init();
    server.listen(config.server.port, () => {
        console.log(`WebRTC сервер запущен на порту ${config.server.port}`);
    });
})();