import React from 'react';
import { Message as MessageType } from '../types.ts';
import { UserIcon, GemAIIcon, ThumbsUpIcon, ThumbsDownIcon, RefreshIcon } from './Icons.tsx';
import MarkdownRenderer from './MarkdownRenderer.tsx';

interface MessageProps {
  message: MessageType;
  isStreaming: boolean;
  isLastMessage: boolean;
  isLoading: boolean;
  onRegenerate: () => void;
  onFeedback: (messageId: string, feedback: 'liked' | 'disliked') => void;
}

const Message: React.FC<MessageProps> = ({ message, isStreaming, isLastMessage, isLoading, onRegenerate, onFeedback }) => {
  const { role, content, imageUrl, videoUrl, type } = message;
  const isModel = role === 'model';
  const isLive = type === 'live';

  const containerClasses = `flex items-start gap-4 my-2`;

  const icon = isModel ? (
    <div className={`w-9 h-9 flex-shrink-0 bg-gradient-to-tr from-purple-500 to-blue-500 rounded-full flex items-center justify-center shadow-lg mt-1 relative ${isStreaming ? 'animate-pulse' : ''}`}>
      <GemAIIcon className="w-5 h-5 text-white" />
    </div>
  ) : (
     isLive ? (
        <div className="w-9 h-9 flex-shrink-0 bg-gray-600 rounded-full flex items-center justify-center shadow-md mt-1 relative">
            <UserIcon className="w-5 h-5 text-gray-200" />
            <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-red-500 border-2 border-[color:var(--bg-tertiary)] animate-pulse"></span>
        </div>
     ) : (
        <div className="w-9 h-9 flex-shrink-0 bg-gray-600 rounded-full flex items-center justify-center shadow-md mt-1">
            <UserIcon className="w-5 h-5 text-gray-200" />
        </div>
     )
  );

  const messageBubbleClasses = `
    p-4 rounded-2xl max-w-full prose prose-invert prose-p:my-2 prose-pre:bg-gray-900/70 prose-pre:p-4 prose-pre:rounded-lg
    ${isModel ? 'bg-gradient-to-br from-[#1B263B]/80 to-[#2A354A]/60 rounded-tl-lg' : 'bg-gradient-to-br from-[color:var(--accent-magenta)]/80 to-purple-600/80 text-white rounded-tr-lg'}
    ${isLive ? 'italic bg-opacity-80' : ''}
  `;
  
  const bubbleWrapperClasses = `flex flex-col ${isModel ? 'items-start' : 'items-end'}`;

  return (
    <div className={containerClasses}>
      {isModel && icon}
      <div className={`w-full ${isModel ? 'mr-10' : 'ml-10'}`}>
        <div className={bubbleWrapperClasses}>
            <div className={messageBubbleClasses} style={{ overflowWrap: 'break-word' }}>
              {imageUrl && (
                  <div className="mb-2 rounded-lg overflow-hidden border border-white/10">
                      <img src={imageUrl} alt="Chat image" className="max-w-xs md:max-w-md max-h-80 w-auto h-auto rounded-md" />
                  </div>
              )}
              {videoUrl && (
                  <div className="mb-2 rounded-lg overflow-hidden border border-white/10">
                      <video src={videoUrl} controls className="max-w-xs md:max-w-md w-full h-auto rounded-md bg-black" />
                  </div>
              )}
              {content ? (isLive ? <em>{content}</em> : <MarkdownRenderer content={content} />) : (isStreaming && <span className="inline-block w-2 h-4 bg-gray-300 animate-pulse ml-1" />) }
            </div>
            {isModel && !isStreaming && content && !isLive && (
                <div className="flex items-center gap-3 pl-2 mt-2">
                    <button
                        onClick={() => onFeedback(message.id, 'liked')}
                        className={`text-gray-500 hover:text-green-500 transition-colors ${message.feedback === 'liked' ? 'text-green-500' : ''}`}
                        aria-label="Like response"
                    >
                        <ThumbsUpIcon className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => onFeedback(message.id, 'disliked')}
                        className={`text-gray-500 hover:text-red-500 transition-colors ${message.feedback === 'disliked' ? 'text-red-500' : ''}`}
                        aria-label="Dislike response"
                    >
                        <ThumbsDownIcon className="w-5 h-5" />
                    </button>
                    {isLastMessage && !isLoading && (
                        <button 
                            onClick={onRegenerate} 
                            className="text-gray-500 hover:text-blue-400 transition-colors" 
                            aria-label="Regenerate response"
                        >
                            <RefreshIcon className="w-5 h-5" />
                        </button>
                    )}
                </div>
            )}
        </div>
      </div>
      {!isModel && icon}
    </div>
  );
};

export default Message;
