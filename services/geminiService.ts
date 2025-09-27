import { Modality, Blob, LiveServerMessage } from "@google/genai";
import { User, Chat as AppChat, Message, VideoModelId } from "../types.ts";
import * as api from './apiService.ts';

// --- Gemini API Service (via secure proxy) ---

// No longer need to manage the API key or SDK on the client.
// The API key is now only used in the Netlify serverless function.
export const isApiKeySet = () => true; // Assume it's set on the server.

// This function is kept for the live conversation feature which still needs the SDK on the client.
// A full implementation would also proxy this, but it's more complex.
export const getAi = () => {
    const apiKey = prompt("Live features require API key entry for now. This will be improved in a future update.");
    if (!apiKey) {
      throw new Error("API Key is required for live features.");
    }
    return new (window as any).GoogleGenAI({ apiKey });
};


const handleProxyError = async (response: Response) => {
  let errorMessage = "An unexpected error occurred while communicating with the server.";
  try {
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
        const errorData = await response.json();
        errorMessage = errorData.error || JSON.stringify(errorData);
    } else {
        errorMessage = await response.text();
        if (!errorMessage) {
            errorMessage = `Server responded with status: ${response.status} ${response.statusText}`;
        }
    }
  } catch (e) {
    errorMessage = `Failed to parse error response. Server status: ${response.status} ${response.statusText}`;
  }
  console.error("Proxy API Error:", errorMessage);
  throw new Error(errorMessage);
};

export const mapMessagesToGemini = (messages: Message[]) => {
  const filtered = messages[messages.length - 1]?.role === "model" && !messages[messages.length - 1]?.content
    ? messages.slice(0, -1)
    : messages;

  return filtered
    .map(msg => {
      const parts: ({ text: string } | { inlineData: { mimeType: string, data: string } })[] = [];
      if (typeof msg.content === 'string') {
          parts.push({ text: msg.content });
      }
      if (msg.imageUrl && msg.role === 'user') {
          const imageUrlParts = msg.imageUrl.split(',');
          if (imageUrlParts.length === 2 && imageUrlParts[1]) {
            const header = imageUrlParts[0];
            const data = imageUrlParts[1];
            const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
            parts.push({ inlineData: { mimeType, data } });
          } else {
              console.warn("Malformed image data URI found in message history. Skipping.", msg.id);
          }
      }
      return {
          role: msg.role === 'model' ? 'model' : 'user' as 'user' | 'model',
          parts,
      };
    })
    .filter(turn => turn.parts.length > 0);
};

export const generateContentStream = async (
  contents: { role: string; parts: any[] }[],
  systemInstruction?: string
) => {
  const response = await fetch('/api/gemini-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
          action: 'generateContentStream',
          payload: { contents, systemInstruction },
      }),
  });

  if (!response.ok) {
      await handleProxyError(response);
  }

  const reader = response.body?.getReader();
  if (!reader) {
      throw new Error("Failed to get readable stream from response.");
  }
  
  const stream = new ReadableStream({
      async start(controller) {
          const decoder = new TextDecoder();
          while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              const text = decoder.decode(value);
              // Simulate the original SDK chunk structure
              controller.enqueue({ text });
          }
          controller.close();
      }
  });

  return stream;
};


export const generateImage = async (prompt: string): Promise<string> => {
  const response = await fetch('/api/gemini-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
          action: 'generateImage',
          payload: { prompt },
      }),
  });

  if (!response.ok) {
    await handleProxyError(response);
  }

  const { imageBase64 } = await response.json();
  if (!imageBase64) {
      throw new Error("Image generation failed to return data from proxy.");
  }
  return `data:image/png;base64,${imageBase64}`;
};

export interface VideoGenerationOptions {
    prompt: string;
    duration: number;
    model: VideoModelId;
    addWatermark: boolean;
}

export const generateVideo = async (options: VideoGenerationOptions, onProgress: (update: string) => void): Promise<string> => {
    const progressMessages = [
        "Warming up the video synthesizer...",
        "Conceptualizing the visual sequence...",
        "Teaching pixels to dance...",
        "Assembling the digital dream...",
        "Rendering the final frames, this can take a few minutes...",
        "Polishing the cinematic masterpiece...",
        "Almost there, adding the final touches...",
    ];
    let messageIndex = 0;
    
    onProgress(progressMessages[messageIndex++]);

    // 1. Start generation
    const startResponse = await fetch('/api/gemini-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'startVideoGeneration',
            payload: { options },
        }),
    });

    if (!startResponse.ok) {
        await handleProxyError(startResponse);
        return ""; // Should not be reached due to handleProxyError throwing
    }

    let { operation } = await startResponse.json();

    // 2. Poll for status
    while (!operation.done) {
        onProgress(progressMessages[messageIndex % progressMessages.length]);
        messageIndex++;
        
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds

        const checkResponse = await fetch('/api/gemini-proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'checkVideoGenerationStatus',
                payload: { operation },
            }),
        });

        if (!checkResponse.ok) {
            await handleProxyError(checkResponse);
            return ""; // Should not be reached
        }
        
        const checkData = await checkResponse.json();
        operation = checkData.operation;
    }

    onProgress("Video generation complete! Preparing for playback.");

    // 3. Get download link and create proxied URL
    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
        throw new Error("Video generation finished, but no download link was provided.");
    }

    const proxiedUrl = `/api/download-video?uri=${encodeURIComponent(downloadLink)}`;
    
    return proxiedUrl;
};


// --- Live Session Helpers (Audio Encoding/Decoding) ---

// From examples: https://ai.google.dev/edge/gemini/docs/web/live
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function createPcmBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  base64: string,
  ctx: AudioContext,
): Promise<AudioBuffer> {
  const data = decode(base64);
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / 1;
  const buffer = ctx.createBuffer(1, frameCount, 24000);

  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < frameCount; i++) {
    channelData[i] = dataInt16[i] / 32768.0;
  }
  return buffer;
}


// --- LocalStorage DB Service ---
class DBService {
  async updateUser(updatedUser: User): Promise<User> {
    return api.updateUser(updatedUser);
  }

  async getChats(username: string): Promise<AppChat[]> {
    return api.fetchChatsForUser(username);
  }

  async saveChats(username: string, chats: AppChat[]): Promise<void> {
    await api.saveChatsForUser(username, chats);
  }

  async createChat(username: string): Promise<AppChat> {
    const newChat: AppChat = {
      id: `chat_${Date.now()}`,
      title: "New Chat",
      messages: [],
      createdAt: Date.now(),
      model: 'gemai-1.0',
    };
    const currentChats = await this.getChats(username);
    await this.saveChats(username, [newChat, ...currentChats]);
    return newChat;
  }
}

// --- Authentication Service ---
class AuthService {
  constructor(private db: DBService) {}

  private hashPassword = (pw: string) => `hashed_${pw}`;

  async signUp(username: string, password: string): Promise<User> {
    const existingUser = await api.fetchUserByUsername(username);
    if (existingUser) {
      throw new Error("Username already exists.");
    }
    const newUser = {
      username,
      passwordHash: this.hashPassword(password),
      plan: "free" as const,
      gemCoins: 100,
      imagesGenerated: 0,
      videosGenerated: 0,
    };
    const sessionUser = await api.saveNewUser(newUser);
    this.setCurrentUser(sessionUser);
    return sessionUser;
  }

  async login(username: string, password: string): Promise<User> {
    const record = await api.fetchUserByUsername(username);
    if (!record || record.passwordHash !== this.hashPassword(password)) {
      throw new Error("Invalid username or password.");
    }
    const { passwordHash, ...user } = record;
    const checked = await this.checkPlanExpiry(user);
    this.setCurrentUser(checked);
    return checked;
  }

  logout = () => localStorage.removeItem("gemai_currentUser");

  setCurrentUser = (user: User) =>
    localStorage.setItem("gemai_currentUser", JSON.stringify(user));

  getCurrentUser = (): User | null => {
    try {
      const raw = localStorage.getItem("gemai_currentUser");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  async checkPlanExpiry(user: User): Promise<User> {
    let wasModified = false;
    const updatedUser: User = { ...user };

    if (updatedUser.plan !== "free" && updatedUser.planExpiry && Date.now() > updatedUser.planExpiry) {
      updatedUser.plan = "free";
      delete updatedUser.planExpiry;
      wasModified = true;
    }

    if (typeof updatedUser.imagesGenerated !== 'number') {
        updatedUser.imagesGenerated = 0;
        wasModified = true;
    }
     if (typeof updatedUser.videosGenerated !== 'number') {
        updatedUser.videosGenerated = 0;
        wasModified = true;
    }

    if (wasModified) {
      await this.db.updateUser(updatedUser);
      this.setCurrentUser(updatedUser);
    }
    return updatedUser;
  }
}

export const db = new DBService();
export const auth = new AuthService(db);
