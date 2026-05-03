type Props = { role: 'user' | 'assistant'; text: string }

export default function MessageBubble({ role, text }: Props) {
  const isUser = role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-[16px] px-3 py-2 text-[0.82rem] leading-relaxed ${
          isUser
            ? 'rounded-br-[4px] bg-[#f5d5b8] text-[#4a2e1a]'
            : 'rounded-bl-[4px] border border-[#ede3d8] bg-white text-ink'
        }`}
      >
        {text}
      </div>
    </div>
  )
}
