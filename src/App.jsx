import { useState, useRef, useEffect } from 'react';
import './App.css';

function App() {
  // 1. state สำหรับหน้าจอแชทปัจจุบัน
  const [messages, setMessages] = useState([
    { id: 1, text: "สวัสดีค่ะ! UP Chat พร้อมคุยค่ะ มีอะไรให้ช่วยไหม?", sender: "bot" }
  ]);
  
  // 2. state สำหรับเก็บประวัติและข้อมูลผู้ใช้
  const [chatHistory, setChatHistory] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userName, setUserName] = useState("User"); // สำหรับตั้งชื่อผู้ใช้
  const [showSettings, setShowSettings] = useState(false); // สำหรับเปิด/ปิดหน้า Setting
  const chatEndRef = useRef(null);

  // เลื่อนหน้าจอลงล่างสุดอัตโนมัติเมื่อมีข้อความใหม่
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // --- ฟังก์ชัน 1: New Chat (เริ่มใหม่และบันทึกประวัติ) ---
  const handleNewChat = () => {
    if (messages.length > 1) {
      const firstUserMessage = messages.find(m => m.sender === 'user');
      const baseTitle = firstUserMessage ? firstUserMessage.text : "แชทใหม่";
      const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      const newHistoryItem = {
        id: Date.now(),
        title: `${baseTitle} (${timeString})`,
        messages: [...messages]
      };
      setChatHistory(prev => [newHistoryItem, ...prev]);
    }
    // ล้างหน้าจอ พร้อมทักทายด้วยชื่อที่ตั้งไว้
    setMessages([{ id: Date.now(), text: `สวัสดีค่ะคุณ ${userName}! มีอะไรให้ช่วยไหม?`, sender: "bot" }]);
  };

  // --- ฟังก์ชัน 2: ลบประวัติเฉพาะอัน ---
  const deleteHistoryItem = (e, id) => {
    e.stopPropagation(); // กันไม่ให้ไปกดโดนฟังก์ชันโหลดแชท
    setChatHistory(prev => prev.filter(item => item.id !== id));
  };

  // --- ฟังก์ชัน 3: ล้างประวัติทั้งหมด ---
  const clearAllHistory = () => {
    if(window.confirm("คุณต้องการล้างประวัติการแชททั้งหมดใช่หรือไม่?")) {
      setChatHistory([]);
      setShowSettings(false);
    }
  };

  // --- ฟังก์ชัน 4: โหลดประวัติเก่ามาแสดง ---
  const handleLoadHistory = (historyItem) => {
    setMessages(historyItem.messages);
  };

  // --- ฟังก์ชันส่งข้อความไปหา Backend ---
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
      setMessages((prev) => [...prev, { id: Date.now() + 1, text: "เชื่อมต่อ Server ไม่ได้", sender: "bot" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container"> {/* ลบ class isDarkMode ออกเพื่อให้ใช้ CSS หลักอันเดียว */}
      
      {/* --- Sidebar (ประวัติการแชท) --- */}
      <div className="sidebar">
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

      {/* --- Chat Window (หน้าต่างแชท) --- */}
      <div className="chat-window">
        <div className="chat-header"><h3>🟣 UP Chat</h3></div>
        <div className="chat-body">
          {messages.map((msg) => (
            <div key={msg.id} className={`message-bubble ${msg.sender === "user" ? "user-msg" : "bot-msg"}`}>
              <div className="avatar" style={{ backgroundColor: msg.sender === 'user' ? '#7b2cbf' : '#19c37d' }}>
                {msg.sender === 'user' ? userName[0].toUpperCase() : 'AI'}
              </div>
              <div className="message-text">{msg.text}</div>
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
              placeholder="ถามมาได้เลย..." 
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && handleSend()} 
            />
            <button onClick={handleSend}>➤</button>
          </div>
        </div>
      </div>

      {/* --- Settings Modal (หน้าต่างตั้งค่า) --- */}
      {showSettings && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Settings</h2>
            <div className="setting-row">
              <label>User Name:</label>
              <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} />
            </div>
            {/* ลบปุ่มสลับ Dark Mode ออกตามความต้องการ */}
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