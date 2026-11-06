import { useState, useRef, useEffect } from 'react';
import { api } from './api';
import { Send, Bot, User, Paperclip, Sparkles, ChevronDown, StopCircle, Copy, Check, AlertCircle } from 'lucide-react';

export default function AIChat({ user, contextData }) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Привет! Я твой AI-ассистент. Помогу с идеями для видео, подсчётом окупаемости тематик или анализом текущей статистики. С чего начнём?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const sendMessage = async (e) => {
    e?.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMsg = { id: Date.now().toString(), role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    const trimmed = input.trim();
    setInput('');
    setError('');
    setIsTyping(true);

    try {
      // Формируем системный промпт с контекстом
      let systemPrompt = 'Ты — ассистент партнёрской программы. Твоя цель — помогать пользователю достигать финансовых целей и анализировать данные.';
      
      if (contextData) {
        const { goal, ideas, stats, daysLeft } = contextData;
        systemPrompt += `\n\nТекущий контекст:`;
        if (goal) {
          systemPrompt += `\n- Финансовая цель: "${goal.title}" на сумму $${goal.targetAmount}. Дедлайн через ${daysLeft} дн.`;
        } else {
          systemPrompt += `\n- Финансовая цель: не установлена.`;
        }
        systemPrompt += `\n- Всего выплачено: $${stats?.totalRevenue || 0}.`;
        systemPrompt += `\n- Ставки по тематикам: ${JSON.stringify(stats?.categories || {})}.`;
        if (ideas && ideas.length > 0) {
          systemPrompt += `\n- Запланированные идеи на календаре: ${ideas.map(i => `[${i.date}] ${i.title}`).join('; ')}.`;
        }
        systemPrompt += `\n\nЕсли пользователь спрашивает, сколько нужно просмотров в день, рассчитай это по формуле: (Остаток суммы / курс тематики) / дни. Отвечай кратко, по делу, с конкретными цифрами.`;
      }

      const history = [
        { role: 'system', content: systemPrompt },
        ...messages.filter(m => m.id !== 'welcome').map(({ role, content }) => ({ role, content })),
        { role: 'user', content: trimmed }
      ];

      const res = await api.chat(history);

      setMessages(prev => [...prev, {
        id: Date.now().toString() + '-ai',
        role: 'assistant',
        content: res.content || 'Пустой ответ'
      }]);
    } catch (err) {
      setError(err.message || 'Ошибка подключения к RouterAI');
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-surface border border-line rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-6 py-3 border-b border-line bg-elevated">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#ededed] to-[#ff8a65] flex items-center justify-center shadow-lg shadow-[#ededed]/20">
            <Sparkles size={16} className="text-primary-foreground" />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">AI Ассистент</div>
            <div className="text-[10px] text-muted font-mono">RouterAI · GPT · Онлайн</div>
          </div>
        </div>
        <button className="flex items-center gap-1.5 text-xs text-muted hover:text-foreground transition-colors bg-elevated px-2.5 py-1.5 rounded-lg">
          <Bot size={14} /> Модель <ChevronDown size={12} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center mt-1 ${
              msg.role === 'user' ? 'bg-elevated text-foreground' : 'bg-primary/10 text-foreground border border-foreground/30'
            }`}>
              {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
            </div>

            <div className={`flex flex-col max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-medium text-foreground">
                  {msg.role === 'user' ? user?.username || 'Вы' : 'AI Ассистент'}
                </span>
              </div>
              <div className={`p-3.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user' 
                  ? 'bg-elevated text-foreground rounded-tr-sm'
                  : 'bg-elevated text-foreground border border-line rounded-tl-sm'
              }`}>
                {msg.content}
              </div>

              {msg.role === 'assistant' && (
                <div className="flex items-center gap-3 mt-2 px-1">
                  <button onClick={() => handleCopy(msg.id, msg.content)} className="text-subtle hover:text-foreground transition-colors" title="Копировать">
                    {copiedId === msg.id ? <Check size={14} className="text-foreground" /> : <Copy size={14} />}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-4">
            <div className="w-8 h-8 shrink-0 rounded-full bg-primary/10 text-foreground border border-foreground/30 flex items-center justify-center mt-1">
              <Bot size={14} />
            </div>
            <div className="bg-elevated border border-line p-4 rounded-2xl rounded-tl-sm flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-surface border-t border-line">
        <form onSubmit={sendMessage} className="flex items-end gap-2 bg-elevated border border-line rounded-xl p-2 focus-within:border-foreground/50 transition-colors">
          <button type="button" className="p-2 text-subtle hover:text-foreground transition-colors shrink-0">
            <Paperclip size={18} />
          </button>
          
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Спросите что-нибудь..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder-gray-500 outline-none resize-none max-h-32 min-h-[36px] py-2 scrollbar-hide"
            rows={1}
          />
          
          <button 
            type="submit"
            disabled={!input.trim() || isTyping}
            className={`p-2 rounded-lg shrink-0 transition-opacity ${input.trim() && !isTyping ? 'bg-primary text-primary-foreground hover:opacity-90' : 'bg-elevated text-subtle'}`}
          >
            {isTyping ? <StopCircle size={16} /> : <Send size={16} />}
          </button>
        </form>
        <div className="text-center mt-2 text-[10px] text-subtle font-mono">
          AI может допускать ошибки. Проверяйте важную информацию.
        </div>
      </div>
    </div>
  );
}