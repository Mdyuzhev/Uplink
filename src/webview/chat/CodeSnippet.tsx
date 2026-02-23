import React from 'react';
import { vscodeApi } from './vscodeApi';

interface CodeSnippetProps {
    code: string;
    language: string;
    fileName: string;
    lineStart: number;
    lineEnd: number;
    gitBranch?: string;
}

export const CodeSnippet: React.FC<CodeSnippetProps> = ({
    code, language, fileName, lineStart, lineEnd, gitBranch
}) => {
    const handleOpen = () => {
        vscodeApi.postMessage({
            type: 'openFile',
            fileName,
            lineStart,
        });
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
    };

    return (
        <div className="uplink-code-snippet">
            <div className="uplink-code-snippet__header">
                <span className="uplink-code-snippet__file">
                    📄 {fileName}:{lineStart}-{lineEnd}
                    {gitBranch && <span className="uplink-code-snippet__branch"> ({gitBranch})</span>}
                </span>
                <span className="uplink-code-snippet__actions">
                    <button className="uplink-code-snippet__btn" onClick={handleOpen} title="Открыть в редакторе">↗</button>
                    <button className="uplink-code-snippet__btn" onClick={handleCopy} title="Копировать">📋</button>
                </span>
            </div>
            <pre className="uplink-code-snippet__body">
                <code className={`language-${language}`}>{code}</code>
            </pre>
        </div>
    );
};
