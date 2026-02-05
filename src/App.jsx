import { useState, useRef, useEffect } from 'react';
import './App.css';

function App() {
  const formatMessage = (text) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return <a key={index} href={part} target="_blank" rel="noopener noreferrer" style={{ color: '#19c37d', textDecoration: 'underline' }}>{part}</a>;
      }
      return part;
    });
  };

  const defaultWelcomeMessage = { 
    id: 1, 
    text: `สวัสดีครับ 🙏 ยินดีต้อนรับสู่ UP Chat ระบบผู้ช่วยตอบคำถามอัตโนมัติ พร้อมให้บริการครับ!

กรุณาเลือกหัวข้อที่ต้องการทราบ:

💰 เรื่องกองทุน (กยศ.) 
1️⃣ พิมพ์ 'รายใหม่' (ปี 1 / กู้ครั้งแรก) 
2️⃣ พิมพ์ 'รายเก่า' (กู้ต่อเนื่อง)

📅 เรื่องการเรียน 
3️⃣ พิมพ์ 'ปฏิทิน' (ปฏิทินการศึกษา / วันเปิด-ปิดเทอม)`, 
    sender: "bot" 
  };

  const [currentChatId, setCurrentChatId] = useState(Date.now());
  const [messages, setMessages] = useState([defaultWelcomeMessage]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Settings & Sidebar
  const [showSettings, setShowSettings] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const chatEndRef = useRef(null);
  const closeMenuTimer = useRef(null);

  // 🟢 State สำหรับจำว่าข้อความไหนถูกกด (สำหรับมือถือ)
  const [activeMessageId, setActiveMessageId] = useState(null);

  // User Data
  const [userName, setUserName] = useState(() => localStorage.getItem('upchat_username') || "User");
  const [profileImage, setProfileImage] = useState(() => localStorage.getItem('upchat_profile_image') || null);
  
  const [chatHistory, setChatHistory] = useState(() => {
    const saved = localStorage.getItem('upchat_history');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (messages.length <= 1) return;
    setChatHistory(prev => {
      const idx = prev.findIndex(item => item.id === currentChatId);
      if (idx > -1) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], messages: messages };
        return updated;
      } else {
        const firstUserMsg = messages.find(m => m.sender === 'user');
        const title = firstUserMsg ? firstUserMsg.text : "New Chat";
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return [{ id: currentChatId, title: `${title} (${time})`, messages }, ...prev];
      }
    });
  }, [messages, currentChatId]);

  useEffect(() => { localStorage.setItem('upchat_history', JSON.stringify(chatHistory)); }, [chatHistory]);
  useEffect(() => { if (profileImage) localStorage.setItem('upchat_profile_image', profileImage); }, [profileImage]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setProfileImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleNewChat = () => {
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
    if(window.confirm("⚠️ ยืนยันล้างประวัติทั้งหมด?")) {
      setChatHistory([]);
      localStorage.removeItem('upchat_history');
      handleNewChat();
      setShowSettings(false);
    }
  };

  const handleLoadHistory = (item) => {
    setMessages(item.messages);
    setCurrentChatId(item.id);
    setIsSidebarOpen(false);
  };

  const handleExportPDF = () => {
    setShowSettings(false);
    setTimeout(() => window.print(), 300);
  };

  const handleEditMessage = (e, id, text) => {
    e.stopPropagation(); // ป้องกันไม่ให้ไป trigger การกดที่ bubble
    setInput(text);
    setActiveMessageId(null); // ปิดเมนู
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

  const handleCopyMessage = (e, text) => {
    e.stopPropagation(); // ป้องกันไม่ให้ไป trigger การกดที่ bubble
    navigator.clipboard.writeText(text);
    setActiveMessageId(null); // ปิดเมนูหลังจากก๊อปเสร็จ
    alert("คัดลอกเรียบร้อย! ✅");
  };

  // 🟢 ฟังก์ชันเมื่อกดที่ข้อความ (Toggle เมนู)
  const handleMessageClick = (id) => {
    // ถ้ากดตัวเดิมให้ปิด ถ้ากดตัวใหม่ให้เปิด
    setActiveMessageId(prev => prev === id ? null : id);
  };

  const handleSend = async () => {
    if (input.trim() === "") return;
    const userMessage = { id: Date.now(), text: input, sender: "user" };
    setMessages((prev) => [...prev, userMessage]);
    const userInput = input;
    setInput("");
    setIsLoading(true);
    setActiveMessageId(null); // ปิดเมนูค้างเก่า (ถ้ามี)

    try {
      const response = await fetch('https://upchat-bn.onrender.com/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userInput })
      });
      const data = await response.json();
      const botMessage = { id: Date.now() + 1, text: data.text, sender: "bot" };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      setMessages((prev) => [...prev, { id: Date.now() + 1, text: "เชื่อมต่อ Server ไม่ได้ครับ", sender: "bot" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container" onClick={() => setActiveMessageId(null)}> 
      {/* 👆 ใส่ onClick ที่ container เพื่อให้แตะที่ว่างแล้วเมนูหุบลง */}
      
      <div className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); setIsSidebarOpen(false); }} />

      <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`} onClick={(e) => e.stopPropagation()}>
        <button className="new-chat-btn" onClick={handleNewChat}><span>+</span> New chat</button>
        <div className="history-label" style={{padding: '10px 12px', fontSize: '0.75rem', color: '#8e8ea0'}}>History</div>
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
            <button className="menu-item" onClick={handleExportPDF}>📄 Save as PDF</button>
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
              onClick={(e) => { e.stopPropagation(); handleMessageClick(msg.id); }} // กดแล้ว Toggle เมนู
            >
              <div className="avatar" style={{ backgroundColor: msg.sender === 'user' ? (profileImage ? 'transparent' : '#7b2cbf') : '#19c37d' }}>
                {msg.sender === 'user' && profileImage ? <img src={profileImage} alt="User" className="avatar-img" /> : (msg.sender === 'user' ? userName[0].toUpperCase() : 'AI')}
              </div>
              
              <div className="message-text">
                {formatMessage(msg.text)}
                
                {/* 🟢 Action Buttons */}
                <div className="message-actions">
                  <button className="action-btn" onClick={(e) => handleCopyMessage(e, msg.text)} title="คัดลอก">📋</button>
                  {msg.sender === 'user' && (
                    <button className="action-btn" onClick={(e) => handleEditMessage(e, msg.id, msg.text)} title="แก้ไข">✏️</button>
                  )}
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