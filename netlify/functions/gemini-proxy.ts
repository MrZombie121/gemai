import { GoogleGenAI } from "@google/genai";
import { stream } from "@netlify/functions";

// This is a Netlify serverless function using the Node.js runtime.
// It is wrapped in the `stream` helper to handle both streaming and non-streaming responses.
export const handler = stream(async (outputStream, event) => {
    if (event.httpMethod !== 'POST') {
        outputStream.write(JSON.stringify({ error: "Method Not Allowed" }));
        outputStream.end();
        return { statusCode: 405 };
    }
    
    const apiKey = process.env.API_KEY;

    if (!apiKey) {
        console.error("API_KEY environment variable not set.");
        outputStream.write(JSON.stringify({ error: "API key is not configured on the server." }));
        outputStream.end();
        return { statusCode: 500, headers: { 'Content-Type': 'application/json' } };
    }
    
    const ai = new GoogleGenAI({ apiKey });
    
    try {
        if (!event.body) {
             throw new Error("Request body is empty.");
        }
        const { action, payload } = JSON.parse(event.body);

        if (action === 'generateContentStream') {
            const { contents, systemInstruction } = payload;
            
            const responseStream = await ai.models.generateContentStream({
                model: "gemini-2.5-flash",
                contents: contents,
                config: systemInstruction ? { systemInstruction } : undefined
            });

            // Set headers for streaming response
            outputStream.setHeader("Content-Type", "text/plain; charset=utf-8");
            
            for await (const chunk of responseStream) {
                const text = chunk.text;
                if (text) {
                    outputStream.write(text);
                }
            }
        } else if (action === 'generateImage') {
            const { prompt } = payload;
            const response = await ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: prompt,
                config: { numberOfImages: 1, outputMimeType: 'image/png' },
            });
            
            const imageBase64 = response.generatedImages[0]?.image.imageBytes;

            if (!imageBase64) {
                throw new Error("Image generation failed to return data.");
            }

            outputStream.setHeader('Content-Type', 'application/json');
            outputStream.write(JSON.stringify({ imageBase64 }));
        
        } else if (action === 'startVideoGeneration') {
            const { options } = payload;
            const fullPrompt = `${options.prompt}, ${options.duration} seconds long`;
            
            let operation = await ai.models.generateVideos({
                model: 'veo-2.0-generate-001',
                prompt: fullPrompt,
                config: { numberOfVideos: 1 }
            });

            outputStream.setHeader('Content-Type', 'application/json');
            outputStream.write(JSON.stringify({ operation }));

        } else if (action === 'checkVideoGenerationStatus') {
            const { operation } = payload;
            const updatedOperation = await ai.operations.getVideosOperation({ operation });
            
            outputStream.setHeader('Content-Type', 'application/json');
            outputStream.write(JSON.stringify({ operation: updatedOperation }));
        
        } else {
            throw new Error(`Invalid action: ${action}`);
        }

    } catch (error) {
        console.error("Error in gemini-proxy function:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
        // Ensure we send a JSON error response if possible
        if (!outputStream.writableEnded) {
            outputStream.setHeader('Content-Type', 'application/json');
            outputStream.write(JSON.stringify({ error: errorMessage }));
        }
    } finally {
        if (!outputStream.writableEnded) {
            outputStream.end();
        }
    }
});
