import React, { useState, useEffect } from 'react';
import { User, VideoModelId } from '../types.ts';
import { VideoIcon, LockClosedIcon, InformationCircleIcon } from './Icons.tsx';
import { VideoGenerationOptions } from '../services/geminiService.ts';

interface VideoGenerationModalProps {
    user: User;
    initialPrompt: string;
    onGenerate: (options: VideoGenerationOptions) => void;
    onClose: () => void;
}

const VideoGenerationModal: React.FC<VideoGenerationModalProps> = ({ user, initialPrompt, onGenerate, onClose }) => {
    const [prompt, setPrompt] = useState(initialPrompt);
    const [duration, setDuration] = useState(3);
    const [addWatermark, setAddWatermark] = useState(user.plan !== 'pro');

    useEffect(() => {
        setPrompt(initialPrompt);
    }, [initialPrompt]);

    const isPro = user.plan === 'pro';

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim()) return;
        onGenerate({
            prompt: prompt.trim(),
            duration,
            model: 'veo-2.0-generate-001',
            addWatermark: isPro ? addWatermark : true
        });
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-md" onClick={onClose}>
            <div className="bg-[#1B263B]/80 rounded-2xl shadow-xl p-8 border border-gray-700 w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-3 mb-6">
                    <VideoIcon className="w-8 h-8 text-[color:var(--accent-cyan)]" />
                    <h2 className="text-2xl font-bold text-gray-100">Generate AI Video</h2>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="prompt" className="block text-sm font-medium text-gray-300 mb-2">Prompt</label>
                        <textarea
                            id="prompt"
                            value={prompt}
                            onChange={e => setPrompt(e.target.value)}
                            placeholder="A cat wearing sunglasses driving a convertible..."
                            rows={4}
                            className="w-full bg-[color:var(--bg-tertiary)] border border-gray-600 rounded-md p-3 outline-none focus:ring-2 focus:ring-blue-500 text-gray-100"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="duration" className="block text-sm font-medium text-gray-300 mb-2">Duration ({duration}s)</label>
                        <input
                            id="duration"
                            type="range"
                            min="2"
                            max="30"
                            value={duration}
                            onChange={e => setDuration(Number(e.target.value))}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Options</label>
                        <div className={`flex items-center justify-between p-3 rounded-lg ${isPro ? 'bg-[color:var(--bg-tertiary)]' : 'bg-gray-900/50'}`}>
                            <span className={`flex items-center gap-2 ${isPro ? 'text-gray-200' : 'text-gray-500'}`}>
                                {!isPro && <LockClosedIcon className="w-5 h-5"/>}
                                Remove "GemAI" Watermark
                            </span>
                             <div className="relative flex items-center gap-2">
                                {!isPro && (
                                    <div className="group relative">
                                        <InformationCircleIcon className="w-5 h-5 text-gray-500" />
                                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-gray-950 text-white text-xs rounded-lg py-2 px-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                            This is a GemAI Pro feature.
                                        </div>
                                    </div>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setAddWatermark(prev => !prev)}
                                    disabled={!isPro}
                                    className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${addWatermark ? 'bg-gray-600' : 'bg-purple-600'} disabled:cursor-not-allowed`}
                                    aria-pressed={!addWatermark}
                                >
                                    <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${addWatermark ? 'translate-x-1' : 'translate-x-6'}`}/>
                                </button>
                             </div>
                        </div>
                    </div>

                    <div className="flex justify-end items-center gap-4 pt-4 border-t border-gray-700">
                        <button type="button" onClick={onClose} className="text-gray-400 hover:text-white font-semibold px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">Cancel</button>
                        <button type="submit" className="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors">
                            Generate
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default VideoGenerationModal;
