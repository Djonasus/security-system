import axios from "axios";

const address = "http://localhost:8000/api/";

type MessageDTO = {
    user_name: string;
    face_vector: number[];  // Используем number[] вместо Float32Array
}

// type ResponseDTO = {
//     error: string;
//     status: string;
//     message: string;
// }

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

export async function VerifyVector(dto: MessageDTO): Promise<boolean> {
    try {
        const response = await axios.post(address + "verify_face", dto, {
            headers: { 'Content-Type': 'application/json' }
        });
        return response.data.status === "success";  // Предположим, что сервер возвращает статус
    } catch (err: Error | any) {
        console.error("Ошибка при проверке:", err.response?.data || err.message);
        return false;
    }
}