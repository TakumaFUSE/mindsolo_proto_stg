import Link from 'next/link'

type Props = { chainId: string }

export default function ChainAddButton({ chainId }: Props) {
  return (
    <Link
      href={`/entry/write?parent_chain_id=${chainId}`}
      aria-label="このChainに新しいエントリを追加"
      className="flex h-7 w-7 items-center justify-center rounded-full border border-[#ccb9aa] bg-white text-[1.1rem] leading-none text-[#6a5d54] shadow-sm transition-transform hover:-translate-y-px active:scale-95"
    >
      +
    </Link>
  )
}
