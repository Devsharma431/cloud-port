// Minimal markdown renderer for assistant replies: paragraphs, "- " bullets and **bold**.
const inline = (text) =>
  text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>
    ) : (
      part
    )
  );

export const ChatMessage = ({ role, content, streaming }) => {
  const isUser = role === "user";
  const lines = content.split("\n").filter((l, i, arr) => l.trim() !== "" || (i > 0 && arr[i - 1].trim() !== ""));

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`} data-testid={`chat-msg-${role}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser ? "bg-white text-black rounded-br-md" : "bg-[#161616] border border-white/10 text-[#d4d4d8] rounded-bl-md"
        }`}
      >
        {lines.map((line, i) => {
          const bullet = /^\s*[-*]\s+/.test(line);
          const text = bullet ? line.replace(/^\s*[-*]\s+/, "") : line;
          return (
            <p key={i} className={`${bullet ? "pl-3 relative before:content-['•'] before:absolute before:left-0" : ""} ${i > 0 ? "mt-1.5" : ""}`}>
              {inline(text)}
            </p>
          );
        })}
        {streaming && <span className="inline-block w-1.5 h-4 ml-0.5 align-middle bg-[#2997FF] animate-pulse rounded-sm" />}
      </div>
    </div>
  );
};
