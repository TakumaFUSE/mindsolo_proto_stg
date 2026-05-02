import WriteClient from '@/components/entry-write/WriteClient'

export default async function EntryWritePage({
  searchParams,
}: {
  searchParams: Promise<{ chain_id?: string }>
}) {
  const { chain_id } = await searchParams
  return <WriteClient initialChainId={chain_id ?? null} />
}
