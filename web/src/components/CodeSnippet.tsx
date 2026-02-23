import React, { useState } from 'react';

interface CodeSnippetProps {
    body: string;
    codeContext?: {
        language: string;
        fileName: string;
        lineStart: number;
        lineEnd: number;
        gitBranch?: string;
    };
}

export const CodeSnippet: React.FC<CodeSnippetProps> = ({ body, codeContext }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(body);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch { /* ignore */ }
    };

    const header = codeContext
        ? `${codeContext.fileName}:${codeContext.lineStart}-${codeContext.lineEnd}`
        : 'code';

    return (
        <div className="code-snippet">
            <div className="code-snippet__header">
                <span className="code-snippet__file">{header}</span>
                <button className="code-snippet__copy" onClick={handleCopy}>
                    {copied ? 'Скопировано' : 'Копировать'}
                </button>
            </div>
            <div className="code-snippet__body">
                <pre>{body}</pre>
            </div>
        </div>
    );
};
