import { useState, useEffect } from "react";

function ChatBox() {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);

  const sendMessage = async () => {
    if (!message.trim()) return;

    await fetch("http://localhost:5000/api/saveMessage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sender: "user", message }),
    });

    setChat([...chat, { sender: "user", message }]);
    setMessage("");
  };

  useEffect(() => {
    fetch("http://localhost:5000/api/messages")
      .then((res) => res.json())
      .then((data) => setChat(data));
  }, []);

  return (
    <div>
      <h2>CareBot AI</h2>

      <div>
        {chat.map((c, i) => (
          <p key={i}>
            <strong>{c.sender}:</strong> {c.message}
          </p>
        ))}
      </div>

      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type your message"
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
}

export default ChatBox;
