type Props = { url: string; label?: string }

export default function AffiliateButton({ url, label = '詳しく見る' }: Props) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center gap-1.5 rounded-[12px] bg-[#d4956a] px-5 py-3 text-[0.82rem] font-bold text-white active:opacity-80"
    >
      {label}
      <span className="text-[0.75rem]">↗</span>
    </a>
  )
}
