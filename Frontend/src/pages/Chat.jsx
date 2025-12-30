import { useEffect, useState } from "react";
import api from "../services/api";

export default function Chat({ projectId }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  const loadChat = async () => {
    const res = await api.get(`/chat/${projectId}`);
    setMessages(res.data);
  };

  useEffect(() => {
    loadChat();
  }, []);

  const sendMessage = async () => {
    if (!text) return;
    await api.post(`/chat/${projectId}`, { message: text });
    setText("");
    loadChat();
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <div className="h-64 overflow-y-auto space-y-2">
        {messages.map((m) => (
          <div key={m._id} className="text-white">
            <b>{m.sender.role}:</b> {m.message}
          </div>
        ))}
      </div>

      <div className="flex mt-3 gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="flex-1 p-2 rounded"
          placeholder="Type message..."
        />
        <button
          onClick={sendMessage}
          className="px-4 bg-blue-600 text-white rounded"
        >
          Send
        </button>
      </div>
    </div>
  );
}
