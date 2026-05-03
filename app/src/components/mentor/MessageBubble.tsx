import type { MentorMessage } from '@/lib/types'

type Props = { message: MentorMessage }

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-[16px] px-3 py-2 text-[0.82rem] leading-relaxed ${
          isUser
            ? 'rounded-br-[4px] bg-[#f5d5b8] text-[#4a2e1a]'
            : 'rounded-bl-[4px] border border-[#ede3d8] bg-white text-ink'
        }`}
      >
        {message.content}
      </div>
    </div>
  )
}
