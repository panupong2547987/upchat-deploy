// src/App.jsx
import { useState, useRef, useEffect } from 'react';
import './App.css';

function App() {
  const [messages, setMessages] = useState([
    { id: 1, text: "สวัสดีค่ะ! UP Chat พร้อมคุยค่ะ มีอะไรให้ช่วยไหม?", sender: "bot" }
  ]);
  
  const [chatHistory, setChatHistory] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // --- ฟังก์ชัน 1: กดปุ่ม New Chat (เริ่มใหม่และบันทึก) ---
  const handleNewChat = () => {
    // เงื่อนไข: ถ้ามีการคุยกันแล้ว (User พิมพ์มาอย่างน้อย 1 ข้อความ)
    if (messages.length > 1) {
      const firstUserMessage = messages.find(m => m.sender === 'user');
      const baseTitle = firstUserMessage ? firstUserMessage.text : "แชทใหม่";
      
      // เพิ่มเวลาเข้าไปที่ชื่อ เพื่อให้ไม่ซ้ำและบันทึกได้ทุกครั้ง
      const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const finalTitle = `${baseTitle} (${timeString})`;

      const newHistoryItem = {
        id: Date.now(),
        title: finalTitle,
        messages: [...messages] // ก๊อปปี้ข้อความทั้งหมดเก็บไว้
      };

      // เพิ่มเข้าประวัติทันที (เอาของใหม่ขึ้นบนสุด)
      setChatHistory(prev => [newHistoryItem, ...prev]);
    }

    // ล้างหน้าจอแชทปัจจุบัน เพื่อเริ่มใหม่
    setMessages([
      { id: Date.now(), text: "สวัสดีค่ะ! UP Chat พร้อมคุยค่ะ มีอะไรให้ช่วยไหม?", sender: "bot" }
    ]);
  };

  // --- ฟังก์ชัน 2: โหลดประวัติเก่ามาดู ---
  const handleLoadHistory = (historyItem) => {
    setMessages(historyItem.messages);
  };

  // --- ฟังก์ชันส่งข้อความ ---
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
      console.error("Error:", error);
      const errorMessage = { id: Date.now() + 1, text: "เชื่อมต่อ Server ไม่ได้", sender: "bot" };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleSend();
  };

  return (
    <div className="app-container">
      <div className="sidebar">
        <button className="new-chat-btn" onClick={handleNewChat}>
          <span>+</span> New chat
        </button>

        <div style={{ padding: '10px 12px', fontSize: '0.75rem', color: '#8e8ea0' }}>History</div>
        
        <div className="history-list">
          {chatHistory.length === 0 ? (
            <div style={{ padding: '10px', color: '#555', fontSize: '0.8rem' }}>ยังไม่มีประวัติการคุย</div>
          ) : (
            chatHistory.map((item) => (
              <div 
                key={item.id} 
                className="history-item"
                onClick={() => handleLoadHistory(item)}
              >
                <span>💬</span> {item.title}
              </div>
            ))
          )}
        </div>
        
        <div style={{ marginTop: 'auto', borderTop: '1px solid #4d4d4f', paddingTop: '10px' }}>
          <div className="history-item">⚙️ Settings</div>
        </div>
      </div>

      <div className="chat-window">
        <div className="chat-header">
          <h3>🟣 UP Chat</h3>
        </div>

        <div className="chat-body">
          {messages.map((msg) => (
            <div key={msg.id} className={`message-bubble ${msg.sender === "user" ? "user-msg" : "bot-msg"}`}>
              <div className="avatar" style={{ backgroundColor: msg.sender === 'user' ? '#7b2cbf' : '#19c37d' }}>
                {msg.sender === 'user' ? 'U' : 'AI'}
              </div>
              <div className="message-text">
                {msg.text}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="message-bubble bot-msg">
              <div className="avatar" style={{ backgroundColor: '#19c37d' }}>AI</div>
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
              onKeyDown={handleKeyPress}
              disabled={isLoading}
            />
            <button onClick={handleSend} disabled={isLoading}>
              ➤
            </button>
          </div>
          <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#8e8ea0', marginTop: '10px' }}>
            UP Chat ตอบคำถามอัตโนมัติด้วย AI
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;