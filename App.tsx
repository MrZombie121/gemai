
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Message, User, Chat, Plan, ModelId, ConversationMode } from './types.ts';
import { LiveServerMessage, Modality } from "@google/genai";
import { generateContentStream, generateImage, generateVideo, mapMessagesToGemini, db, auth, isApiKeySet, getAi, createPcmBlob, decodeAudioData, VideoGenerationOptions } from './services/geminiService.ts';
import ChatWindow from './components/ChatWindow.tsx';
import ChatInput from './components/ChatInput.tsx';
import CondemnationBanner from './components/CondemnationBanner.tsx';
import UpdatesPage from './components/UpdatesPage.tsx';
import VideoPreview from './components/VideoPreview.tsx';
import VideoGenerationModal from './components/VideoGenerationModal.tsx';
import { GemAIIcon, UserIcon, PlusIcon, StoreIcon, GameIcon, LogoutIcon, GemCoinIcon, SparklesIcon, CheckIcon, VideoIcon, ChevronDownIcon, LockClosedIcon, RockIcon, BellIcon, RefreshIcon, ThumbsUpIcon, ThumbsDownIcon, ChevronDoubleLeftIcon, ChevronDoubleRightIcon, ChatBubbleLeftIcon } from './components/Icons.tsx';

// --- UTILITY FUNCTIONS ---
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
}

const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

// --- CONFIG ---
const PLANS = {
    plus: { name: 'GemAI Plus', cost: 500 },
    pro: { name: 'GemAI Pro', cost: 1000 },
};

const MODELS: Record<ModelId, { name: string; description: string; systemInstruction?: string; minPlan: Plan }> = {
    'gemai-1.0': {
        name: 'GemAI 1.0',
        description: 'Solid performance for everyday conversations.',
        minPlan: 'free',
        systemInstruction: 'You are GemAI 1.0, a helpful and friendly assistant.'
    },
    'gemai-1.0-omni': {
        name: 'GemAI 1.0 Omni',
        description: 'Advanced multimodal capabilities for complex queries.',
        minPlan: 'plus',
        systemInstruction: 'You are GemAI 1.0 Omni, a helpful and creative assistant with extended multimodal capabilities. You provide more detailed and nuanced responses.'
    },
    'gemai-pro-omni': {
        name: 'GemAI Pro Omni',
        description: 'Our flagship model with state-of-the-art reasoning and generation.',
        minPlan: 'pro',
        systemInstruction: 'You are GemAI Pro Omni, the most powerful and creative AI assistant, capable of complex reasoning and providing detailed, expert-level responses across various modalities.'
    }
};

const PLAN_HIERARCHY: Record<Plan, number> = {
    free: 0,
    plus: 1,
    pro: 2
};


// --- MODAL COMPONENTS ---

const PlansModal: React.FC<{ user: User; onClose: () => void; onGoToStore: () => void }> = ({ user, onClose, onGoToStore }) => {
    const FREE_VIDEO_LIMIT = 2;
    const FREE_IMAGE_LIMIT = 2;
    const videosUsed = user.videosGenerated || 0;
    const imagesUsed = user.imagesGenerated || 0;
    
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-md" onClick={onClose}>
            <div className="bg-[#1B263B]/80 rounded-2xl shadow-xl p-8 border border-gray-700 w-full max-w-4xl" onClick={e => e.stopPropagation()}>
                <h2 className="text-3xl font-bold mb-2 text-center text-gray-100">Plans & Features</h2>
                <p className="text-gray-400 mb-8 text-center">Unlock the full potential of GemAI.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Free Plan */}
                    <div className="bg-[#0D1B2A]/60 border border-gray-700 rounded-xl p-6 flex flex-col hover:border-gray-500 transition-colors">
                        <h3 className="text-xl font-semibold text-gray-200">Free</h3>
                        <p className="text-gray-400 mt-2 flex-1">For casual users and trying out GemAI.</p>
                        <ul className="space-y-3 my-6 text-gray-300">
                            <li className="flex items-center gap-3"><CheckIcon className="w-5 h-5 text-green-500" />10 Msgs / Chat</li>
                            <li className="flex items-center gap-3"><CheckIcon className="w-5 h-5 text-green-500" />Text & Image Analysis</li>
                            <li className={`flex items-center gap-3 ${videosUsed >= FREE_VIDEO_LIMIT ? 'text-gray-500' : ''}`}>
                                <VideoIcon className={`w-5 h-5 ${videosUsed >= FREE_VIDEO_LIMIT ? 'text-gray-600' : 'text-[color:var(--accent-cyan)]'}`} />
                                AI Video Generation ({videosUsed}/{FREE_VIDEO_LIMIT} used)
                            </li>
                            <li className={`flex items-center gap-3 ${imagesUsed >= FREE_IMAGE_LIMIT ? 'text-gray-500' : ''}`}>
                                <SparklesIcon className={`w-5 h-5 ${imagesUsed >= FREE_IMAGE_LIMIT ? 'text-gray-600' : 'text-purple-400'}`} />
                                AI Image Generation ({imagesUsed}/{FREE_IMAGE_LIMIT} used)
                            </li>
                        </ul>
                        {user.plan === 'free' 
                            ? <button disabled className="w-full mt-auto bg-gray-600 text-white font-bold py-3 rounded-lg cursor-not-allowed">Your Current Plan</button>
                            : <button onClick={onGoToStore} className="w-full mt-auto bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors">Go to Store</button>
                        }
                    </div>
                     {/* Plus Plan */}
                    <div className="bg-gradient-to-br from-cyan-600/10 to-blue-600/10 border border-cyan-500 rounded-xl p-6 flex flex-col shadow-lg shadow-cyan-500/10 hover:border-cyan-400 transition-colors">
                        <h3 className="text-xl font-semibold text-[color:var(--accent-cyan)]">GemAI Plus</h3>
                        <p className="text-gray-300 mt-2 flex-1">For creatives who want to generate videos.</p>
                        <ul className="space-y-3 my-6 text-gray-200">
                            <li className="flex items-center gap-3"><CheckIcon className="w-5 h-5 text-green-500" />Unlimited Messages</li>
                            <li className="flex items-center gap-3"><CheckIcon className="w-5 h-5 text-green-500" />Text & Image Analysis</li>
                            <li className="flex items-center gap-3"><VideoIcon className="w-5 h-5 text-[color:var(--accent-cyan)]" />AI Video Generation</li>
                             <li className="flex items-center gap-3 text-gray-500 line-through"><SparklesIcon className="w-5 h-5 text-gray-600" />AI Image Generation</li>
                        </ul>
                         {user.plan === 'plus' 
                            ? <button disabled className="w-full mt-auto bg-gray-600 text-white font-bold py-3 rounded-lg cursor-not-allowed">Your Current Plan</button>
                            : <button onClick={onGoToStore} className="w-full mt-auto bg-cyan-600 text-white font-bold py-3 rounded-lg hover:bg-cyan-700 transition-colors">Go to Store to Upgrade</button>
                        }
                    </div>
                    {/* Pro Plan */}
                    <div className="bg-gradient-to-br from-purple-600/10 to-magenta-600/10 border border-purple-500 rounded-xl p-6 flex flex-col shadow-lg shadow-purple-500/10 hover:border-purple-400 transition-colors">
                        <h3 className="text-xl font-semibold text-purple-400">GemAI Pro</h3>
                        <p className="text-gray-300 mt-2 flex-1">For power users who want it all.</p>
                        <ul className="space-y-3 my-6 text-gray-200">
                            <li className="flex items-center gap-3"><CheckIcon className="w-5 h-5 text-green-500" />Unlimited Messages</li>
                            <li className="flex items-center gap-3"><CheckIcon className="w-5 h-5 text-green-500" />Text & Image Analysis</li>
                            <li className="flex items-center gap-3"><VideoIcon className="w-5 h-5 text-[color:var(--accent-cyan)]" />AI Video Generation</li>
                            <li className="flex items-center gap-3"><SparklesIcon className="w-5 h-5 text-purple-400" />AI Image Generation</li>
                        </ul>
                         {user.plan === 'pro' 
                            ? <button disabled className="w-full mt-auto bg-gray-600 text-white font-bold py-3 rounded-lg cursor-not-allowed">Your Current Plan</button>
                            : <button onClick={onGoToStore} className="w-full mt-auto bg-purple-600 text-white font-bold py-3 rounded-lg hover:bg-purple-700 transition-colors">Go to Store to Upgrade</button>
                        }
                    </div>
                </div>
                <div className="text-center mt-8">
                    <button onClick={onClose} className="text-blue-400 hover:underline">Close</button>
                </div>
            </div>
        </div>
    );
};


type GridItem = 'empty' | 'gem' | 'rock';

const GameModal: React.FC<{ user: User; onFarm: (amount: number) => void; onClose: () => void }> = ({ user, onFarm, onClose }) => {
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'finished'>('idle');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [grid, setGrid] = useState<GridItem[]>(Array(9).fill('empty'));
  const gameTimers = useRef<{ game?: number; spawn?: number }>({});

  const clearTimers = () => {
    if (gameTimers.current.game) clearInterval(gameTimers.current.game);
    if (gameTimers.current.spawn) clearInterval(gameTimers.current.spawn);
    gameTimers.current = {};
  };

  const startGame = () => {
    setScore(0);
    setTimeLeft(20);
    setGameState('playing');

    gameTimers.current.game = window.setInterval(() => {
        setTimeLeft(prev => prev - 1);
    }, 1000);

    gameTimers.current.spawn = window.setInterval(() => {
        const newGrid = Array(9).fill('empty') as GridItem[];
        const randomIndex = Math.floor(Math.random() * 9);
        newGrid[randomIndex] = Math.random() > 0.25 ? 'gem' : 'rock';
        setGrid(newGrid);
    }, 850);
  };

  useEffect(() => {
    if (timeLeft <= 0 && gameState === 'playing') {
      clearTimers();
      setGameState('finished');
      if (score > 0) {
        onFarm(score);
      }
      setGrid(Array(9).fill('empty'));
    }
  }, [timeLeft, gameState, score, onFarm]);
  
  useEffect(() => {
    return () => clearTimers();
  }, []);
  
  const handleItemClick = (index: number) => {
    const item = grid[index];
    if (gameState !== 'playing' || item === 'empty') return;
    
    if (item === 'gem') {
      setScore(prev => prev + 1);
    } else if (item === 'rock') {
      setScore(prev => Math.max(0, prev - 1));
    }
    setGrid(Array(9).fill('empty'));
  };

  const resetGame = () => {
      setGameState('idle');
      setScore(0);
  };

  const renderContent = () => {
    switch (gameState) {
      case 'playing':
        return (
          <>
            <div className="flex justify-between items-center mb-6 w-full">
                <div className="text-xl">Score: <span className="font-bold text-yellow-400">{score}</span></div>
                <div className="text-xl font-mono">Time: <span className="font-bold text-red-400 w-8 inline-block text-right">{timeLeft}</span>s</div>
            </div>
            <div className="grid grid-cols-3 gap-4 w-full h-80 md:h-96">
                {grid.map((item, index) => (
                    <button key={index} className="bg-gray-900/50 rounded-full flex items-center justify-center border-2 border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 hover:bg-gray-700 transition-colors" onClick={() => handleItemClick(index)}>
                        {item === 'gem' && <GemCoinIcon className="w-16 h-16 text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)] animate-bounce" />}
                        {item === 'rock' && <RockIcon className="w-16 h-16 text-gray-500 animate-pulse" />}
                    </button>
                ))}
            </div>
          </>
        );
      case 'finished':
          return (
            <>
              <h2 className="text-3xl font-bold mb-4 text-gray-100">Time's Up!</h2>
              <p className="text-lg mb-2 text-gray-300">You mined <span className="font-bold text-yellow-400">{score}</span> GemCoins!</p>
              <p className="text-lg mb-8 text-gray-300">Your new total: <span className="font-bold text-yellow-400">{user.gemCoins}</span> GemCoins</p>
              <div className="flex gap-4 justify-center">
                <button onClick={resetGame} className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold">Play Again</button>
                <button onClick={onClose} className="bg-[color:var(--bg-tertiary)] text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors font-semibold">Close</button>
              </div>
            </>
          );
      case 'idle':
      default:
        return (
          <>
            <h2 className="text-3xl font-bold mb-2 text-gray-100">Gem Grinder</h2>
            <p className="text-gray-400 mb-8 max-w-xs">Click the gems as they appear to earn GemCoins. Avoid the rocks! You have 20 seconds.</p>
            <button onClick={startGame} className="bg-green-600 text-white font-bold px-10 py-4 rounded-lg hover:bg-green-700 transition-colors text-xl shadow-lg shadow-green-500/20">Start Grinding</button>
            <button onClick={onClose} className="mt-8 text-blue-400 hover:underline">Maybe later</button>
          </>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-md" onClick={onClose}>
      <div className="bg-[#1B263B]/80 rounded-2xl shadow-xl p-8 border border-gray-700 w-full max-w-lg text-center flex flex-col items-center" onClick={e => e.stopPropagation()}>
          {renderContent()}
      </div>
    </div>
  );
};

const StoreModal: React.FC<{ user: User; onPurchasePlan: (plan: 'plus' | 'pro') => void; onClose: () => void }> = ({ user, onPurchasePlan, onClose }) => {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-md" onClick={onClose}>
        <div className="bg-[#1B263B]/80 rounded-2xl shadow-xl p-8 border border-gray-700 w-full max-w-md text-center" onClick={e => e.stopPropagation()}>
          <h2 className="text-3xl font-bold mb-2 text-gray-100">GemAI Store</h2>
          <p className="text-gray-400 mb-6">Use your GemCoins to upgrade your plan.</p>
          <div className="space-y-4">
            {/* Plus Plan Purchase */}
            <div className="bg-gradient-to-br from-cyan-600/10 to-blue-600/10 border border-cyan-700 rounded-xl p-6 text-left hover:border-cyan-500 transition-colors">
                <h3 className="text-xl font-semibold text-[color:var(--accent-cyan)]">{PLANS.plus.name}</h3>
                <p className="text-gray-300 mt-2">Unlimited messages & AI video generation.</p>
                <div className="text-2xl font-bold my-4 text-center text-yellow-400 flex items-center justify-center gap-2">
                    <GemCoinIcon className="w-8 h-8"/>
                    <span>{PLANS.plus.cost} GemCoins</span>
                </div>
                {user.plan === 'plus' ? (
                     <button disabled className="w-full bg-green-600 text-white font-bold py-3 rounded-lg cursor-not-allowed">Currently Active</button>
                ) : user.plan === 'pro' ? (
                    <button disabled className="w-full bg-gray-600 text-white font-bold py-3 rounded-lg cursor-not-allowed">Included in Pro</button>
                ) : (
                    <button 
                        onClick={() => onPurchasePlan('plus')}
                        disabled={user.gemCoins < PLANS.plus.cost}
                        className="w-full bg-cyan-600 text-white font-bold py-3 rounded-lg hover:bg-cyan-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                    >
                        {user.gemCoins < PLANS.plus.cost ? 'Not Enough Coins' : 'Purchase'}
                    </button>
                )}
            </div>
             {/* Pro Plan Purchase */}
            <div className="bg-gradient-to-br from-purple-600/10 to-magenta-600/10 border border-purple-700 rounded-xl p-6 text-left hover:border-purple-500 transition-colors">
              <h3 className="text-xl font-semibold text-purple-400">{PLANS.pro.name}</h3>
              <p className="text-gray-300 mt-2">Get all features including AI image generation.</p>
              <div className="text-2xl font-bold my-4 text-center text-yellow-400 flex items-center justify-center gap-2">
                  <GemCoinIcon className="w-8 h-8"/>
                  <span>{PLANS.pro.cost} GemCoins</span>
              </div>
               {user.plan === 'pro' ? (
                   <button disabled className="w-full bg-green-600 text-white font-bold py-3 rounded-lg cursor-not-allowed">Currently Active</button>
               ) : (
                  <button 
                      onClick={() => onPurchasePlan('pro')}
                      disabled={user.gemCoins < PLANS.pro.cost}
                      className="w-full bg-purple-600 text-white font-bold py-3 rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                  >
                      {user.gemCoins < PLANS.pro.cost ? 'Not Enough Coins' : (user.plan === 'plus' ? 'Upgrade to Pro' : 'Purchase')}
                  </button>
               )}
            </div>
          </div>
          <p className="text-center text-sm text-gray-500 my-4">(All plans last for 30 days)</p>
          <button onClick={onClose} className="mt-2 bg-[color:var(--accent-blue)] text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">Close</button>
        </div>
      </div>
    );
};


// --- UI COMPONENTS ---

const ModelSwitcher: React.FC<{
    user: User;
    activeChat: Chat;
    onModelChange: (chatId: string, model: ModelId) => void;
}> = ({ user, activeChat, onModelChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);
    
    const currentModel = MODELS[activeChat.model];
    
    return (
        <div className="relative" ref={wrapperRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 text-sm font-semibold bg-[#1B263B]/50 hover:bg-[#1B263B] px-4 py-2 rounded-lg transition-colors border border-transparent hover:border-[color:var(--border-color)]">
                {currentModel.name}
                <ChevronDownIcon className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 bg-[#1B263B]/80 backdrop-blur-md border border-[color:var(--border-color)] rounded-lg shadow-2xl z-20">
                    <div className="p-2">
                        {Object.entries(MODELS).map(([id, model]) => {
                             const userPlanLevel = PLAN_HIERARCHY[user.plan];
                             const modelPlanLevel = PLAN_HIERARCHY[model.minPlan];
                             const isAccessible = userPlanLevel >= modelPlanLevel;
                            
                             return (
                                <button
                                    key={id}
                                    onClick={() => {
                                        onModelChange(activeChat.id, id as ModelId);
                                        setIsOpen(false);
                                    }}
                                    disabled={!isAccessible}
                                    className={`w-full text-left p-3 rounded-md hover:bg-[color:var(--bg-tertiary)] transition-colors flex items-center gap-3 ${isAccessible ? '' : 'opacity-60 cursor-not-allowed'}`}
                                >
                                    {isAccessible 
                                      ? <CheckIcon className={`w-5 h-5 flex-shrink-0 ${activeChat.model === id ? 'text-[color:var(--accent-blue)]' : 'text-transparent'}`} />
                                      : <LockClosedIcon className="w-5 h-5 text-gray-500 flex-shrink-0" />
                                    }
                                    <div>
                                        <p className="font-semibold text-gray-100">{model.name}</p>
                                        <p className="text-xs text-gray-400">{model.description}</p>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
};

const Navigation: React.FC<{
    chats: Chat[];
    activeChatId: string | null;
    isNavOpen: boolean;
    onNewChat: () => void;
    onSelectChat: (id: string) => void;
    onOpenGame: () => void;
    onOpenStore: () => void;
    onOpenUpdates: () => void;
}> = ({ chats, activeChatId, isNavOpen, onNewChat, onSelectChat, onOpenGame, onOpenStore, onOpenUpdates }) => {
    
    const NavItem: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void, isActive?: boolean }> = ({ icon, label, onClick, isActive }) => (
        <button onClick={onClick} className={`flex items-center gap-4 w-full h-12 px-4 rounded-lg transition-all duration-200 ${isActive ? 'bg-[color:var(--accent-blue)]/20 text-[color:var(--accent-blue)]' : 'text-gray-400 hover:bg-[#2a354a] hover:text-gray-200'}`}>
            <div className="w-6 h-6 flex-shrink-0">{icon}</div>
            <span className={`whitespace-nowrap transition-opacity duration-200 ${isNavOpen ? 'opacity-100' : 'opacity-0'}`}>{label}</span>
        </button>
    );

    return (
        <nav className={`bg-[color:var(--bg-secondary)] h-screen p-3 flex flex-col transition-all duration-300 ease-in-out ${isNavOpen ? 'w-64' : 'w-[72px]'}`}>
            <div className="flex-1 flex flex-col gap-2 overflow-hidden">
                <NavItem icon={<PlusIcon />} label="New Chat" onClick={onNewChat} />
                <div className="border-t border-[color:var(--border-color)] my-2"></div>
                <div className="flex items-center gap-4 w-full h-12 px-4 text-gray-500">
                    <div className="w-6 h-6 flex-shrink-0"><ChatBubbleLeftIcon /></div>
                    <span className={`whitespace-nowrap transition-opacity duration-200 font-semibold text-sm ${isNavOpen ? 'opacity-100' : 'opacity-0'}`}>Chats</span>
                </div>
                <div className="flex-1 overflow-y-auto pr-1">
                     {chats.map(chat => (
                        <button 
                            key={chat.id}
                            onClick={() => onSelectChat(chat.id)}
                            className={`flex items-center gap-4 w-full h-11 px-4 rounded-lg transition-all duration-200 text-sm truncate ${activeChatId === chat.id ? 'bg-gray-700 text-gray-100 font-semibold' : 'text-gray-400 hover:bg-[#2a354a] hover:text-gray-200'}`}
                        >
                             <div className={`w-2 h-2 rounded-full flex-shrink-0 transition-all ${activeChatId === chat.id ? 'bg-[color:var(--accent-cyan)]' : 'bg-gray-600'}`}></div>
                             <span className={`whitespace-nowrap transition-opacity duration-200 ${isNavOpen ? 'opacity-100' : 'opacity-0'}`}>{chat.title}</span>
                        </button>
                    ))}
                </div>
            </div>
            
            <div className="flex flex-col gap-2">
                 <NavItem icon={<GameIcon />} label="GemCoin Farmer" onClick={onOpenGame} />
                 <NavItem icon={<StoreIcon />} label="Store" onClick={onOpenStore} />
                 <NavItem icon={<BellIcon />} label="Updates" onClick={onOpenUpdates} />
            </div>
        </nav>
    );
};

const UserMenu: React.FC<{ user: User; onOpenPlans: () => void; onLogout: () => void }> = ({ user, onOpenPlans, onLogout }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const planColor = {
        free: 'text-gray-400',
        plus: 'text-[color:var(--accent-cyan)]',
        pro: 'text-purple-400'
    };

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    return (
        <div className="relative" ref={wrapperRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2">
                <div className="font-semibold text-right">
                    <div className="text-sm text-gray-200">{user.username}</div>
                    <div className="flex items-center justify-end gap-1 text-xs text-yellow-400">
                        {user.gemCoins} <GemCoinIcon className="w-3 h-3" />
                    </div>
                </div>
                <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center border-2 border-[color:var(--border-color)]">
                    <UserIcon className="w-6 h-6 text-gray-300"/>
                </div>
            </button>
            {isOpen && (
                 <div className="absolute top-full right-0 mt-3 w-60 bg-[#1B263B]/80 backdrop-blur-md border border-[color:var(--border-color)] rounded-lg shadow-2xl z-20 p-2">
                     <div className="p-2 mb-2 border-b border-[color:var(--border-color)]">
                         <p className="font-semibold text-gray-200">{user.username}</p>
                         <p className={`text-sm font-semibold capitalize ${planColor[user.plan]}`}>{user.plan} Plan</p>
                     </div>
                     <button onClick={() => { onOpenPlans(); setIsOpen(false); }} className="flex items-center gap-3 w-full p-2 text-left text-sm rounded-md text-gray-300 hover:bg-[color:var(--bg-tertiary)] transition-colors">
                        <SparklesIcon /> View Plans
                    </button>
                    <button onClick={onLogout} className="flex items-center gap-3 w-full p-2 text-left text-sm rounded-md text-red-400 hover:bg-red-500/10 transition-colors">
                        <LogoutIcon /> Logout
                    </button>
                 </div>
            )}
        </div>
    );
};

const AuthScreen: React.FC<{ onAuth: (user: User) => void }> = ({ onAuth }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const user = await (isLogin ? auth.login(username, password) : auth.signUp(username, password));
            onAuth(user);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="flex items-center justify-center h-screen bg-[color:var(--bg-primary)] text-gray-100">
            <div className="w-full max-w-sm p-8 bg-[color:var(--bg-secondary)] rounded-2xl shadow-2xl border border-[color:var(--border-color)]">
                <div className="flex items-center justify-center gap-3 mb-6">
                    <div className="w-10 h-10 text-[color:var(--accent-cyan)]"><GemAIIcon /></div>
                    <h1 className="text-3xl font-bold">GemAI</h1>
                </div>

                <div className="flex border-b border-gray-600 mb-6">
                    <button onClick={() => setIsLogin(true)} className={`flex-1 py-2 font-semibold transition-colors ${isLogin ? 'text-[color:var(--accent-blue)] border-b-2 border-[color:var(--accent-blue)]' : 'text-gray-400'}`}>Login</button>
                    <button onClick={() => setIsLogin(false)} className={`flex-1 py-2 font-semibold transition-colors ${!isLogin ? 'text-[color:var(--accent-blue)] border-b-2 border-[color:var(--accent-blue)]' : 'text-gray-400'}`}>Sign Up</button>
                </div>

                <form onSubmit={handleSubmit}>
                    {error && <p className="bg-red-900/50 text-red-300 p-3 rounded-md mb-4 text-center">{error}</p>}
                    <div className="mb-4">
                        <label className="block text-gray-400 mb-2">Username</label>
                        <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-[color:var(--bg-tertiary)] border border-gray-600 rounded-md p-3 outline-none focus:ring-2 focus:ring-[color:var(--accent-blue)]" required />
                    </div>
                    <div className="mb-6">
                        <label className="block text-gray-400 mb-2">Password</label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-[color:var(--bg-tertiary)] border border-gray-600 rounded-md p-3 outline-none focus:ring-2 focus:ring-[color:var(--accent-blue)]" required />
                    </div>
                    <button type="submit" className="w-full bg-[color:var(--accent-blue)] hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors disabled:bg-gray-600" disabled={isLoading}>
                        {isLoading ? 'Loading...' : (isLogin ? 'Login' : 'Sign Up')}
                    </button>
                </form>
            </div>
        </div>
    );
};


// --- MAIN APP COMPONENT ---

const App: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [chats, setChats] = useState<Chat[]>([]);
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isGameOpen, setGameOpen] = useState(false);
    const [isStoreOpen, setStoreOpen] = useState(false);
    const [isPlansOpen, setPlansOpen] = useState(false);
    const [showBanner, setShowBanner] = useState(false);
    const [activeView, setActiveView] = useState<'chat' | 'updates'>('chat');
    const [isVideoModalOpen, setVideoModalOpen] = useState(false);
    const [videoModalPrompt, setVideoModalPrompt] = useState('');
    const [isNavOpen, setIsNavOpen] = useState(true);
    
    // Live Conversation State
    const [conversationMode, setConversationMode] = useState<ConversationMode>('text');
    const [liveSessionStatus, setLiveSessionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
    const [userMediaStream, setUserMediaStream] = useState<MediaStream | null>(null);
    const sessionPromiseRef = useRef<Promise<any> | null>(null);
    const audioResourcesRef = useRef<{
        inputAudioContext?: AudioContext,
        scriptProcessor?: ScriptProcessorNode,
        mediaStreamSource?: MediaStreamAudioSourceNode,
        outputAudioContext?: AudioContext,
        nextStartTime: number,
        sources: Set<AudioBufferSourceNode>,
    }>({ nextStartTime: 0, sources: new Set() });
    const videoFrameIntervalRef = useRef<number | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));

    // --- Effects for Initialization and Chat Management ---

    useEffect(() => {
        const checkUserSession = async () => {
            const user = auth.getCurrentUser();
            if (user) {
                const checkedUser = await auth.checkPlanExpiry(user);
                setCurrentUser(checkedUser);
            }
        };

        if (!isApiKeySet()) {
            setError("The application is not configured correctly. API_KEY is missing.");
        }
        checkUserSession();
        const bannerDismissed = localStorage.getItem('gemai_bannerDismissed');
        if (!bannerDismissed) {
            setShowBanner(true);
        }
    }, []);

    useEffect(() => {
        if (currentUser) {
            const loadChats = async () => {
                let userChats = await db.getChats(currentUser.username);
    
                const oldModelIds = ['gemai-plus-1.0', 'gemai-pro-1.0'];
                const chatsNeedMigration = userChats.some(c => !c.model || oldModelIds.includes(c.model as any));
                
                if (chatsNeedMigration) {
                    userChats = userChats.map(chat => {
                        let model: string = chat.model || 'gemai-1.0';
                        if (model === 'gemai-plus-1.0') model = 'gemai-1.0-omni';
                        if (model === 'gemai-pro-1.0') model = 'gemai-pro-omni';
                        return { ...chat, model: model as ModelId };
                    });
                    await db.saveChats(currentUser.username, userChats);
                }
    
                if (userChats.length === 0) {
                    const newChat = await db.createChat(currentUser.username);
                    setChats([newChat]);
                    setActiveChatId(newChat.id);
                } else {
                    setChats(userChats);
                    setActiveChatId(userChats[0].id);
                }
            };
            loadChats();
        } else {
            setChats([]);
            setActiveChatId(null);
        }
    }, [currentUser]);

    const activeChat = useMemo(() => chats.find(c => c.id === activeChatId), [chats, activeChatId]);

    // --- Handlers ---
    
    const handleAuth = (user: User) => setCurrentUser(user);
    const handleLogout = () => {
        auth.logout();
        setCurrentUser(null);
    };

    const handleUserUpdate = useCallback(async (updates: Partial<User>) => {
        if (!currentUser) return;
        const updatedUser = { ...currentUser, ...updates };
        setCurrentUser(updatedUser);
        await db.updateUser(updatedUser);
        auth.setCurrentUser(updatedUser); // Persist session
    }, [currentUser]);

    const handleNewChat = useCallback(async () => {
        if (!currentUser) return;
        const newChat = await db.createChat(currentUser.username);
        setChats(prev => [newChat, ...prev]);
        setActiveChatId(newChat.id);
        setActiveView('chat');
    }, [currentUser]);

    const handleSelectChat = (chatId: string) => {
        setActiveChatId(chatId);
        setActiveView('chat');
    };
    
    const handleBannerClose = () => {
        setShowBanner(false);
        localStorage.setItem('gemai_bannerDismissed', 'true');
    };

    const updateChatAndSave = (chatId: string, updateFn: (prevChat: Chat) => Chat) => {
        setChats(prevChats => {
            const newChats = prevChats.map(c => c.id === chatId ? updateFn(c) : c);
            if (currentUser) {
                db.saveChats(currentUser.username, newChats);
            }
            return newChats;
        });
    };
    
    const handleModelChange = (chatId: string, model: ModelId) => {
        updateChatAndSave(chatId, (chat) => ({ ...chat, model }));
    };

    const handleOpenVideoModal = (prompt: string = '') => {
        setVideoModalPrompt(prompt);
        setVideoModalOpen(true);
    };

    const handleGenerateVideo = useCallback(async (options: VideoGenerationOptions) => {
        if (!activeChat || !currentUser) return;
        
        setVideoModalOpen(false);
        setIsLoading(true);
        setError(null);

        const FREE_VIDEO_LIMIT = 2;
        let canGenerate = false;
        let errorMessage = "You need GemAI Plus or Pro to generate videos.";
        
        if (currentUser.plan === 'pro' || currentUser.plan === 'plus') {
            canGenerate = true;
        } else if (currentUser.plan === 'free' && (currentUser.videosGenerated || 0) < FREE_VIDEO_LIMIT) {
            canGenerate = true;
        } else if (currentUser.plan === 'free') {
             errorMessage = `You've used all ${FREE_VIDEO_LIMIT} free video generations. Please upgrade to continue.`;
        }

        if (!canGenerate) {
            setError(errorMessage);
            setIsLoading(false);
            return;
        }

        const createMessageId = () => `msg_${Date.now()}_${Math.random()}`;
        const userMessage: Message = { id: createMessageId(), role: 'user', content: `/video ${options.prompt}`, type: 'text' };
        const modelPlaceholder: Message = { id: createMessageId(), role: 'model', content: 'Requesting video generation...', type: 'text' };
        
        updateChatAndSave(activeChat.id, chat => ({
            ...chat, messages: [...chat.messages, userMessage, modelPlaceholder]
        }));
        
        const handleProgress = (updateText: string) => {
            updateChatAndSave(activeChat.id, chat => ({
                ...chat,
                messages: chat.messages.map(m => m.id === modelPlaceholder.id ? { ...m, content: updateText } : m)
            }));
        };

        try {
            const videoUrl = await generateVideo(options, handleProgress);
             if (currentUser.plan === 'free') {
                await handleUserUpdate({ videosGenerated: (currentUser.videosGenerated || 0) + 1 });
             }
             updateChatAndSave(activeChat.id, chat => ({
                 ...chat,
                 messages: chat.messages.map(m => m.id === modelPlaceholder.id ? { ...m, content: `Generated video for: "${options.prompt}"`, videoUrl } : m)
             }));

        } catch(e) {
            const errorMessage = e instanceof Error ? e.message : "Sorry, I couldn't generate the video.";
            setError(errorMessage);
            updateChatAndSave(activeChat.id, chat => ({
                 ...chat,
                 messages: chat.messages.map(m => m.id === modelPlaceholder.id ? { ...m, content: `Error generating video: ${errorMessage}` } : m)
            }));
        } finally {
            setIsLoading(false);
        }
    }, [activeChat, currentUser, handleUserUpdate]);

    // --- Live Conversation Handlers ---
    const handleStopConversation = useCallback(() => {
        sessionPromiseRef.current?.then(session => session.close());
        userMediaStream?.getTracks().forEach(track => track.stop());
        
        audioResourcesRef.current.mediaStreamSource?.disconnect();
        audioResourcesRef.current.scriptProcessor?.disconnect();
        
        if (videoFrameIntervalRef.current) {
            clearInterval(videoFrameIntervalRef.current);
            videoFrameIntervalRef.current = null;
        }

        setUserMediaStream(null);
        setLiveSessionStatus('disconnected');
        sessionPromiseRef.current = null;

        if (activeChatId) {
            updateChatAndSave(activeChatId, chat => ({
                ...chat,
                messages: chat.messages.filter(m => m.id !== 'live_input' && m.id !== 'live_output')
            }));
        }

    }, [userMediaStream, activeChatId]);


    const handleStartConversation = useCallback(async () => {
        if (!activeChat) return;
        setError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: conversationMode === 'video'
            });
            setUserMediaStream(stream);
            setLiveSessionStatus('connecting');

            const placeholders: Message[] = [
                { id: 'live_input', role: 'user', content: '...', type: 'live' },
                { id: 'live_output', role: 'model', content: '', type: 'live' }
            ];
            updateChatAndSave(activeChat.id, chat => ({...chat, messages: [...chat.messages, ...placeholders]}));
            
            const ai = getAi();
            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                config: {
                    responseModalities: [Modality.AUDIO],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                },
                callbacks: {
                    onopen: () => {
                        setLiveSessionStatus('connected');
                        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
                        const source = audioCtx.createMediaStreamSource(stream);
                        const processor = audioCtx.createScriptProcessor(4096, 1, 1);
                        
                        processor.onaudioprocess = (e) => {
                            const inputData = e.inputBuffer.getChannelData(0);
                            const pcmBlob = createPcmBlob(inputData);
                            sessionPromiseRef.current?.then(session => session.sendRealtimeInput({ media: pcmBlob }));
                        };
                        source.connect(processor);
                        processor.connect(audioCtx.destination);
                        audioResourcesRef.current = { ...audioResourcesRef.current, inputAudioContext: audioCtx, mediaStreamSource: source, scriptProcessor: processor };

                        if (conversationMode === 'video') {
                            const videoTrack = stream.getVideoTracks()[0];
                            const videoEl = document.createElement('video');
                            videoEl.srcObject = new MediaStream([videoTrack]);
                            videoEl.play();
                            
                            videoFrameIntervalRef.current = window.setInterval(() => {
                                const canvas = canvasRef.current;
                                canvas.width = videoEl.videoWidth;
                                canvas.height = videoEl.videoHeight;
                                canvas.getContext('2d')?.drawImage(videoEl, 0, 0, videoEl.videoWidth, videoEl.videoHeight);
                                canvas.toBlob(async (blob) => {
                                    if (blob) {
                                        const base64Data = await blobToBase64(blob);
                                        sessionPromiseRef.current?.then(session => session.sendRealtimeInput({ media: { data: base64Data, mimeType: 'image/jpeg' }}));
                                    }
                                }, 'image/jpeg', 0.8);
                            }, 200);
                        }
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        if (message.serverContent) {
                            if (message.serverContent.inputTranscription) {
                                updateChatAndSave(activeChat.id, chat => ({...chat, messages: chat.messages.map(m => m.id === 'live_input' ? {...m, content: message.serverContent.inputTranscription.text} : m) }));
                            }
                             if (message.serverContent.outputTranscription) {
                                updateChatAndSave(activeChat.id, chat => ({...chat, messages: chat.messages.map(m => m.id === 'live_output' ? {...m, content: message.serverContent.outputTranscription.text} : m) }));
                            }
                            if (message.serverContent.turnComplete && currentUser) {
                                setChats(prev => {
                                    const chatToUpdate = prev.find(c => c.id === activeChat.id);
                                    if (!chatToUpdate) return prev;

                                    const liveInput = chatToUpdate.messages.find(m => m.id === 'live_input');
                                    const liveOutput = chatToUpdate.messages.find(m => m.id === 'live_output');
                                    
                                    let newMessages = chatToUpdate.messages.filter(m => m.id !== 'live_input' && m.id !== 'live_output');
                                    
                                    if (liveInput?.content) newMessages.push({ id: `msg_${Date.now()}_user`, role: 'user', content: liveInput.content, type: 'text'});
                                    if (liveOutput?.content) newMessages.push({ id: `msg_${Date.now()}_model`, role: 'model', content: liveOutput.content, type: 'text'});

                                    newMessages.push(
                                        { id: 'live_input', role: 'user', content: '...', type: 'live' },
                                        { id: 'live_output', role: 'model', content: '', type: 'live' }
                                    );
                                    
                                    const newChats = prev.map(c => c.id === activeChat.id ? {...c, messages: newMessages} : c);
                                    db.saveChats(currentUser.username, newChats);
                                    return newChats;
                                });
                            }
                            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                            if (audioData) {
                                if (!audioResourcesRef.current.outputAudioContext) {
                                    audioResourcesRef.current.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
                                }
                                const audioCtx = audioResourcesRef.current.outputAudioContext;
                                const audioBuffer = await decodeAudioData(audioData, audioCtx);
                                
                                audioResourcesRef.current.nextStartTime = Math.max(audioResourcesRef.current.nextStartTime, audioCtx.currentTime);
                                const source = audioCtx.createBufferSource();
                                source.buffer = audioBuffer;
                                source.connect(audioCtx.destination);
                                
                                source.addEventListener('ended', () => audioResourcesRef.current.sources.delete(source));
                                source.start(audioResourcesRef.current.nextStartTime);
                                audioResourcesRef.current.nextStartTime += audioBuffer.duration;
                                audioResourcesRef.current.sources.add(source);
                            }
                            if (message.serverContent.interrupted) {
                                audioResourcesRef.current.sources.forEach(s => s.stop());
                                audioResourcesRef.current.sources.clear();
                                audioResourcesRef.current.nextStartTime = 0;
                            }
                        }
                    },
                    onerror: (e) => { setError(`Live connection error: ${(e as ErrorEvent).message}`); handleStopConversation(); },
                    onclose: () => { handleStopConversation(); },
                }
            });

        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to start conversation.");
            handleStopConversation();
        }
    }, [activeChat, conversationMode, handleStopConversation, currentUser]);


    const handleSendMessage = useCallback(async (text: string, imageFile: File | null) => {
        if (isLoading || !activeChat || !currentUser) return;

        if (!isApiKeySet()) {
             setError("Cannot send message: API_KEY is not configured.");
             return;
        }

        const FREE_PLAN_LIMIT = 10;
        if(currentUser.plan === 'free' && activeChat.messages.length >= FREE_PLAN_LIMIT) {
            setError(`Free plan message limit (${FREE_PLAN_LIMIT}) reached. Please upgrade!`);
            return;
        }

        setIsLoading(true);
        setError(null);

        const createMessageId = () => `msg_${Date.now()}_${Math.random()}`;
        
        const userMessage: Message = { id: createMessageId(), role: 'user', content: text, type: 'text' };

        if (text.trim().startsWith('/video')) {
            const prompt = text.replace('/video', '').trim();
            handleOpenVideoModal(prompt);
            setIsLoading(false);
            return;
        }

        if (text.trim().startsWith('/generate')) {
            const FREE_IMAGE_LIMIT = 2;
            let canGenerate = false;
            let errorMessage = "Image generation is a Pro feature. Please upgrade your plan.";
            
            if (currentUser.plan === 'pro') {
                canGenerate = true;
            } else if (currentUser.plan === 'free' && (currentUser.imagesGenerated || 0) < FREE_IMAGE_LIMIT) {
                canGenerate = true;
            } else if (currentUser.plan === 'free') {
                errorMessage = `You've used all ${FREE_IMAGE_LIMIT} free image generations. Please upgrade to GemAI Pro to continue.`;
            }

            if (!canGenerate) {
                setError(errorMessage);
                setIsLoading(false);
                return;
            }
            
            const prompt = text.replace('/generate', '').trim();
            if (!prompt) {
                setError("Please provide a prompt for image generation.");
                setIsLoading(false);
                return;
            }
            const modelMessage: Message = { id: createMessageId(), role: 'model', content: `Generating image for: "${prompt}"...`, type: 'text' };
            updateChatAndSave(activeChat.id, chat => ({...chat, messages: [...chat.messages, userMessage, modelMessage]}));

            try {
                const imageUrl = await generateImage(prompt);
                if (currentUser.plan === 'free') {
                    await handleUserUpdate({ imagesGenerated: (currentUser.imagesGenerated || 0) + 1 });
                }
                updateChatAndSave(activeChat.id, chat => ({...chat, messages: chat.messages.map(m => m.id === modelMessage.id ? { ...m, content: `Generated image for: "${prompt}"`, imageUrl } : m)}));
            } catch(e) {
                const errorMessage = e instanceof Error ? e.message : "Sorry, I couldn't generate the image.";
                setError(errorMessage);
                updateChatAndSave(activeChat.id, chat => ({...chat, messages: chat.messages.map(m => m.id === modelMessage.id ? { ...m, content: `Error generating image: ${errorMessage}` } : m)}));
            } finally {
                setIsLoading(false);
            }
            return;
        }


        // --- Standard Message Logic (with optional image) ---
        const userMessageParts: ( {text: string} | {inlineData: {mimeType: string, data: string}} )[] = [{text}];

        if(imageFile) {
            const base64Data = await fileToBase64(imageFile);
            userMessage.imageUrl = base64Data;
            userMessageParts.push({
                inlineData: {
                    mimeType: imageFile.type,
                    data: base64Data.split(',')[1]
                }
            })
        }
        
        const newTitle = activeChat.messages.length === 0 ? (text.substring(0, 30) + (text.length > 30 ? '...' : '')) : activeChat.title;
        const modelResponsePlaceholder: Message = { id: createMessageId(), role: 'model', content: '', type: 'text'};
        
        updateChatAndSave(activeChat.id, chat => ({
            ...chat, 
            title: newTitle,
            messages: [...chat.messages, userMessage, modelResponsePlaceholder]
        }));
        
        try {
            const history = mapMessagesToGemini([...activeChat.messages, userMessage]);
            const contents = [...history, { role: 'user', parts: userMessageParts }];
            
            const modelConfig = MODELS[activeChat.model || 'gemai-1.0'];

            const stream = await generateContentStream(contents, modelConfig.systemInstruction);
            
            const reader = stream.getReader();
            let fullResponse = '';
            const read = async () => {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) {
                        break;
                    }
                    fullResponse += value.text;
                    setChats(prev => prev.map(c => {
                        if (c.id !== activeChat.id) return c;
                        const newMsgs = c.messages.map(m => m.id === modelResponsePlaceholder.id ? {...m, content: fullResponse} : m);
                        return {...c, messages: newMsgs};
                    }));
                }
            };
            await read();
            
            updateChatAndSave(activeChat.id, chat => ({
                ...chat,
                messages: chat.messages.map(m => m.id === modelResponsePlaceholder.id ? { ...m, content: fullResponse } : m)
            }));

        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : "Sorry, I encountered an error. Please try again.";
            setError(errorMessage);
             updateChatAndSave(activeChat.id, chat => ({
                ...chat,
                messages: chat.messages.map(m => m.id === modelResponsePlaceholder.id ? { ...m, content: `Error: ${errorMessage}` } : m)
            }));
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, activeChat, currentUser, handleUserUpdate, handleGenerateVideo]);

    // --- Feedback and Regeneration Handlers ---

    const handleRegenerateResponse = useCallback(async () => {
        if (isLoading || !activeChat || !currentUser) return;
    
        const lastMessage = activeChat.messages[activeChat.messages.length - 1];
        if (!lastMessage || lastMessage.role !== 'model' || !lastMessage.content) {
            return;
        }
    
        setIsLoading(true);
        setError(null);
    
        const messagesForHistory = activeChat.messages.slice(0, -1);
        const modelResponsePlaceholder: Message = { id: `msg_${Date.now()}_${Math.random()}`, role: 'model', content: '', type: 'text'};
        
        updateChatAndSave(activeChat.id, chat => ({...chat, messages: [...messagesForHistory, modelResponsePlaceholder]}));

        try {
            const history = mapMessagesToGemini(messagesForHistory);
            const modelConfig = MODELS[activeChat.model || 'gemai-1.0'];
            const stream = await generateContentStream(history, modelConfig.systemInstruction);
            
            const reader = stream.getReader();
            let fullResponse = '';
            const read = async () => {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) {
                        break;
                    }
                    fullResponse += value.text;
                    setChats(prev => prev.map(c => {
                        if (c.id !== activeChat.id) return c;
                        const newMsgs = c.messages.map(m => m.id === modelResponsePlaceholder.id ? {...m, content: fullResponse} : m);
                        return {...c, messages: newMsgs};
                    }));
                }
            };
            await read();
            
            updateChatAndSave(activeChat.id, chat => ({...chat, messages: chat.messages.map(m => m.id === modelResponsePlaceholder.id ? { ...m, content: fullResponse } : m)}));
    
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : "Sorry, I couldn't regenerate the response.";
            setError(errorMessage);
            updateChatAndSave(activeChat.id, chat => ({...chat, messages: chat.messages.map(m => m.id === modelResponsePlaceholder.id ? { ...m, content: `Error: ${errorMessage}` } : m)}));
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, activeChat, currentUser]);
    
    const sendFeedbackEmail = (feedback: 'liked' | 'disliked', message: Message, precedingMessage: Message | undefined, chat: Chat) => {
        const to = "cramtop2233@gmail.com";
        const subject = `GemAI Feedback: ${feedback === 'liked' ? 'Positive' : 'Negative'}`;
        
        const body = `
    Feedback: ${feedback.charAt(0).toUpperCase() + feedback.slice(1)}
    
    Model: ${MODELS[chat.model].name}
    --------------------
    Prompt:
    ${precedingMessage?.content || '(No preceding user message found)'}
    ${precedingMessage?.imageUrl ? '[Image was attached to prompt]' : ''}
    --------------------
    Response:
    ${message.content}
    --------------------
    Full Chat History (JSON):
    ${JSON.stringify(chat.messages, null, 2)}
        `;
    
        const mailtoUrl = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = mailtoUrl;
    };

    const handleFeedback = (messageId: string, feedback: 'liked' | 'disliked') => {
        if (!currentUser || !activeChat) return;
    
        let targetMessage: Message | undefined;
        let precedingMessage: Message | undefined;
        let shouldSendEmail = false;

        const messageIndex = activeChat.messages.findIndex(m => m.id === messageId);
        if (messageIndex === -1) return;

        targetMessage = activeChat.messages[messageIndex];
        precedingMessage = activeChat.messages[messageIndex - 1];

        const currentFeedback = targetMessage.feedback;
        const newFeedback = currentFeedback === feedback ? undefined : feedback;
        
        if (newFeedback) {
            shouldSendEmail = true;
        }

        updateChatAndSave(activeChat.id, chat => ({
            ...chat,
            messages: chat.messages.map(m => m.id === messageId ? { ...m, feedback: newFeedback } : m)
        }));
    
        if (shouldSendEmail && targetMessage) {
            sendFeedbackEmail(feedback, targetMessage, precedingMessage, activeChat);
        }
    };


    // --- Store and Game Handlers ---
    
    const handleFarmCoins = useCallback((amount: number) => {
        handleUserUpdate({ gemCoins: (currentUser?.gemCoins || 0) + amount });
    }, [currentUser, handleUserUpdate]);

    const handlePurchasePlan = async (plan: 'plus' | 'pro') => {
        if (!currentUser) return;
        const planDetails = PLANS[plan];

        if (currentUser.gemCoins >= planDetails.cost) {
            const expiry = new Date();
            expiry.setDate(expiry.getDate() + 30);
            
            await handleUserUpdate({
                gemCoins: currentUser.gemCoins - planDetails.cost,
                plan: plan,
                planExpiry: expiry.getTime()
            });

            setStoreOpen(false);
            alert(`Congratulations! You've upgraded to ${planDetails.name} for 30 days!`);
        }
    };

    // --- Render Logic ---

    if (!currentUser) {
        return <AuthScreen onAuth={handleAuth} />;
    }

    return (
        <div className="flex h-screen font-sans bg-[color:var(--bg-primary)] text-[color:var(--text-primary)]">
            {isGameOpen && <GameModal user={currentUser} onFarm={handleFarmCoins} onClose={() => setGameOpen(false)} />}
            {isStoreOpen && <StoreModal user={currentUser} onPurchasePlan={handlePurchasePlan} onClose={() => setStoreOpen(false)} />}
            {isPlansOpen && <PlansModal user={currentUser} onClose={() => setPlansOpen(false)} onGoToStore={() => { setPlansOpen(false); setStoreOpen(true); }} />}
            {isVideoModalOpen && <VideoGenerationModal user={currentUser} initialPrompt={videoModalPrompt} onGenerate={handleGenerateVideo} onClose={() => setVideoModalOpen(false)} />}

            <Navigation 
                chats={chats}
                activeChatId={activeChatId}
                isNavOpen={isNavOpen}
                onNewChat={handleNewChat}
                onSelectChat={handleSelectChat}
                onOpenGame={() => setGameOpen(true)}
                onOpenStore={() => setStoreOpen(true)}
                onOpenUpdates={() => setActiveView('updates')}
            />
            <div className="flex flex-col flex-1 relative bg-black/20">
                 <header className="p-4 border-b border-[color:var(--border-color)] flex items-center justify-between space-x-3 bg-[color:var(--bg-secondary)]/50 backdrop-blur-sm z-10 h-[73px]">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsNavOpen(!isNavOpen)} className="p-2 text-gray-400 hover:text-white">
                           {isNavOpen ? <ChevronDoubleLeftIcon /> : <ChevronDoubleRightIcon />}
                        </button>
                        {activeView === 'chat' && !activeChat ? (
                           <h1 className="text-xl font-semibold text-gray-300">Welcome to GemAI</h1>
                        ) : activeView === 'updates' ? (
                             <h1 className="text-xl font-semibold text-gray-300">What's New</h1>
                        ) : (
                             <h1 className="text-xl font-semibold text-gray-300">{activeChat?.title}</h1>
                        )}
                    </div>
                    {activeView === 'chat' && activeChat && <ModelSwitcher user={currentUser} activeChat={activeChat} onModelChange={handleModelChange} />}
                    <UserMenu user={currentUser} onOpenPlans={() => setPlansOpen(true)} onLogout={handleLogout} />
                 </header>

                <main className="flex-1 flex flex-col overflow-hidden">
                    {activeView === 'chat' ? (
                         <>
                            {activeChat ? (
                                <>
                                    {showBanner && <CondemnationBanner onClose={handleBannerClose} />}
                                    {conversationMode === 'video' && liveSessionStatus === 'connected' && <VideoPreview stream={userMediaStream} />}
                                    <ChatWindow 
                                        messages={activeChat.messages} 
                                        isLoading={isLoading}
                                        onRegenerate={handleRegenerateResponse}
                                        onFeedback={handleFeedback}
                                    />
                                    {error && <div className="p-2 mx-4 mb-2 text-center text-red-300 bg-red-900/50 rounded-md">{error}</div>}
                                    <div className="p-4 bg-transparent mt-auto">
                                        <ChatInput 
                                            onSendMessage={handleSendMessage} 
                                            isLoading={isLoading}
                                            conversationMode={conversationMode}
                                            onConversationModeChange={setConversationMode}
                                            liveSessionStatus={liveSessionStatus}
                                            onStartConversation={handleStartConversation}
                                            onStopConversation={handleStopConversation}
                                            onOpenVideoModal={() => handleOpenVideoModal()}
                                        />
                                    </div>
                                </>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-4">
                                    <div className="w-24 h-24 text-[color:var(--accent-cyan)] opacity-30 drop-shadow-[0_0_15px_rgba(0,245,212,0.3)]">
                                        <GemAIIcon />
                                    </div>
                                    <h2 className="text-2xl font-bold text-gray-300">How can I help you today?</h2>
                                    <p>Select a chat or create a new one to start.</p>
                                </div>
                            )}
                        </>
                    ) : (
                        <UpdatesPage />
                    )}
                </main>
            </div>
        </div>
    );
};

export default App;
