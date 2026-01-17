import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, FileText, MessageSquare, Sparkles, Loader2, TrendingUp, Plus, Trash2, MessageCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { resumesApi, aiApi, chatSessionsApi } from '../api/client';
import { useApplicationStore } from '../store/applicationStore';
import type { Resume, Application, ChatSession } from '../types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

type ChatMode = 'critique' | 'interview';

// Helper function to extract score from text like "8 / 10"
const extractScore = (text: string): { score: number; max: number } | null => {
  const match = text.match(/(\d+)\s*\/\s*(\d+)/);
  if (match) {
    return { score: parseInt(match[1]), max: parseInt(match[2]) };
  }
  return null;
};

// Helper function to get color based on score
const getScoreColor = (score: number, max: number): string => {
  const percentage = (score / max) * 100;
  if (percentage >= 80) return 'text-green-400';
  if (percentage >= 60) return 'text-yellow-400';
  return 'text-red-400';
};

const getScoreBgColor = (score: number, max: number): string => {
  const percentage = (score / max) * 100;
  if (percentage >= 80) return 'bg-green-500/20 border-green-500/30';
  if (percentage >= 60) return 'bg-yellow-500/20 border-yellow-500/30';
  return 'bg-red-500/20 border-red-500/30';
};

const getProgressColor = (score: number, max: number): string => {
  const percentage = (score / max) * 100;
  if (percentage >= 80) return 'bg-gradient-to-r from-green-500 to-green-400';
  if (percentage >= 60) return 'bg-gradient-to-r from-yellow-500 to-yellow-400';
  return 'bg-gradient-to-r from-red-500 to-red-400';
};

// Parse markdown table and extract score data
const parseScoreTable = (content: string): Array<{ category: string; score: number; max: number }> | null => {
  // Look for table pattern with Category and Score columns
  // Match table header with Category and Score, then capture all data rows
  const tableRegex = /(\|.*Category.*\|.*Score.*\|[\s\S]*?)(?=\n\n|\n#|\n\*\*|$)/;
  const match = content.match(tableRegex);
  
  if (!match) return null;
  
  const tableContent = match[1];
  const lines = tableContent.split('\n');
  
  // Find header row and separator row
  let headerFound = false;
  const scores: Array<{ category: string; score: number; max: number }> = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip separator rows (---)
    if (trimmed.includes('---') || trimmed.match(/^\|[\s\-:]+\|/)) {
      continue;
    }
    
    // Check if this is the header row
    if (trimmed.toLowerCase().includes('category') && trimmed.toLowerCase().includes('score')) {
      headerFound = true;
      continue;
    }
    
    // Parse data rows
    if (headerFound && trimmed.startsWith('|')) {
      const cells = trimmed.split('|').map(c => c.trim()).filter(c => c && c.length > 0);
      if (cells.length >= 2) {
        const category = cells[0];
        const scoreText = cells[1];
        const scoreData = extractScore(scoreText);
        
        if (scoreData && category.toLowerCase() !== 'category') {
          scores.push({
            category: category.replace(/\*\*/g, '').trim(), // Remove markdown bold
            score: scoreData.score,
            max: scoreData.max,
          });
        }
      }
    }
  }
  
  return scores.length > 0 ? scores : null;
};

export default function AIChatPage() {
  const navigate = useNavigate();
  const { applications } = useApplicationStore();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [mode, setMode] = useState<ChatMode>('critique');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Chat session state
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  useEffect(() => {
    fetchResumes();
    fetchChatSessions();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-save messages to current session (debounced)
  useEffect(() => {
    if (currentSessionId && messages.length > 0) {
      const timeoutId = setTimeout(() => {
        saveMessagesToSession();
      }, 1000); // Debounce by 1 second
      
      return () => clearTimeout(timeoutId);
    }
  }, [messages, currentSessionId]);

  const fetchChatSessions = async () => {
    try {
      setIsLoadingSessions(true);
      const sessions = await chatSessionsApi.getAll();
      setChatSessions(sessions);
    } catch (error) {
      console.error('Failed to fetch chat sessions:', error);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const saveMessagesToSession = async () => {
    if (!currentSessionId) return;
    
    try {
      const sessionMessages = messages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp.toISOString(),
      }));
      
      await chatSessionsApi.update(currentSessionId, {
        messages: sessionMessages,
      });
    } catch (error) {
      console.error('Failed to save messages:', error);
    }
  };

  const createNewChat = async () => {
    if (!selectedResume) {
      alert('Please select a resume first');
      return;
    }

    try {
      const newSession = await chatSessionsApi.create({
        mode,
        resume_id: selectedResume.id,
        application_id: selectedApplication?.id,
      });
      
      setCurrentSessionId(newSession.id);
      setMessages([]);
      await fetchChatSessions();
    } catch (error) {
      console.error('Failed to create chat session:', error);
      alert('Failed to create new chat. Please try again.');
    }
  };

  const loadChatSession = async (sessionId: number) => {
    try {
      const session = await chatSessionsApi.get(sessionId);
      setCurrentSessionId(session.id);
      setMode(session.mode);
      
      // Load messages from session
      const loadedMessages: Message[] = session.messages.map((msg, idx) => ({
        id: `${session.id}-${idx}`,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
      }));
      
      setMessages(loadedMessages);
      
      // Set resume and application if available
      if (session.resume_id) {
        const resume = resumes.find(r => r.id === session.resume_id);
        if (resume) setSelectedResume(resume);
      }
      if (session.application_id) {
        const app = applications.find(a => a.id === session.application_id);
        if (app) setSelectedApplication(app);
      }
    } catch (error) {
      console.error('Failed to load chat session:', error);
    }
  };

  const deleteChatSession = async (sessionId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this chat?')) return;

    try {
      await chatSessionsApi.delete(sessionId);
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
        setMessages([]);
      }
      await fetchChatSessions();
    } catch (error) {
      console.error('Failed to delete chat session:', error);
    }
  };

  const fetchResumes = async () => {
    try {
      const data = await resumesApi.getAll();
      setResumes(data);
      if (data.length > 0) {
        setSelectedResume(data.find(r => r.is_master) || data[0]);
      }
    } catch (error) {
      console.error('Failed to fetch resumes:', error);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // Create new session if none exists
    if (!currentSessionId) {
      await createNewChat();
      // Wait a bit for session to be created
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const data = await aiApi.chat({
        message: input,
        mode,
        resume_id: selectedResume?.id,
        application_id: selectedApplication?.id,
        conversation_history: messages.map(m => ({ role: m.role, content: m.content })),
      });
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartInterview = async () => {
    if (!selectedResume) {
      alert('Please select a resume first');
      return;
    }

    // Create new session
    const newSession = await chatSessionsApi.create({
      mode: 'interview',
      resume_id: selectedResume.id,
      application_id: selectedApplication?.id,
    });
    setCurrentSessionId(newSession.id);
    await fetchChatSessions();

    setMode('interview');
    setMessages([]);
    setIsLoading(true);

    try {
      const data = await aiApi.startInterview(selectedResume.id, selectedApplication?.id);
      const firstQuestion: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.question,
        timestamp: new Date(),
      };

      setMessages([firstQuestion]);
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to start interview');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartCritique = async () => {
    if (!selectedResume) {
      alert('Please select a resume first');
      return;
    }

    // Create new session
    const newSession = await chatSessionsApi.create({
      mode: 'critique',
      resume_id: selectedResume.id,
      application_id: selectedApplication?.id,
    });
    setCurrentSessionId(newSession.id);
    await fetchChatSessions();

    setMode('critique');
    setMessages([]);
    setIsLoading(true);

    try {
      const data = await aiApi.critiqueResume(selectedResume.id);
      const critique: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.critique,
        timestamp: new Date(),
      };

      setMessages([critique]);
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to get critique');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-gray-800/95 backdrop-blur-md border-b border-gray-700/50 flex-shrink-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate('/table')} 
                className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded-lg transition-colors"
                title="Back to Dashboard"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-purple-500 rounded-lg flex items-center justify-center shadow-lg">
                <Sparkles className="text-white" size={20} />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-gray-100 to-gray-300 bg-clip-text text-transparent">
                  AI Assistant
                </h1>
                <p className="text-xs text-gray-400 hidden sm:block">Resume critique & technical interview practice</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Chat History Sidebar */}
        <div className="w-64 border-r border-gray-700 bg-gray-800/60 backdrop-blur-sm flex flex-col flex-shrink-0">
          <div className="p-4 border-b border-gray-700/50">
            <button
              onClick={createNewChat}
              className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <Plus size={16} />
              New Chat
            </button>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800/50 p-2">
            {isLoadingSessions ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="animate-spin text-gray-400" size={20} />
              </div>
            ) : chatSessions.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                <MessageCircle className="mx-auto mb-2 opacity-50" size={32} />
                <p>No chat history</p>
                <p className="text-xs mt-1">Start a new chat to begin</p>
              </div>
            ) : (
              <div className="space-y-1">
                {chatSessions.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => loadChatSession(session.id)}
                    className={`group relative p-3 rounded-lg cursor-pointer transition-colors ${
                      currentSessionId === session.id
                        ? 'bg-purple-600/20 border border-purple-500/30'
                        : 'bg-gray-700/30 hover:bg-gray-700/50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {session.mode === 'critique' ? (
                            <FileText size={14} className="text-purple-400 flex-shrink-0" />
                          ) : (
                            <MessageSquare size={14} className="text-blue-400 flex-shrink-0" />
                          )}
                          <p className="text-sm font-medium text-gray-200 truncate">
                            {session.title}
                          </p>
                        </div>
                        <p className="text-xs text-gray-400">
                          {new Date(session.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={(e) => deleteChatSession(session.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-opacity"
                        title="Delete chat"
                      >
                        <Trash2 size={14} className="text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Settings Sidebar */}
        <div className="w-64 border-r border-gray-700 bg-gray-800/50 p-4 space-y-4 overflow-y-auto flex-shrink-0">
          {/* Resume Selection */}
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">Resume</label>
            <select
              value={selectedResume?.id || ''}
              onChange={(e) => {
                const resume = resumes.find(r => r.id === parseInt(e.target.value));
                setSelectedResume(resume || null);
              }}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 text-sm"
            >
              <option value="">Select resume...</option>
              {resumes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} {r.is_master && '(Master)'}
                </option>
              ))}
            </select>
          </div>

          {/* Application Selection (optional) */}
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">Job Application (Optional)</label>
            <select
              value={selectedApplication?.id || ''}
              onChange={(e) => {
                const app = applications.find(a => a.id === parseInt(e.target.value));
                setSelectedApplication(app || null);
              }}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 text-sm"
            >
              <option value="">None selected</option>
              {applications.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.company_name} - {a.role_title}
                </option>
              ))}
            </select>
          </div>

          {/* Mode Selection */}
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">Mode</label>
            <div className="space-y-2">
              <button
                onClick={() => {
                  setMode('critique');
                  setMessages([]);
                }}
                className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  mode === 'critique'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                }`}
              >
                <FileText size={16} />
                Resume Critique
              </button>
              <button
                onClick={() => {
                  setMode('interview');
                  setMessages([]);
                }}
                className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  mode === 'interview'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                }`}
              >
                <MessageSquare size={16} />
                Technical Interview
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="pt-4 border-t border-gray-700">
            <button
              onClick={handleStartCritique}
              disabled={!selectedResume || isLoading}
              className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Start Critique
            </button>
            <button
              onClick={handleStartInterview}
              disabled={!selectedResume || isLoading}
              className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Start Interview
            </button>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800/50">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full min-h-[60vh]">
                  <div className="text-center max-w-md">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-600 to-purple-500 flex items-center justify-center mx-auto mb-6">
                      <Sparkles className="text-white" size={32} />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-200 mb-3">AI Assistant</h3>
                    <p className="text-gray-400 mb-6">Get your resume critiqued or practice technical interviews</p>
                    <div className="grid grid-cols-1 gap-3">
                      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                        <FileText className="text-purple-400 mb-2" size={20} />
                        <h4 className="text-sm font-semibold text-gray-200 mb-1">Resume Critique</h4>
                        <p className="text-xs text-gray-400">Get detailed feedback from a senior recruiter</p>
                      </div>
                      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                        <MessageSquare className="text-purple-400 mb-2" size={20} />
                        <h4 className="text-sm font-semibold text-gray-200 mb-1">Technical Interview</h4>
                        <p className="text-xs text-gray-400">Practice with AI-powered questions and ratings</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                  {message.role === 'assistant' && (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-purple-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                      <Sparkles size={18} className="text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-3xl rounded-2xl px-5 py-4 shadow-lg ${
                      message.role === 'user'
                        ? 'bg-gradient-to-br from-purple-600 to-purple-500 text-white'
                        : 'bg-gray-800/90 text-gray-100 border border-gray-700/50'
                    }`}
                  >
                    {message.role === 'assistant' ? (
                      <div className="prose prose-invert prose-sm max-w-none">
                        {(() => {
                          // Check if this message contains a score table
                          const scoreData = parseScoreTable(message.content);
                          const hasScoreTable = scoreData !== null;
                          
                          // If score table found, render it separately
                          let processedContent = message.content;
                          if (hasScoreTable) {
                            // Remove the score table from markdown to avoid double rendering
                            processedContent = processedContent.replace(
                              /(\|.*Category.*\|.*Score.*\|[\s\S]*?)(?=\n\n|\n#|\n\*\*|$)/,
                              'SCORE_TABLE_PLACEHOLDER'
                            );
                          }
                          
                          return (
                            <>
                              {hasScoreTable && scoreData && (
                                <div className="my-6">
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {scoreData.map((item, idx) => {
                                      const percentage = (item.score / item.max) * 100;
                                      return (
                                        <div
                                          key={idx}
                                          className={`rounded-xl border-2 p-5 bg-gradient-to-br from-gray-800/60 to-gray-800/40 backdrop-blur-sm ${getScoreBgColor(item.score, item.max)} transition-all hover:scale-105 hover:shadow-lg`}
                                        >
                                          <div className="flex items-center justify-between mb-3">
                                            <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
                                              {item.category}
                                            </h4>
                                            <TrendingUp className={`${getScoreColor(item.score, item.max)}`} size={18} />
                                          </div>
                                          <div className="flex items-baseline gap-2 mb-3">
                                            <span className={`text-3xl font-bold ${getScoreColor(item.score, item.max)}`}>
                                              {item.score}
                                            </span>
                                            <span className="text-lg text-gray-400">/ {item.max}</span>
                                          </div>
                                          <div className="w-full bg-gray-700/50 rounded-full h-2 overflow-hidden">
                                            <div
                                              className={`h-full rounded-full transition-all duration-500 ${getProgressColor(item.score, item.max)}`}
                                              style={{ width: `${percentage}%` }}
                                            />
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                              <ReactMarkdown
                                components={{
                            h1: ({node, ...props}) => (
                              <h1 className="text-2xl font-bold mb-4 mt-6 text-gray-100 border-b border-gray-700/50 pb-2" {...props} />
                            ),
                            h2: ({node, ...props}) => (
                              <h2 className="text-xl font-semibold mb-3 mt-5 text-gray-100 flex items-center gap-2" {...props} />
                            ),
                            h3: ({node, ...props}) => (
                              <h3 className="text-lg font-semibold mb-2 mt-4 text-gray-200" {...props} />
                            ),
                            p: ({node, ...props}) => <p className="mb-3 leading-relaxed text-gray-200" {...props} />,
                            ul: ({node, ...props}) => (
                              <ul className="list-disc list-outside mb-3 space-y-2 text-gray-200 ml-4" {...props} />
                            ),
                            ol: ({node, ...props}) => (
                              <ol className="list-decimal list-outside mb-3 space-y-2 text-gray-200 ml-4" {...props} />
                            ),
                            li: ({node, ...props}) => <li className="text-gray-200 leading-relaxed" {...props} />,
                            strong: ({node, ...props}) => <strong className="font-semibold text-purple-300" {...props} />,
                            table: ({node, children, ...props}: any) => {
                              // Regular table rendering (score tables are handled separately)
                              return (
                                <div className="overflow-x-auto my-6 rounded-lg border border-gray-700/50 bg-gray-800/40">
                                  <table className="min-w-full" {...props}>{children}</table>
                                </div>
                              );
                            },
                            thead: ({node, ...props}) => <thead className="bg-gray-700/60" {...props} />,
                            tbody: ({node, ...props}) => <tbody className="divide-y divide-gray-700/50" {...props} />,
                            tr: ({node, ...props}) => (
                              <tr className="hover:bg-gray-700/20 transition-colors border-b border-gray-700/30 last:border-b-0" {...props} />
                            ),
                            th: ({node, ...props}) => (
                              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-200 bg-gray-700/40 first:rounded-tl-lg last:rounded-tr-lg" {...props} />
                            ),
                            td: ({node, ...props}) => (
                              <td className="px-6 py-3 text-sm text-gray-200 bg-gray-800/20" {...props} />
                            ),
                            code: ({node, ...props}) => <code className="bg-gray-700 px-1.5 py-0.5 rounded text-purple-300 text-sm" {...props} />,
                            blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-purple-500 pl-4 italic my-3 text-gray-300" {...props} />,
                                }}
                              >
                                {processedContent.replace(/SCORE_TABLE_PLACEHOLDER/g, '')}
                              </ReactMarkdown>
                            </>
                          );
                        })()}
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap leading-relaxed text-sm md:text-base">{message.content}</p>
                    )}
                  </div>
                  {message.role === 'user' && (
                    <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0 border-2 border-gray-600">
                      <span className="text-gray-200 text-xs font-medium">You</span>
                    </div>
                  )}
                  </div>
                ))
              )}
              {isLoading && (
                <div className="flex gap-4 justify-start">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-purple-500 flex items-center justify-center shadow-lg">
                    <Sparkles size={18} className="text-white" />
                  </div>
                  <div className="bg-gray-800/90 rounded-2xl px-5 py-4 border border-gray-700/50">
                    <Loader2 className="animate-spin text-purple-400" size={20} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area - Fixed at bottom */}
          <div className="border-t border-gray-700/50 bg-gray-800/95 backdrop-blur-sm p-4 flex-shrink-0">
            <form onSubmit={handleSend} className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex gap-3 items-end">
                <div className="flex-1 relative">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend(e);
                      }
                    }}
                    placeholder={mode === 'interview' ? 'Type your answer...' : 'Ask a question...'}
                    rows={1}
                    className="w-full px-5 py-4 bg-gray-700/80 border border-gray-600/50 rounded-xl text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800/50"
                    disabled={isLoading}
                  />
                </div>
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="px-6 py-4 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg hover:shadow-xl transition-all flex-shrink-0"
                >
                  <Send size={18} />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

