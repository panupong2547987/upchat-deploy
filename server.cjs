// server.cjs
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dialogflow = require('dialogflow');
const fs = require('fs');
const path = require('path');
require('dotenv').config(); // เผื่อไว้ใช้ในอนาคต

const app = express();

// 1. แก้ Port ให้รองรับ Server จริง (Render จะส่ง Port มาให้เอง)
const port = process.env.PORT || 3000;

// 2. ระบบเลือกกุญแจอัตโนมัติ (Local vs Server)
let config;

if (process.env.GOOGLE_CREDENTIALS) {
  // กรณี: อยู่บน Server (เราจะเอาไส้ในไฟล์ json ไปฝากไว้ที่ตัวแปรชื่อ GOOGLE_CREDENTIALS)
  console.log("Using Environment Credentials");
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
  config = {
    projectId: credentials.project_id,
    credentials: {
      private_key: credentials.private_key,
      client_email: credentials.client_email,
    }
  };
} else {
  // กรณี: อยู่บนคอมเรา (อ่านไฟล์ key.json เหมือนเดิม)
  console.log("Using Local key.json");
  const keyFilename = 'key.json'; // ⚠️ ตรวจสอบว่าชื่อไฟล์ตรงกับที่มีในโฟลเดอร์
  const keyPath = path.join(__dirname, keyFilename);
  
  if (fs.existsSync(keyPath)) {
    const fileContent = fs.readFileSync(keyPath);
    const credentials = JSON.parse(fileContent);
    config = {
      projectId: credentials.project_id,
      keyFilename: keyPath // ใช้ path ไฟล์โดยตรงสำหรับ Local
    };
  } else {
    console.error("❌ ไม่พบไฟล์ key.json และไม่มี Environment Variable");
  }
}

const sessionClient = new dialogflow.SessionsClient(config);

app.use(cors());
app.use(bodyParser.json());

app.post('/chat', async (req, res) => {
  const { message, userId } = req.body;
  const sessionId = userId || 'user-123';
  
  // ใช้ projectId จาก config ที่เราดึงมาข้างบน
  const sessionPath = sessionClient.sessionPath(config.projectId, sessionId);

  const request = {
    session: sessionPath,
    queryInput: {
      text: {
        text: message,
        languageCode: 'th',
      },
    },
  };

  try {
    const responses = await sessionClient.detectIntent(request);
    const result = responses[0].queryResult;
    
    res.json({
      text: result.fulfillmentText,
      intent: result.intent.displayName
    });
    console.log(`User: ${message} | Bot: ${result.fulfillmentText}`);

  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Error connecting to Dialogflow');
  }
});

app.listen(port, () => {
  console.log(`Server running at port: ${port}`);
  if(config) console.log(`Connected to Project ID: ${config.projectId}`);
});