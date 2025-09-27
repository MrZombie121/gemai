import React, { useState, useRef, useEffect } from 'react';
import { SendIcon, PaperclipIcon, XCircleIcon, ChatBubbleLeftRightIcon, MicrophoneIcon, VideoCameraIcon, PhoneIcon, PhoneXMarkIcon, VideoIcon } from './Icons.tsx';
import { ConversationMode } from '../types.ts';

interface ChatInputProps {
  onSendMessage: (text: string, imageFile: File | null) => void;
  isLoading: boolean;
  conversationMode: ConversationMode;
  onConversationModeChange: (mode: ConversationMode) => void;
  liveSessionStatus: 'disconnected' | 'connecting' | 'connected';
  onStartConversation: () => void;
  onStopConversation: () => void;
  onOpenVideoModal: () => void;
}

const ChatInput: React.FC<ChatInputProps> = ({ 
    onSendMessage, 
    isLoading,
    conversationMode,
    onConversationModeChange,
    liveSessionStatus,
    onStartConversation,
    onStopConversation,
    onOpenVideoModal
}) => {
  const [text, setText] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [text]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
        setImageFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
      setImageFile(null);
      setImagePreview(null);
      if(fileInputRef.current) {
          fileInputRef.current.value = '';
      }
  };

  const doSubmit = () => {
    if ((text.trim() || imageFile) && !isLoading) {
      onSendMessage(text, imageFile);
      setText('');
      removeImage();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (conversationMode === 'text') {
        doSubmit();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && conversationMode === 'text') {
      e.preventDefault();
      doSubmit();
    }
  };

  const isLiveMode = conversationMode === 'audio' || conversationMode === 'video';
  const isCallActive = isLiveMode && (liveSessionStatus === 'connecting' || liveSessionStatus === 'connected');

  return (
    <div className="max-w-4xl mx-auto w-full">
        {imagePreview && (
          <div className="relative w-24 h-24 mb-2 rounded-lg overflow-hidden border-2 border-[color:var(--border-color)]">
              <img src={imagePreview} alt="Selected preview" className="w-full h-full object-cover" />
              <button onClick={removeImage} className="absolute top-1 right-1 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors">
                  <XCircleIcon />
              </button>
          </div>
        )}
        <div className="relative flex items-end bg-[color:var(--bg-secondary)] border border-[color:var(--border-color)] rounded-2xl p-1 transition-all focus-within:border-[color:var(--accent-blue)] focus-within:shadow-[0_0_15px_rgba(58,134,255,0.3)]">
             <div className="flex items-center pl-2">
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleImageChange}
                    accept="image/png, image/jpeg, image/webp" 
                    className="hidden" 
                />
                <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()} 
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                    aria-label="Attach image"
                    disabled={isLoading || isLiveMode}
                >
                    <PaperclipIcon />
                </button>
                 <button 
                    onClick={onOpenVideoModal}
                    className='p-2 text-gray-400 hover:text-white transition-colors'
                    aria-label="Generate Video"
                    disabled={isLoading || isLiveMode}
                    >
                    <VideoIcon className="w-6 h-6" />
                </button>
            </div>
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                  isCallActive ? `Live ${conversationMode} call in progress...`
                  : isLiveMode ? `Press the call button to start a ${conversationMode} chat`
                  : "Message GemAI..."
              }
              rows={1}
              className="bg-transparent w-full resize-none p-2 outline-none text-gray-100 placeholder-gray-400 max-h-48"
              disabled={isLoading || isLiveMode}
            />
            {isLiveMode ? (
                 <div className="flex items-center">
                    {isCallActive ? (
                        <button
                            type="button"
                            onClick={onStopConversation}
                            className="bg-red-600 text-white rounded-xl p-3 ml-2 flex-shrink-0 hover:bg-red-700 transition-colors animate-pulse"
                            aria-label="End call"
                        >
                            <PhoneXMarkIcon className="w-5 h-5"/>
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={onStartConversation}
                            className="bg-green-600 text-white rounded-xl p-3 ml-2 flex-shrink-0 hover:bg-green-700 transition-colors"
                            aria-label={`Start ${conversationMode} call`}
                        >
                            <PhoneIcon className="w-5 h-5"/>
                        </button>
                    )}
                </div>
            ) : (
                 <button
                    type="submit"
                    onClick={handleSubmit}
                    disabled={isLoading || (!text.trim() && !imageFile)}
                    className="bg-[color:var(--accent-blue)] text-white rounded-xl p-3 ml-2 flex-shrink-0 disabled:bg-gray-600 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
                    aria-label="Send message"
                    >
                    <SendIcon />
                </button>
            )}
        </div>
        <div className="flex justify-center items-center gap-2 mt-3 p-1 bg-[color:var(--bg-secondary)] rounded-full w-fit mx-auto border border-[color:var(--border-color)]">
            <button 
                onClick={() => onConversationModeChange('text')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs transition-colors ${conversationMode === 'text' ? 'bg-[color:var(--accent-blue)] text-white' : 'text-gray-300 hover:bg-[color:var(--bg-tertiary)]'}`}>
                <ChatBubbleLeftRightIcon className="w-4 h-4" /> Text
            </button>
             <button 
                onClick={() => onConversationModeChange('audio')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs transition-colors ${conversationMode === 'audio' ? 'bg-[color:var(--accent-blue)] text-white' : 'text-gray-300 hover:bg-[color:var(--bg-tertiary)]'}`}>
                <MicrophoneIcon className="w-4 h-4" /> Audio
            </button>
             <button 
                onClick={() => onConversationModeChange('video')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs transition-colors ${conversationMode === 'video' ? 'bg-[color:var(--accent-blue)] text-white' : 'text-gray-300 hover:bg-[color:var(--bg-tertiary)]'}`}>
                <VideoCameraIcon className="w-4 h-4" /> Video Call
            </button>
        </div>
    </div>
  );
};

export default ChatInput;