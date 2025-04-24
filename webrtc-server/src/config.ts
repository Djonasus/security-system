export const config = {
    rtsp: {
        majorStream: 'rtsp://192.168.1.18:554/1/h264major',
        minorStream: 'rtsp://192.168.1.18:554/1/h264minor'
    },
    mediasoup: {
        worker: {
            rtcMinPort: 40000,
            rtcMaxPort: 49999,
        },
        router: {
            mediaCodecs: [
                {
                    kind: 'video',
                    mimeType: 'video/VP8',
                    clockRate: 90000,
                    parameters: {}
                }
            ]
        }
    },
    server: {
        port: 4000
    }
};