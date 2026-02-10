import { useState, useRef, useEffect } from 'react';
import './App.css';

function App() {
  // --- 1. Constants & Helper Functions ---
  const defaultWelcomeMessage = { 
    id: 1, 
    text: `สวัสดีครับ 🙏 ยินดีต้อนรับสู่ UP Chat ระบบผู้ช่วยตอบคำถามอัตโนมัติ พร้อมให้บริการครับ!

กรุณาเลือกหัวข้อที่ต้องการทราบ:

💰 เรื่องกองทุน (กยศ.) 
 พิมพ์ 'รายใหม่' (ปี 1 / กู้ครั้งแรก) 
 พิมพ์ 'รายเก่า' (กู้ต่อเนื่อง)

📅 เรื่องการเรียน 
 พิมพ์ 'ปฏิทิน' (ปฏิทินการศึกษา / วันเปิด-ปิดเทอม)`, 
    sender: "bot" 
  };

  const formatMessage = (text) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.split(urlRegex).map((part, index) => 
      part.match(urlRegex) 
        ? <a key={index} href={part} target="_blank" rel="noopener noreferrer">{part}</a> 
        : part
    );
  };

  // --- 2. State Management ---
  const [messages, setMessages] = useState([defaultWelcomeMessage]);
  const [currentChatId, setCurrentChatId] = useState(Date.now());
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState(() => JSON.parse(localStorage.getItem('upchat_history')) || []);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeMessageId, setActiveMessageId] = useState(null);

  const [userName, setUserName] = useState(() => localStorage.getItem('upchat_username') || "User");
  const [profileImage, setProfileImage] = useState(() => localStorage.getItem('upchat_profile_image') || null);

  const chatEndRef = useRef(null);
  const closeMenuTimer = useRef(null);
  const abortControllerRef = useRef(null);

  // --- 3. Effects ---
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isLoading]);

  useEffect(() => {
    if (messages.length <= 1) return;
    setChatHistory(prev => {
      const idx = prev.findIndex(item => item.id === currentChatId);
      if (idx > -1) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], messages };
        return updated;
      }
      const firstUserMsg = messages.find(m => m.sender === 'user');
      const title = firstUserMsg ? firstUserMsg.text : "New Chat";
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return [{ id: currentChatId, title: `${title} (${time})`, messages }, ...prev];
    });
  }, [messages, currentChatId]);

  useEffect(() => { localStorage.setItem('upchat_history', JSON.stringify(chatHistory)); }, [chatHistory]);
  useEffect(() => { if (profileImage) localStorage.setItem('upchat_profile_image', profileImage); }, [profileImage]);

  // --- 4. Handlers ---
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setProfileImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleCloseOverlay = (e) => {
    e.stopPropagation();
    setIsSidebarOpen(false);
    setShowSettings(false);
  };

  const handleNewChat = () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    setIsLoading(false);
    setMessages([defaultWelcomeMessage]);
    setCurrentChatId(Date.now());
    setIsSidebarOpen(false);
    setShowSettings(false);
    setActiveMessageId(null);
  };

  const deleteHistoryItem = (e, id) => {
    e.stopPropagation();
    const newHistory = chatHistory.filter(item => item.id !== id);
    setChatHistory(newHistory);
    if (id === currentChatId) handleNewChat();
  };

  const clearAllHistory = () => {
    if (window.confirm("⚠️ ยืนยันล้างประวัติทั้งหมด?")) {
      setChatHistory([]);
      localStorage.removeItem('upchat_history');
      handleNewChat();
    }
  };

  const handleLoadHistory = (item) => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    setIsLoading(false);
    setMessages(item.messages);
    setCurrentChatId(item.id);
    setIsSidebarOpen(false);
  };

  const handleEditMessage = (e, id, text) => {
    e.stopPropagation();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setInput(text);
    setActiveMessageId(null);
    setMessages(prev => {
      const index = prev.findIndex(m => m.id === id);
      if (index !== -1) {
        const newMsgs = [...prev];
        const nextMsg = newMsgs[index + 1];
        newMsgs.splice(index, (nextMsg && nextMsg.sender === 'bot') ? 2 : 1);
        return newMsgs;
      }
      return prev;
    });
    document.querySelector('.input-wrapper input')?.focus();
  };

  const handleMessageClick = (id) => {
    if (isSidebarOpen) return;
    setActiveMessageId(prev => prev === id ? null : id);
  };

  const handleSend = async () => {
    if (input.trim() === "") return;
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const userInput = input;
    setMessages(prev => [...prev, { id: Date.now(), text: userInput, sender: "user" }]);
    setInput("");
    setIsLoading(true);
    setActiveMessageId(null);

    try {
      const response = await fetch('https://upchat-bn.onrender.com/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userInput }),
        signal: controller.signal
      });
      const data = await response.json();
      setMessages(prev => [...prev, { id: Date.now() + 1, text: data.text, sender: "bot" }]);
    } catch (error) {
      if (error.name !== 'AbortError') {
        setMessages(prev => [...prev, { id: Date.now() + 1, text: "เชื่อมต่อ Server ไม่ได้ครับ", sender: "bot" }]);
      }
    } finally {
      if (abortControllerRef.current === controller) {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    }
  };

  return (
    <div className="app-container" onClick={() => setActiveMessageId(null)}>
      <div className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`} onClick={handleCloseOverlay} />

      <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`} onClick={(e) => e.stopPropagation()}>
        <button className="new-chat-btn" onClick={handleNewChat}><span>+</span> New chat</button>
        <div className="history-label">History</div>
        <div className="history-list">
          {chatHistory.map((item) => (
            <div key={item.id} className={`history-item ${item.id === currentChatId ? 'active-history' : ''}`} onClick={() => handleLoadHistory(item)}>
              <span className="truncate">💬 {item.title}</span>
              <button className="del-btn" onClick={(e) => deleteHistoryItem(e, item.id)}>🗑️</button>
            </div>
          ))}
        </div>
        <div className="sidebar-footer"
             onMouseEnter={() => window.innerWidth > 768 && setShowSettings(true)}
             onMouseLeave={() => { if(window.innerWidth > 768) closeMenuTimer.current = setTimeout(() => setShowSettings(false), 300); }}
        >
          <div className={`settings-popup ${showSettings ? 'show' : ''}`} onMouseEnter={() => clearTimeout(closeMenuTimer.current)}>
            <label className="menu-item" htmlFor="footer-file-upload">
              <div className="menu-avatar">
                {profileImage ? <img src={profileImage} alt="Me" /> : userName[0]?.toUpperCase()}
              </div>
              <span>Change Avatar</span>
              <input id="footer-file-upload" type="file" accept="image/*" onChange={handleImageUpload} style={{display: 'none'}} />
            </label>
            <div className="menu-divider"></div>
            <button className="menu-item danger" onClick={clearAllHistory}>🗑️ Clear History</button>
          </div>
          <button className={`settings-btn ${showSettings ? 'active' : ''}`} onClick={() => setShowSettings(!showSettings)}>⚙️ Settings</button>
        </div>
      </div>

      <div className="chat-window">
        <div className="chat-header" onClick={(e) => e.stopPropagation()}>
          <button className="menu-btn" onClick={() => setIsSidebarOpen(true)}>☰</button>
          <h3>🟣 UP Chat</h3>
        </div>

        <div className="chat-body">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`message-bubble ${msg.sender === "user" ? "user-msg" : "bot-msg"} ${activeMessageId === msg.id ? 'active' : ''}`}
              onClick={(e) => { e.stopPropagation(); handleMessageClick(msg.id); }}
            >
              <div className="avatar" style={{ backgroundColor: msg.sender === 'user' ? (profileImage ? 'transparent' : '#7b2cbf') : '#19c37d' }}>
                {msg.sender === 'user' && profileImage ? 
                  <img src={profileImage} alt="User" className="avatar-img" /> : 
                  (msg.sender === 'user' ? userName[0].toUpperCase() : 'AI')}
              </div>
              
              {/* 🔥 จัด Layout ใหม่: ให้ปุ่มกับข้อความอยู่บรรทัดเดียวกัน */}
              <div className="message-content-wrapper" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                
                {/* 🔥 ย้ายปุ่ม Edit มาไว้ "ด้านหน้า" (ซ้ายมือของข้อความ) */}
                {msg.sender === 'user' && (
                  <button className="icon-btn-inline" onClick={(e) => handleEditMessage(e, msg.id, msg.text)} title="แก้ไข">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                  </button>
                )}

                <div className="message-text">
                  {formatMessage(msg.text)}
                </div>

              </div>
            </div>
          ))}
          {isLoading && (
            <div className="message-bubble bot-msg">
              <div className="avatar" style={{backgroundColor: '#19c37d'}}>AI</div>
              <div className="message-text">...</div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="chat-input-area" onClick={(e) => e.stopPropagation()}>
          <div className="input-wrapper">
            <input type="text" placeholder="ถามมาได้เลยครับ..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} />
            <button onClick={handleSend}>➤</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;