import { useState, useRef, useEffect } from 'react';
import './App.css';

function App() {
  // 🟢 ฟังก์ชันช่วยแปลงลิงก์
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

  // 📝 ข้อความต้อนรับมาตรฐาน
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

  // 1. 💾 State: ประวัติแชท (Smart Merge: ไม่สร้างซ้ำถ้าหัวข้อเดิม)
  const [chatHistory, setChatHistory] = useState(() => {
    const savedHistory = localStorage.getItem('upchat_history');
    let parsedHistory = savedHistory ? JSON.parse(savedHistory) : [];

    const lastSession = localStorage.getItem('upchat_current_messages');
    if (lastSession) {
      const parsedSession = JSON.parse(lastSession);
      
      if (parsedSession.length > 1) {
        const firstUserMessage = parsedSession.find(m => m.sender === 'user');
        const baseTitle = firstUserMessage ? firstUserMessage.text : "แชทตกค้าง"; 
        
        // 🟢 เช็คว่าประวัติล่าสุด หัวข้อเหมือนกันไหม? (เช็คจากข้อความแรก)
        const isSameSession = parsedHistory.length > 0 && 
                              parsedHistory[0].title.startsWith(baseTitle);

        if (isSameSession) {
          // 🔄 ถ้าเหมือน: อัปเดตข้อความและเวลาของอันเดิม
          parsedHistory[0].messages = parsedSession;
          parsedHistory[0].title = `${baseTitle} (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;
        } else {
          // 🆕 ถ้าไม่เหมือน: สร้างใหม่
          const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const newHistoryItem = {
            id: Date.now(),
            title: `${baseTitle} (${timeString})`,
            messages: parsedSession
          };
          parsedHistory = [newHistoryItem, ...parsedHistory];
        }
      }
    }
    return parsedHistory;
  });

  // 2. 💾 State: หน้าจอแชทปัจจุบัน (เริ่มใหม่เสมอ)
  const [messages, setMessages] = useState([defaultWelcomeMessage]);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // 3. 💾 State: ชื่อผู้ใช้
  const [userName, setUserName] = useState(() => {
    return localStorage.getItem('upchat_username') || "User";
  });

  const [showSettings, setShowSettings] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    localStorage.setItem('upchat_current_messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('upchat_history', JSON.stringify(chatHistory));
  }, [chatHistory]);

  useEffect(() => {
    localStorage.setItem('upchat_username', userName);
  }, [userName]);


  // --- ฟังก์ชัน 1: New Chat ---
  const handleNewChat = () => {
    if (messages.length > 1) {
      const firstUserMessage = messages.find(m => m.sender === 'user');
      const baseTitle = firstUserMessage ? firstUserMessage.text : "แชทใหม่";
      
      // เช็คซ้ำอีกทีตอนกดปุ่ม (เผื่อคนกดรัว)
      const isSameSession = chatHistory.length > 0 && chatHistory[0].title.startsWith(baseTitle);
      
      if (!isSameSession) {
         const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
         const newHistoryItem = {
           id: Date.now(),
           title: `${baseTitle} (${timeString})`,
           messages: [...messages]
         };
         setChatHistory(prev => [newHistoryItem, ...prev]);
      } else {
         // ถ้าเหมือนกัน ก็แค่อัปเดตข้อความล่าสุดเข้าไป
         const updatedHistory = [...chatHistory];
         updatedHistory[0].messages = [...messages];
         updatedHistory[0].title = `${baseTitle} (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;
         setChatHistory(updatedHistory);
      }
    }
    
    // เริ่มหน้าใหม่
    const newWelcomeMsg = { 
      ...defaultWelcomeMessage, 
      text: `สวัสดีครับคุณ ${userName}! 🙏 UP Chat พร้อมบริการครับ\n\n` + defaultWelcomeMessage.text.split('\n').slice(2).join('\n')
    };
    
    setMessages([newWelcomeMsg]);
    setIsSidebarOpen(false);
  };

  const deleteHistoryItem = (e, id) => {
    e.stopPropagation();
    const newHistory = chatHistory.filter(item => item.id !== id);
    setChatHistory(newHistory);
  };

  const clearAllHistory = () => {
    if(window.confirm("⚠️ คุณต้องการล้างประวัติการแชททั้งหมดใช่หรือไม่?\n(ข้อมูลในเครื่องจะหายไปด้วย)")) {
      setChatHistory([]);
      localStorage.removeItem('upchat_history');
      setShowSettings(false);
    }
  };

  const handleLoadHistory = (historyItem) => {
    setMessages(historyItem.messages);
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
      
      <div 
        className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`} 
        onClick={() => setIsSidebarOpen(false)}
      />

      <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <button className="new-chat-btn" onClick={handleNewChat}><span>+</span> New chat</button>
        <div className="history-label" style={{padding: '10px 12px', fontSize: '0.75rem', color: '#8e8ea0'}}>History</div>
        <div className="history-list">
          {chatHistory.map((item) => (
            <div key={item.id} className="history-item" onClick={() => handleLoadHistory(item)}>
              <span className="truncate">💬 {item.title}</span>
              <button className="del-btn" onClick={(e) => deleteHistoryItem(e, item.id)}>🗑️</button>
            </div>
          ))}
        </div>
        <div className="sidebar-footer">
          <button className="settings-btn" onClick={() => setShowSettings(true)}>⚙️ Settings</button>
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
              <div className="avatar" style={{ backgroundColor: msg.sender === 'user' ? '#7b2cbf' : '#19c37d' }}>
                {msg.sender === 'user' ? userName[0].toUpperCase() : 'AI'}
              </div>
              <div className="message-text">
                {formatMessage(msg.text)}
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
        <div className="chat-input-area">
          <div className="input-wrapper">
            <input 
              type="text" 
              placeholder="ถามมาได้เลยครับ..." 
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && handleSend()} 
            />
            <button onClick={handleSend}>➤</button>
          </div>
        </div>
      </div>

      {showSettings && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Settings</h2>
            <div className="setting-row">
              <label>User Name:</label>
              <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} />
            </div>
            <div className="setting-row">
              <button className="danger-btn" onClick={clearAllHistory}>🗑️ Clear All History</button>
            </div>
            <button className="close-btn" onClick={() => setShowSettings(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;