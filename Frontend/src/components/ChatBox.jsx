import { useEffect, useState } from "react";
import api from "../services/api";

export default function ChatBox({ projectId }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  const loadMessages = async () => {
    const res = await api.get(`/chat/${projectId}`);
    setMessages(res.data);
  };

  useEffect(() => {
    loadMessages();
  }, [projectId]);

  const sendMessage = async () => {
    console.log("SEND CLICKED");
    if (!text.trim()) return;

    await api.post(`/chat/${projectId}`, { text });
    setText("");
    loadMessages();
  };

  return (
    <div className="mt-4 bg-gray-900 p-4 rounded">
      <h4 className="text-white mb-2 font-semibold">Chat</h4>

      <div className="h-40 overflow-y-auto mb-3 space-y-2">
        {messages.map((m) => (
          <div key={m._id} className="text-sm">
            <span className="text-blue-400 font-semibold">
              {m.sender?.email}:
            </span>{" "}
            <span className="text-gray-200">{m.message}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
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
