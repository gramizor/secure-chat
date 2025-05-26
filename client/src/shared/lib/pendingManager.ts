const pending = new Set<string>()

export const addPending = (peerId: string) => pending.add(peerId)
export const clearPending = (peerId: string) => pending.delete(peerId)
export const isPending = (peerId: string) => pending.has(peerId)
export const getPendingList = () => Array.from(pending)
