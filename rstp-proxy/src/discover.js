// discover.js
const Onvif = require('node-onvif');

(async () => {
  try {
    // Инициализируем устройство с вашим ONVIF‑URL
    const device = new Onvif.OnvifDevice({
      xaddr: 'http://192.168.1.18:8999/onvif/device_service',
      user : process.env.ONVIF_USER || 'admin',
      pass : process.env.ONVIF_PASS || 'admin',
    });

    // Подключаемся и вытаскиваем информацию о потоках
    await device.init();

    console.log(device);
    

    // const profiles = device.getProfiles();
    // Обычно первый профиль – китайальный канал 1
    // const profileToken = profiles[0].token;

    // // Запросим URI для этого профиля по RTSP/TCP
    // const res = await device.getStreamUri({
    //   protocol : 'RTSP',
    //   profileToken,
    // });

    // console.log('RTSP‑URL камеры:', res.uri);
  } catch (err) {
    console.error('Ошибка при получении RTSP‑URI:', err);
  }
})();
