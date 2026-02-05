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

  // 📝 ข้อความต้อนรับ
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

  // 1. 🆔 สร้าง ID สำหรับแชทรอบปัจจุบัน (สร้างใหม่ทุกครั้งที่รีเฟรชหน้าจอ)
  const [currentChatId, setCurrentChatId] = useState(Date.now());

  // 2. 💾 State: ประวัติแชท (โหลดจาก LocalStorage อย่างเดียว ไม่ต้องกู้ของเก่ามาปน)
  const [chatHistory, setChatHistory] = useState(() => {
    const savedHistory = localStorage.getItem('upchat_history');
    return savedHistory ? JSON.parse(savedHistory) : [];
  });

  // 3. 💬 State: หน้าจอแชทปัจจุบัน (เริ่มใหม่เสมอ เมื่อเข้าเว็บ)
  const [messages, setMessages] = useState([defaultWelcomeMessage]);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const [userName, setUserName] = useState(() => {
    return localStorage.getItem('upchat_username') || "User";
  });

  const [showSettings, setShowSettings] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const chatEndRef = useRef(null);

  // เลื่อนจอลงล่างสุด
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // 🔥 4. ระบบ Real-time Save: พิมพ์ปุ๊บ อัปเดตลง History ปั๊บ!
  useEffect(() => {
    // ถ้ายังไม่มีการคุย (มีแค่บอททัก) ไม่ต้องทำอะไร
    if (messages.length <= 1) return;

    setChatHistory(prevHistory => {
      // เช็คว่า ID นี้มีในประวัติหรือยัง?
      const existingIndex = prevHistory.findIndex(item => item.id === currentChatId);

      if (existingIndex > -1) {
        // 🔄 มีแล้ว: อัปเดตข้อความข้างใน (Update)
        const updatedHistory = [...prevHistory];
        updatedHistory[existingIndex] = {
          ...updatedHistory[existingIndex],
          messages: messages
        };
        return updatedHistory;
      } else {
        // 🆕 ยังไม่มี: สร้างรายการใหม่ (Create)
        const firstUserMessage = messages.find(m => m.sender === 'user');
        const title = firstUserMessage ? firstUserMessage.text : "New Chat";
        const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const newItem = {
          id: currentChatId,
          title: `${title} (${timeString})`,
          messages: messages
        };
        // แทรกไว้บนสุด
        return [newItem, ...prevHistory];
      }
    });
  }, [messages, currentChatId]); // ทำงานทุกครั้งที่ messages เปลี่ยน

  // บันทึก History ลงเครื่อง
  useEffect(() => {
    localStorage.setItem('upchat_history', JSON.stringify(chatHistory));
  }, [chatHistory]);

  useEffect(() => {
    localStorage.setItem('upchat_username', userName);
  }, [userName]);


  // --- ฟังก์ชัน 1: New Chat (เคลียร์หน้าจอ + สร้าง ID ใหม่) ---
  const handleNewChat = () => {
    setMessages([defaultWelcomeMessage]); // เคลียร์หน้าจอ
    setCurrentChatId(Date.now()); // 🔑 สร้าง ID ใหม่ เพื่อเริ่มหัวข้อใหม่
    setIsSidebarOpen(false);
  };

  // --- ฟังก์ชัน 2: ลบประวัติ ---
  const deleteHistoryItem = (e, id) => {
    e.stopPropagation();
    const newHistory = chatHistory.filter(item => item.id !== id);
    setChatHistory(newHistory);
    
    // ถ้าลบตัวที่กำลังคุยอยู่ ให้เริ่มใหม่เลย
    if (id === currentChatId) {
      handleNewChat();
    }
  };

  const clearAllHistory = () => {
    if(window.confirm("⚠️ คุณต้องการล้างประวัติการแชททั้งหมดใช่หรือไม่?")) {
      setChatHistory([]);
      localStorage.removeItem('upchat_history');
      handleNewChat(); // ล้างแล้วเริ่มใหม่ด้วย
      setShowSettings(false);
    }
  };

  // --- ฟังก์ชัน 3: โหลดประวัติเก่ามาคุยต่อ ---
  const handleLoadHistory = (historyItem) => {
    setMessages(historyItem.messages);
    setCurrentChatId(historyItem.id); // 🔑 เปลี่ยน ID กลับไปเป็นของเก่านั้น เพื่อให้คุยต่อได้!
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
            <div 
              key={item.id} 
              className={`history-item ${item.id === currentChatId ? 'active-history' : ''}`} 
              onClick={() => handleLoadHistory(item)}
              style={{ backgroundColor: item.id === currentChatId ? '#343541' : '' }} // Highlight ตัวที่เลือก
            >
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