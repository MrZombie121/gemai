
import React, { useState } from 'react';
import { ClipboardIcon, CheckIcon } from './Icons.tsx';

interface CodeBlockProps {
  code: string;
  language?: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ code, language }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className="my-4 bg-gray-900 rounded-lg overflow-hidden relative">
      <div className="flex justify-between items-center text-xs text-gray-400 px-4 py-2 bg-gray-800">
        <span>{language || 'code'}</span>
        <button onClick={handleCopy} className="flex items-center gap-1.5 hover:text-white transition-colors">
            {isCopied ? <CheckIcon className="w-4 h-4 text-green-400" /> : <ClipboardIcon className="w-4 h-4" />}
            {isCopied ? 'Copied!' : 'Copy code'}
        </button>
      </div>
      <pre className="p-4 text-sm overflow-x-auto"><code className={`language-${language}`}>{code}</code></pre>
    </div>
  );
};

// A simple function to render inline markdown (bold, italic)
const renderInline = (text: string) => {
    // This regex is imperfect but handles simple cases
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
    return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('*') && part.endsWith('*')) {
            return <em key={i}>{part.slice(1, -1)}</em>;
        }
        return part;
    });
};

const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
    // Split by code blocks first
  const parts = content.split(/(```[a-z]*\n[\s\S]*?\n```)/g);

  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith('```')) {
          const lines = part.split('\n');
          const language = lines[0].replace('```', '').trim();
          const code = lines.slice(1, -1).join('\n');
          return <CodeBlock key={index} code={code} language={language} />;
        }
        
        // Process text blocks for lists and paragraphs
        const textBlocks = part.trim().split('\n\n');
        return textBlocks.map((block, blockIndex) => {
            const lines = block.split('\n');
            const isList = lines.every(line => line.trim().startsWith('- ') || line.trim().startsWith('* '));

            if (isList && lines[0].trim()) {
                return (
                    <ul key={`${index}-${blockIndex}`} className="list-disc list-inside my-2 space-y-1">
                        {lines.map((line, lineIndex) => (
                            <li key={lineIndex}>{renderInline(line.trim().substring(2))}</li>
                        ))}
                    </ul>
                );
            }

            return <p key={`${index}-${blockIndex}`} className="my-2">{renderInline(block)}</p>
        });

      })}
    </>
  );
};

export default MarkdownRenderer;