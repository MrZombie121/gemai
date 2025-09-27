
import React from 'react';
import { SparklesIcon, VideoIcon, CheckIcon, BellIcon } from './Icons.tsx';

const updates = [
    {
        version: "v1.1.0",
        date: "July 26, 2024",
        title: "Stay in the Loop!",
        changes: [
            { icon: <BellIcon className="w-5 h-5 text-blue-400" />, text: "Added this 'Updates' page to keep you informed about the latest features and improvements." },
        ]
    },
    {
        version: "v1.0.0",
        date: "July 24, 2024",
        title: "The Launch of GemAI",
        changes: [
            { icon: <SparklesIcon className="w-5 h-5 text-purple-400" />, text: "GemAI Pro plan with state-of-the-art image generation." },
            { icon: <VideoIcon className="w-5 h-5 text-cyan-400" />, text: "GemAI Plus plan with powerful video generation capabilities." },
            { icon: <CheckIcon className="w-5 h-5 text-green-500" />, text: "Secure user accounts and multi-chat management." },
            { icon: <CheckIcon className="w-5 h-5 text-green-500" />, text: "Earn GemCoins by playing the Gem Grinder mini-game." },
            { icon: <CheckIcon className="w-5 h-5 text-green-500" />, text: "Upgrade your plan using GemCoins in the store." },
        ]
    }
];

const UpdatesPage: React.FC = () => {
    return (
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
            <div className="max-w-4xl mx-auto w-full">
                <div className="border-b border-gray-700 pb-4 mb-8">
                    <h1 className="text-3xl font-bold text-gray-100">What's New in GemAI</h1>
                    <p className="text-gray-400 mt-2">The latest features, improvements, and bug fixes.</p>
                </div>

                <div className="space-y-12">
                    {updates.map((update) => (
                        <div key={update.version} className="relative pl-8">
                            <div className="absolute left-0 top-1 h-full w-px bg-gray-700"></div>
                            <div className="absolute left-[-5px] top-1 w-4 h-4 rounded-full bg-blue-500 border-4 border-gray-800"></div>

                            <p className="text-sm text-gray-500 font-medium mb-1">{update.date}</p>
                            <h2 className="text-2xl font-semibold text-gray-100 mb-1">{update.title}</h2>
                            <span className="inline-block bg-gray-700 text-gray-300 text-xs font-mono px-2 py-1 rounded-md mb-4">{update.version}</span>

                            <ul className="space-y-3">
                                {update.changes.map((change, index) => (
                                    <li key={index} className="flex items-start gap-3">
                                        <div className="flex-shrink-0 mt-1">{change.icon}</div>
                                        <span className="text-gray-300">{change.text}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>
        </main>
    );
};

export default UpdatesPage;
