// pages/index.js
import { useState, useRef, useEffect, useCallback } from 'react';
import Head from 'next/head';

const QUICK_PROMPTS = [
  'What does my Lagna say about me?',
  'Tell me about my current dasha period',
  'Which planets are strong in my chart?',
  'What yogas are present in my kundali?',
  'How are my career prospects?',
  'What about my love & marriage?',
  'Are any planets retrograde in my chart?',
  'What remedies do you suggest for me?',
];

// Simple planet abbreviations for display
function extractPlanetSummary(kundaliData) {
  if (!kundaliData?.planets) return null;
  const planets = kundaliData.planets;
  if (!Array.isArray(planets)) return null;
  return planets.slice(0, 6).map(p => ({
    name: p.name || p.planet,
    sign: p.sign || p.rasi,
    house: p.house,
    isRetro: p.is_retrograde || p.retro,
  }));
}

function extractAscendant(kundaliData) {
  if (kundaliData?.ascendant?.ascending_sign) return kundaliData.ascendant.ascending_sign;
  const planets = kundaliData?.planets;
  if (Array.isArray(planets)) {
    const lagna = planets.find(p =>
      p.name === 'Ascendant' || p.planet === 'Ascendant' || p.name === 'Lagna'
    );
    if (lagna) return lagna.sign || lagna.rasi;
  }
  return null;
}

function extractCurrentDasha(kundaliData) {
  if (kundaliData?.currentDasha?.major_dasha) return kundaliData.currentDasha.major_dasha;
  if (kundaliData?.currentDasha?.current_mahadasha) return kundaliData.currentDasha.current_mahadasha;
  return null;
}

export default function Home() {
  // Birth info form
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [tob, setTob] = useState('');
  const [pob, setPob] = useState('');
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [tzone, setTzone] = useState('5.5');

  // App state
  const [kundaliData, setKundaliData] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [kundaliStatus, setKundaliStatus] = useState(null); // null | 'loading' | 'success' | 'error'
  const [kundaliError, setKundaliError] = useState('');

  // Chat state
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState('');

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Parse date/time
  function parseBirthDateTime() {
    if (!dob || !tob) return null;
    const [year, month, day] = dob.split('-').map(Number);
    const [hour, minute] = tob.split(':').map(Number);
    return { day, month, year, hour, minute };
  }

  async function handleFetchKundali(e) {
    e.preventDefault();
    if (!name || !dob || !tob || !lat || !lon) {
      setKundaliError('Please fill in all required fields');
      setKundaliStatus('error');
      return;
    }

    setKundaliStatus('loading');
    setKundaliError('');
    setMessages([]);

    const dt = parseBirthDateTime();
    if (!dt) {
      setKundaliStatus('error');
      setKundaliError('Invalid date or time');
      return;
    }

    try {
      const res = await fetch('/api/kundali', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, pob, lat, lon, tzone,
          ...dt,
        }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to fetch kundali');

      setKundaliData(data.data);
      setUserInfo(data.userInfo);
      setKundaliStatus('success');

      // Trigger AI greeting
      triggerGreeting(data.data, data.userInfo);
    } catch (err) {
      setKundaliStatus('error');
      setKundaliError(err.message);
    }
  }

  async function triggerGreeting(kData, uInfo) {
    setIsSending(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [],
          kundaliContext: kData,
          userInfo: uInfo,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessages([{ role: 'assistant', content: data.reply }]);
    } catch (err) {
      setMessages([{
        role: 'assistant',
        content: `Namaste, ${uInfo?.name || 'dear one'}! 🙏 I have received your birth details. I'm ready to explore your cosmic blueprint with you. What would you like to know about your Kundali?`,
      }]);
    }
    setIsSending(false);
  }

  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || isSending) return;
    if (!kundaliData) {
      setChatError('Please fetch your Kundali first using the form on the left.');
      return;
    }

    const userMsg = { role: 'user', content: text.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputText('');
    setChatError('');
    setIsSending(true);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          kundaliContext: kundaliData,
          userInfo,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      setChatError('Failed to get response: ' + err.message);
    }
    setIsSending(false);
  }, [messages, kundaliData, userInfo, isSending]);

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputText);
    }
  }

  function handleTextareaChange(e) {
    setInputText(e.target.value);
    // Auto-grow
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  }

  const planetSummary = extractPlanetSummary(kundaliData);
  const ascendant = extractAscendant(kundaliData);
  const currentDasha = extractCurrentDasha(kundaliData);

  return (
    <>
      <Head>
        <title>Jyotish AI — Vedic Astrology Oracle</title>
        <meta name="description" content="Your personal Vedic astrology guide powered by AI" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🔮</text></svg>" />
      </Head>

      <div className="app-container">
        <header className="header">
          <div className="header-ornament">✦ Vedic Wisdom ✦</div>
          <h1>JYOTISH AI</h1>
          <p className="header-subtitle">Your Personal Vedic Astrology Oracle</p>
          <div className="header-divider" />
        </header>

        <div className="main-layout">
          {/* Left panel: birth info form */}
          <aside>
            <div className="panel">
              <div className="panel-title">✦ Birth Details</div>

              <form onSubmit={handleFetchKundali}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Your name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Date of Birth</label>
                  <input
                    className="form-input"
                    type="date"
                    value={dob}
                    onChange={e => setDob(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Time of Birth</label>
                  <input
                    className="form-input"
                    type="time"
                    value={tob}
                    onChange={e => setTob(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Place of Birth</label>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="City, Country"
                    value={pob}
                    onChange={e => setPob(e.target.value)}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Latitude</label>
                    <input
                      className="form-input"
                      type="number"
                      step="0.0001"
                      placeholder="e.g. 28.6139"
                      value={lat}
                      onChange={e => setLat(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Longitude</label>
                    <input
                      className="form-input"
                      type="number"
                      step="0.0001"
                      placeholder="e.g. 77.2090"
                      value={lon}
                      onChange={e => setLon(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Timezone (UTC offset)</label>
                  <input
                    className="form-input"
                    type="number"
                    step="0.5"
                    placeholder="e.g. 5.5 for IST"
                    value={tzone}
                    onChange={e => setTzone(e.target.value)}
                  />
                </div>

                <button
                  className="btn-primary"
                  type="submit"
                  disabled={kundaliStatus === 'loading'}
                >
                  {kundaliStatus === 'loading' ? '⟳ Reading the Stars...' : '✦ Cast My Kundali'}
                </button>
              </form>

              {kundaliStatus === 'loading' && (
                <div className="status-badge loading">
                  <span className="pulse-dot" />
                  Consulting the celestial map…
                </div>
              )}

              {kundaliStatus === 'error' && (
                <div className="status-badge error">
                  ⚠ {kundaliError}
                </div>
              )}

              {kundaliStatus === 'success' && (
                <div className="status-badge success">
                  ✓ Kundali retrieved successfully
                </div>
              )}

              {/* Kundali Summary */}
              {kundaliData && (
                <div className="kundali-summary" style={{ marginTop: 16 }}>
                  {ascendant && (
                    <div className="kundali-summary-row">
                      <span>Lagna (Asc)</span>
                      <span>{ascendant}</span>
                    </div>
                  )}
                  {currentDasha && (
                    <div className="kundali-summary-row">
                      <span>Mahadasha</span>
                      <span>{currentDasha}</span>
                    </div>
                  )}
                  {planetSummary && planetSummary.map((p, i) => (
                    <div key={i} className="kundali-summary-row">
                      <span>{p.name}</span>
                      <span>{p.sign}{p.house ? ` (H${p.house})` : ''}{p.isRetro ? ' ℞' : ''}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Tips */}
              {!kundaliData && (
                <div className="tip-row" style={{ marginTop: 16 }}>
                  <p style={{ fontSize: '12px', color: 'var(--text-dim)', fontStyle: 'italic', marginBottom: 6 }}>Tips for accurate readings:</p>
                  {[
                    'Exact birth time gives best results',
                    'Use decimal for timezone (5.5 = IST)',
                    'Use Google Maps for lat/lon',
                  ].map((tip, i) => (
                    <div key={i} className="tip-item">
                      <span className="tip-icon">◆</span>
                      <span>{tip}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>

          {/* Right panel: chat */}
          <div className="chat-panel">
            {messages.length === 0 ? (
              <div className="empty-chat">
                <div className="empty-chat-icon">🔮</div>
                <h3>The Oracle Awaits</h3>
                <p>Enter your birth details and cast your Kundali to begin your astrological journey.</p>
                {kundaliData && (
                  <>
                    <p style={{ marginTop: 8 }}>Or ask a question to begin:</p>
                    <div className="quick-prompts">
                      {QUICK_PROMPTS.slice(0, 4).map((q, i) => (
                        <button key={i} className="quick-prompt-btn" onClick={() => sendMessage(q)}>
                          {q}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="chat-messages">
                {messages.map((msg, i) => (
                  <div key={i} className={`message ${msg.role}`}>
                    <div className="message-avatar">
                      {msg.role === 'user' ? '👤' : '🔮'}
                    </div>
                    <div className="message-bubble">
                      {msg.content.split('\n').map((line, j) => (
                        <span key={j}>
                          {line}
                          {j < msg.content.split('\n').length - 1 && <br />}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}

                {isSending && (
                  <div className="message assistant">
                    <div className="message-avatar">🔮</div>
                    <div className="message-bubble">
                      <div className="typing-indicator">
                        <div className="typing-dot" />
                        <div className="typing-dot" />
                        <div className="typing-dot" />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}

            {/* Quick prompts when kundali is loaded and chat has started */}
            {kundaliData && messages.length > 0 && messages.length < 3 && (
              <div style={{ padding: '8px 16px', display: 'flex', flexWrap: 'wrap', gap: '6px', borderTop: '1px solid var(--border)' }}>
                {QUICK_PROMPTS.slice(0, 5).map((q, i) => (
                  <button key={i} className="quick-prompt-btn" onClick={() => sendMessage(q)}>
                    {q}
                  </button>
                ))}
              </div>
            )}

            {chatError && (
              <div style={{ padding: '8px 20px' }}>
                <div className="status-badge error">⚠ {chatError}</div>
              </div>
            )}

            <div className="chat-input-area">
              <textarea
                ref={textareaRef}
                className="chat-textarea"
                rows={1}
                placeholder={kundaliData ? 'Ask about your planets, dashas, yogas, remedies…' : 'Cast your Kundali first to start chatting…'}
                value={inputText}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                disabled={!kundaliData || isSending}
              />
              <button
                className="btn-send"
                onClick={() => sendMessage(inputText)}
                disabled={!kundaliData || isSending || !inputText.trim()}
                title="Send message"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
