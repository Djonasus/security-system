// В этом файле мы реализуем логику отправки данных на сервер


import axios from "axios";

const address = "http://localhost:8000/api/";

// Объект, в который будут завернуты дескрипторы и имя пользователя
type MessageDTO = {
    user_name: string;
    face_vector: number[];  // Используем number[] вместо Float32Array
}

// Функция регистрации нового пользователя
export async function RegVector(dto: MessageDTO) {
    try {
        const response = await axios.post(address + "register_face", dto, {
            headers: { 'Content-Type': 'application/json' }
        });
        console.log(response.data);
    } catch (err: Error | any) {
        console.error("Ошибка при регистрации:", err.response?.data || err.message);
    }
}

// Функция проверки авторизации пользователя
export async function VerifyVector(dto: MessageDTO): Promise<boolean> {
    try {
        // Отправляем данные на сервер
        const response = await axios.post(address + "verify_face", dto, {
            headers: { 'Content-Type': 'application/json' }
        });
        return response.data.status === "success";  // Предположим, что сервер возвращает статус
    } catch (err: Error | any) {
        console.error("Ошибка при проверке:", err.response?.data || err.message);
        return false;
    }
}