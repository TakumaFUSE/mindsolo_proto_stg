import { randomUUID } from 'crypto'

/**
 * Returns the chain_id for a new entry or thread.
 * If parentChainId is provided the caller is continuing an existing chain;
 * otherwise a fresh UUID is generated.
 */
export async function assignChain({
  parentChainId,
}: {
  userId: string
  parentChainId?: string | null
}): Promise<string> {
  if (parentChainId) return parentChainId
  return randomUUID()
}
