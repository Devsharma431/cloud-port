import chatbotKB from "../data/chatbot-kb.json";

const SESSION_KEY = "cloud-chat-session";

const getSession = () => {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
};

const findBestMatch = (message) => {
  const lowerMessage = message.toLowerCase();
  let bestMatch = null;
  let maxMatches = 0;

  for (const entry of chatbotKB.knowledge) {
    let matches = 0;
    for (const keyword of entry.keywords) {
      if (lowerMessage.includes(keyword.toLowerCase())) {
        matches++;
      }
    }
    if (matches > maxMatches) {
      maxMatches = matches;
      bestMatch = entry;
    }
  }

  return bestMatch;
};

const simulateTyping = async (text, onDelta, signal) => {
  const words = text.split(" ");
  let full = "";
  
  for (let i = 0; i < words.length; i++) {
    if (signal?.aborted) return;
    
    const chunk = (i === 0 ? "" : " ") + words[i];
    full += chunk;
    onDelta(chunk, full);
    
    const delay = 30 + Math.random() * 40;
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  return full;
};

export async function streamChat(message, onDelta, signal) {
  const match = findBestMatch(message);
  const answer = match ? match.answer : chatbotKB.fallback;
  
  await simulateTyping(answer, onDelta, signal);
  
  return answer;
}

export async function getHistory() {
  return [];
}

export function clearHistory() {
  // No-op for local-only chatbot
}

export const SUGGESTIONS = [
  "How long does a short-form edit take?",
  "What are your rates?",
  "Are you available full-time?",
  "How do payments work?",
];