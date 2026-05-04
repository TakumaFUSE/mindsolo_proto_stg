import WriteClient from '@/components/entry-write/WriteClient'

export default async function EntryWritePage({
  searchParams,
}: {
  searchParams: Promise<{ parent_chain_id?: string }>
}) {
  const { parent_chain_id } = await searchParams
  return <WriteClient initialChainId={parent_chain_id ?? null} />
}
