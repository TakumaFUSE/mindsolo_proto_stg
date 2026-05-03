type Props = { reason: string }

export default function ReasonBlock({ reason }: Props) {
  return (
    <div className="rounded-[14px] bg-[#fdf6f0] px-4 py-3">
      <p className="mb-1.5 text-[0.7rem] font-extrabold uppercase tracking-wide text-[#d4956a]">
        なぜあなたに？
      </p>
      <p className="text-[0.8rem] leading-relaxed text-ink">{reason}</p>
    </div>
  )
}
