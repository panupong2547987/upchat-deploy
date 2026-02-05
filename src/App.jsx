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

  const [chatHistory, setChatHistory] = useState(() => {
    const savedHistory = localStorage.getItem('upchat_history');
    return savedHistory ? JSON.parse(savedHistory) : [];
  });

  const [messages, setMessages] = useState([defaultWelcomeMessage]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const [userName, setUserName] = useState(() => {
    return localStorage.getItem('upchat_username') || "User";
  });

  const [profileImage, setProfileImage] = useState(() => {
    return localStorage.getItem('upchat_profile_image') || null;
  });

  const [showSettings, setShowSettings] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (messages.length <= 1) return;
    setChatHistory(prevHistory => {
      const existingIndex = prevHistory.findIndex(item => item.id === currentChatId);
      if (existingIndex > -1) {
        const updatedHistory = [...prevHistory];
        updatedHistory[existingIndex] = { ...updatedHistory[existingIndex], messages: messages };
        return updatedHistory;
      } else {
        const firstUserMessage = messages.find(m => m.sender === 'user');
        const title = firstUserMessage ? firstUserMessage.text : "New Chat";
        const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const newItem = { id: currentChatId, title: `${title} (${timeString})`, messages: messages };
        return [newItem, ...prevHistory];
      }
    });
  }, [messages, currentChatId]);

  useEffect(() => {
    localStorage.setItem('upchat_history', JSON.stringify(chatHistory));
  }, [chatHistory]);

  useEffect(() => {
    if (profileImage) {
      localStorage.setItem('upchat_profile_image', profileImage);
    } else {
      localStorage.removeItem('upchat_profile_image');
    }
  }, [profileImage]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNewChat = () => {
    setMessages([defaultWelcomeMessage]);
    setCurrentChatId(Date.now());
    setIsSidebarOpen(false);
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

  const handleLoadHistory = (historyItem) => {
    setMessages(historyItem.messages);
    setCurrentChatId(historyItem.id);
    setIsSidebarOpen(false);
  };

  const handleSend = async () => {
    if (input.trim() === "") return;
    const userMessage = { id: Date.now(), text: input, sender: "user" };
    setMessages((prev) => [...prev, userMessage]);
    const userInput = input;
    setInput("");
    setIsLoading(true);

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
    <div className="app-container">
      <div className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`} onClick={() => setIsSidebarOpen(false)} />

      <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <button className="new-chat-btn" onClick={handleNewChat}><span>+</span> New chat</button>
        <div className="history-label" style={{padding: '10px 12px', fontSize: '0.75rem', color: '#8e8ea0'}}>History</div>
        <div className="history-list">
          {chatHistory.map((item) => (
            <div key={item.id} className={`history-item ${item.id === currentChatId ? 'active-history' : ''}`} onClick={() => handleLoadHistory(item)} style={{ backgroundColor: item.id === currentChatId ? '#343541' : '' }}>
              <span className="truncate">💬 {item.title}</span>
              <button className="del-btn" onClick={(e) => deleteHistoryItem(e, item.id)}>🗑️</button>
            </div>
          ))}
        </div>

        {/* 🟢 ส่วน Footer: เพิ่มลูกเล่น Hover ตรงนี้ */}
        <div 
          className="sidebar-footer"
          // เฉพาะในคอม: เมาส์ชี้ = เปิด, เมาส์ออก = ปิด
          onMouseEnter={() => window.innerWidth > 768 && setShowSettings(true)}
          onMouseLeave={() => window.innerWidth > 768 && setShowSettings(false)}
        >
          {/* เมนู Pop-up */}
          <div className={`settings-popup ${showSettings ? 'show' : ''}`}>
            
            <label className="menu-item" htmlFor="footer-file-upload">
              <div className="menu-avatar">
                {profileImage ? <img src={profileImage} alt="Me" /> : userName[0]?.toUpperCase()}
              </div>
              <span>Change Avatar</span>
              <input id="footer-file-upload" type="file" accept="image/*" onChange={handleImageUpload} style={{display: 'none'}} />
            </label>

            <div className="menu-divider"></div>

            <button className="menu-item danger" onClick={clearAllHistory}>
              🗑️ Clear History
            </button>
          </div>

          {/* ปุ่ม Settings (ยังกดคลิกได้ปกติ สำหรับมือถือ) */}
          <button 
            className={`settings-btn ${showSettings ? 'active' : ''}`} 
            onClick={() => setShowSettings(!showSettings)}
          >
            ⚙️ Settings
          </button>
        </div>
      </div>

      <div className="chat-window">
        <div className="chat-header">
          <button className="menu-btn" onClick={() => setIsSidebarOpen(true)}>☰</button>
          <h3>🟣 UP Chat</h3>
        </div>
        <div className="chat-body">
          {messages.map((msg) => (
            <div key={msg.id} className={`message-bubble ${msg.sender === "user" ? "user-msg" : "bot-msg"}`}>
              <div className="avatar" style={{ backgroundColor: msg.sender === 'user' ? (profileImage ? 'transparent' : '#7b2cbf') : '#19c37d' }}>
                {msg.sender === 'user' && profileImage ? (
                  <img src={profileImage} alt="User" className="avatar-img" />
                ) : (
                  msg.sender === 'user' ? userName[0].toUpperCase() : 'AI'
                )}
              </div>
              <div className="message-text">{formatMessage(msg.text)}</div>
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
        <div className="chat-input-area">
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