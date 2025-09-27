
import { stream } from "@netlify/functions";
import { Readable } from "stream";

// This is a Netlify serverless function that securely streams a video file.
// It uses the `stream` helper to handle the response.
export const handler = stream(async (outputStream, event) => {
    if (event.httpMethod !== 'GET') {
        outputStream.end();
        return { statusCode: 405, body: 'Method Not Allowed' };
    }
    
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        console.error("API_KEY environment variable not set.");
        outputStream.end();
        return { statusCode: 500, body: "API key is not configured on the server." };
    }

    try {
        const videoUri = event.queryStringParameters?.uri;
        if (!videoUri) {
             outputStream.end();
             return { statusCode: 400, body: "Missing 'uri' query parameter." };
        }

        const downloadUrl = `${videoUri}&key=${apiKey}`;

        // Fetch the video from the Google Cloud Storage URL
        const videoResponse = await fetch(downloadUrl);

        if (!videoResponse.ok || !videoResponse.body) {
            const errorText = await videoResponse.text();
            console.error(`Failed to fetch video from Google. Status: ${videoResponse.status}`, errorText);
            outputStream.end();
            return { statusCode: videoResponse.status, body: "Failed to download video file." };
        }

        // Set headers for the video stream
        outputStream.setHeader('Content-Type', videoResponse.headers.get('Content-Type') || 'video/mp4');
        const contentLength = videoResponse.headers.get('Content-Length');
        if (contentLength) {
            outputStream.setHeader('Content-Length', contentLength);
        }
        outputStream.setHeader('Cache-Control', 'public, max-age=86400');

        // Convert the web stream (from fetch) to a Node.js stream and pipe it to the response
        // FIX: Cast to `any` to resolve TypeScript type conflict between the web ReadableStream from fetch and Node.js Readable.fromWeb.
        await Readable.fromWeb(videoResponse.body as any).pipe(outputStream);

    } catch (error) {
        console.error("Error in download-video function:", error);
        if (!outputStream.writableEnded) {
            outputStream.end();
        }
    }
});
