import {KnownModel} from "../modules/ollama";
import {gptRequest} from "../modules/openai";
import axios from "axios";
import {keys} from "../keys";

function uint8ArrayToBase64(uint8Array: Uint8Array) {
    // 将 Uint8Array 转换为字符串
    // @ts-ignore
    const binaryString = String.fromCharCode.apply(null, uint8Array);
    // 使用 btoa() 方法将字符串编码为 Base64
    return btoa(binaryString);
}

export async function imageDescription(src: Uint8Array, model: KnownModel = 'moondream:1.8b-v2-fp16'): Promise<string> {
    console.log('Image description', src.length)
    const payload = {
        model: 'gpt-4o',
        messages: [
            {
                role: 'system',
                content: 'You are a very advanced model and your task is to describe the image as precisely as possible. Transcribe any text you see.'
            },
            {
                role: 'user',
                content: [
                    {
                        "type": "text",
                        "text": 'Describe the scene'
                    },
                    {
                        type: "image_url",
                        image_url: {
                            "url": `data:image/jpeg;base64,${uint8ArrayToBase64(src)}`
                        }
                    }
                ]
            },
        ],
        max_tokens: 1500,
    };
    const response = await axios.post(`https://${keys.openaiProxy}/v1/chat/completions`, payload, {
        headers: {
            "Authorization": `Bearer ${keys.openai}`,
            "Content-Type": "application/json",
        },
    });
    const text = response.data.choices[0].message.content;
    if (text.includes('Sorry, there is no text in the image.')) {
        return 'Sorry, I cannot describe the image as precisely as possible. Please provide a clearer image or try again later.';
    } else {
        return text;
    }
}

export async function llamaFind(question: string, images: string): Promise<string> {
    return gptRequest(
             `
                You are a smart AI that need to read through description of a images and answer user's questions.

                This are the provided images:
                ${images}

                DO NOT mention the images, scenes or descriptions in your answer, just answer the question.
                DO NOT try to generalize or provide possible scenarios.
                ONLY use the information in the description of the images to answer the question.
                BE concise and specific.
            `
        ,
            question
    );
}

export async function openAIFind(question: string, images: string): Promise<string> {
    return gptRequest(
             `
                You are a smart AI that need to read through description of a images and answer user's questions.

                This are the provided images:
                ${images}

                DO NOT mention the images, scenes or descriptions in your answer, just answer the question.
                DO NOT try to generalize or provide possible scenarios.
                ONLY use the information in the description of the images to answer the question.
                BE concise and specific.
            `
        ,
            question
    );
}