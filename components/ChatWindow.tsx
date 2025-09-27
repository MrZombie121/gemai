
import React, { useEffect, useRef } from 'react';
import { Message as MessageType } from '../types.ts';
import Message from './Message.tsx';

interface ChatWindowProps {
  messages: MessageType[];
  isLoading: boolean;
  onRegenerate: () => void;
  onFeedback: (messageId: string, feedback: 'liked' | 'disliked') => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ messages, isLoading, onRegenerate, onFeedback }) => {
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const AuroraBackground = () => (
    <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-purple-600/20 rounded-full filter blur-3xl animate-blob opacity-40"></div>
        <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-cyan-600/20 rounded-full filter blur-3xl animate-blob animation-delay-4000 opacity-40"></div>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto relative">
      <AuroraBackground />
      <div className="p-6 space-y-2">
        <div className="max-w-4xl mx-auto w-full">
            {messages.map((msg, index) => (
                <Message 
                    key={msg.id} 
                    message={msg} 
                    isStreaming={isLoading && index === messages.length - 1 && !msg.videoUrl && !msg.imageUrl}
                    isLastMessage={index === messages.length - 1}
                    isLoading={isLoading}
                    onRegenerate={onRegenerate}
                    onFeedback={onFeedback}
                />
            ))}
            <div ref={endOfMessagesRef} />
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
