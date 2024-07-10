import axios from "axios";
import fs from "fs";
import {keys} from "../keys";
export async function transcribeAudio(audioPath: string) {
    const audioBase64 = fs.readFileSync(audioPath, {encoding: 'base64'});
    try {
        const response = await axios.post(`https://${keys.openaiProxy}/v1/audio/transcriptions`, {
            audio: audioBase64,
        }, {
            headers: {
                'Authorization': `Bearer ${keys.openai}`,  // Replace YOUR_API_KEY with your actual OpenAI API key
                'Content-Type': 'application/json'
            },
        });
        return response.data;
    } catch (error) {
        console.error("Error in transcribeAudio:", error);
        return null; // or handle error differently
    }
}

let audioContext: AudioContext;

export async function startAudio() {
    audioContext = new AudioContext();
}

export async function textToSpeech(text: string) {
    console.log(`Text to speech: ${text}`);
    if (!audioContext) {
        await startAudio();
    }
    try {
        const response = await axios.post(`https://${keys.openaiProxy}/v1/audio/speech`, {
            input: text,    // Use 'input' instead of 'text'
            voice: "nova",
            model: "tts-1",
        }, {
            headers: {
                'Authorization': `Bearer ${keys.openai}`,  // Replace YOUR_API_KEY with your actual OpenAI API key
                'Content-Type': 'application/json'
            },
            responseType: 'arraybuffer'  // This will handle the binary data correctly
        });
        console.log('Audio data:', response.data);

        // Decode the audio data asynchronously
        const audioBuffer = await audioContext.decodeAudioData(response.data);

        // Create an audio source
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start();  // Play the audio immediately

        return response.data;
    } catch (error) {
        console.error("Error in textToSpeech:", error);
        return null; // or handle error differently
    }
}

// Function to convert image to base64
function imageToBase64(path: string) {
    const image = fs.readFileSync(path, {encoding: 'base64'});
    return `data:image/jpeg;base64,${image}`; // Adjust the MIME type if necessary (e.g., image/png)
}

export async function describeImage(imagePath: string) {
    const imageBase64 = imageToBase64(imagePath);
    try {
        const response = await axios.post(`https://${keys.openaiProxy}/v1/images/descriptions`, {
            image: imageBase64,
        }, {
            headers: {
                'Authorization': `Bearer ${keys.openai}`,  // Replace YOUR_API_KEY with your actual OpenAI API key
                'Content-Type': 'application/json'
            },
        });
        return response.data;
    } catch (error) {
        console.error("Error in describeImage:", error);
        return null; // or handle error differently
    }
}

export async function gptRequest(systemPrompt: string, userPrompt: string) {
    try {
        const response = await axios.post(`https://${keys.openaiProxy}/v1/chat/completions`, {
            model: "gpt-4o",
            messages: [
                {role: "system", content: systemPrompt},
                {role: "user", content: userPrompt},
            ],
        }, {
            headers: {
                'Authorization': `Bearer ${keys.openai}`,  // Replace YOUR_API_KEY with your actual OpenAI API key
                'Content-Type': 'application/json'
            },
        });
        return response.data.choices[0].message.content;
    } catch (error) {
        console.error("Error in gptRequest:", error);
        return null; // or handle error differently
    }
}


textToSpeech("Hello I am an agent")