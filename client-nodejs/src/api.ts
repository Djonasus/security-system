import axios from "axios";

const address = "http://localhost:8000/api/";

type MessageDTO = {
    user_name: string;
    face_vector: Float32Array;
}

type ResponseDTO = {
    error: string;
    status: string;
    message: string;
}

export async function RegVector(dto: MessageDTO) {
    console.log(JSON.stringify(dto));
    axios.post(address+"register_face", JSON.stringify(dto), {headers: {'Content-Type': 'application/json'}}).then(response => {console.log(response);}).catch(err => {console.log(err)});
}

export async function VerifyVector(dto: MessageDTO) : Promise<Boolean> {
    return true
}