"use client";

type Props = {
  typingUserNames: string[];
};

export default function TypingIndicator({ typingUserNames }: Props) {
  if (typingUserNames.length === 0) return null;

  const text =
    typingUserNames.length === 1
      ? `${typingUserNames[0]} is typing`
      : typingUserNames.length === 2
      ? `${typingUserNames[0]} and ${typingUserNames[1]} are typing`
      : `${typingUserNames[0]} and ${typingUserNames.length - 1} others are typing`;

  return (
    <div className="flex items-center gap-2 px-4 py-1">
      <div className="flex gap-1">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-light [animation-delay:0ms]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-light [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-light [animation-delay:300ms]" />
      </div>
      <span className="text-xs text-muted-light">{text}</span>
    </div>
  );
}
