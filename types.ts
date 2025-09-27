export type MessageRole = 'user' | 'model';

export type ModelId = 'gemai-1.0' | 'gemai-1.0-omni' | 'gemai-pro-omni';

export type VideoModelId = 'veo-2.0-generate-001';

export type ConversationMode = 'text' | 'audio' | 'video';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  imageUrl?: string; // Can be a base64 data URL for uploads or generated images
  videoUrl?: string; // For generated videos
  feedback?: 'liked' | 'disliked';
  type?: 'text' | 'live';
}

export type Plan = 'free' | 'plus' | 'pro';

export interface User {
  username: string;
  plan: Plan;
  planExpiry?: number; // timestamp
  gemCoins: number;
  imagesGenerated?: number;
  videosGenerated?: number;
}

export interface Chat {
    id: string;
    title: string;
    messages: Message[];
    createdAt: number;
    model: ModelId;
}