import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { LLMConfig, ChatMessage, ReviewResult, AnalysisResult } from '../../types';
import { callLLM } from '../../api/llm';
import styles from './ChatPanel.module.css';

interface ChatPanelProps {
  llmConfig: LLMConfig;
  reviewResults: ReviewResult[];
  analysisResult: AnalysisResult | null;
  description: string;
}

export function ChatPanel({
  llmConfig,
  reviewResults,
  analysisResult,
  description,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, scrollToBottom]);

  const buildSystemPrompt = useCallback((): string => {
    const parts: string[] = [
      'You are an expert PCB design reviewer. You have already analyzed a PCB design and provided a detailed review.',
      'The user may ask follow-up questions about the review or the PCB design.',
      'Be helpful, specific, and technical in your responses.',
      '',
    ];

    if (description.trim()) {
      parts.push('## PCB Description');
      parts.push(description.trim());
      parts.push('');
    }

    if (reviewResults.length > 0) {
      parts.push('## Review Results Summary');
      for (const result of reviewResults) {
        if (!result.error && result.response) {
          parts.push(`### ${result.promptName}`);
          // Include a truncated version to save tokens
          const truncated = result.response.length > 2000
            ? result.response.slice(0, 2000) + '\n\n[... truncated for context ...]'
            : result.response;
          parts.push(truncated);
          parts.push('');
        }
      }
    }

    if (analysisResult) {
      parts.push('## PCB Analysis Data');
      parts.push(`- Copper Layers: ${analysisResult.summary.copperLayers}`);
      parts.push(`- Components: ${analysisResult.summary.totalComponents}`);
      parts.push(`- Nets: ${analysisResult.summary.totalNets}`);
      parts.push(`- Traces: ${analysisResult.summary.totalTraces}`);
      parts.push(`- Vias: ${analysisResult.summary.totalVias}`);
      parts.push('');
    }

    return parts.join('\n');
  }, [description, reviewResults, analysisResult]);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();

    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    if (!llmConfig.apiKey.trim()) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Please configure your API key in settings before using the chat.',
      }]);
      return;
    }

    const userMessage: ChatMessage = { role: 'user', content: trimmedInput };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setStreamingContent('');

    try {
      // Build conversation history for context
      const conversationHistory = messages
        .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n\n');

      const userPrompt = conversationHistory
        ? `Previous conversation:\n${conversationHistory}\n\nUser: ${trimmedInput}`
        : trimmedInput;

      const response = await callLLM(
        llmConfig,
        buildSystemPrompt(),
        userPrompt,
        (chunk) => {
          setStreamingContent(prev => prev + chunk);
        }
      );

      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${message}`,
      }]);
    } finally {
      setIsLoading(false);
      setStreamingContent('');
    }
  }, [input, isLoading, llmConfig, messages, buildSystemPrompt]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  const canChat = llmConfig.apiKey.trim() !== '';

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Chat</h3>
        {messages.length > 0 && (
          <button
            className={styles.clearButton}
            onClick={handleClearChat}
            disabled={isLoading}
          >
            Clear
          </button>
        )}
      </div>

      <div className={styles.messages}>
        {messages.length === 0 && !isLoading && (
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>
              Ask questions about your PCB design or the review results.
            </p>
            <div className={styles.suggestions}>
              <button
                className={styles.suggestion}
                onClick={() => setInput('What are the most critical issues I should address first?')}
              >
                What are the most critical issues?
              </button>
              <button
                className={styles.suggestion}
                onClick={() => setInput('Can you explain the power distribution concerns in more detail?')}
              >
                Explain power distribution concerns
              </button>
              <button
                className={styles.suggestion}
                onClick={() => setInput('What improvements would have the biggest impact on signal integrity?')}
              >
                Signal integrity improvements
              </button>
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`${styles.message} ${message.role === 'user' ? styles.userMessage : styles.assistantMessage}`}
          >
            <div className={styles.messageContent}>
              {message.role === 'assistant' ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.content}
                </ReactMarkdown>
              ) : (
                message.content
              )}
            </div>
          </div>
        ))}

        {isLoading && streamingContent && (
          <div className={`${styles.message} ${styles.assistantMessage}`}>
            <div className={styles.messageContent}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {streamingContent}
              </ReactMarkdown>
              <span className={styles.cursor}>|</span>
            </div>
          </div>
        )}

        {isLoading && !streamingContent && (
          <div className={`${styles.message} ${styles.assistantMessage}`}>
            <div className={styles.loading}>
              <span className={styles.dot}></span>
              <span className={styles.dot}></span>
              <span className={styles.dot}></span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form className={styles.inputForm} onSubmit={handleSubmit}>
        <textarea
          ref={textareaRef}
          className={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={canChat ? "Ask a question about your PCB..." : "Configure API key to chat"}
          disabled={!canChat || isLoading}
          rows={1}
        />
        <button
          type="submit"
          className={styles.sendButton}
          disabled={!canChat || isLoading || !input.trim()}
        >
          &#10148;
        </button>
      </form>
    </div>
  );
}
