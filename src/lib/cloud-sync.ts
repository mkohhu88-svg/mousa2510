export type CloudChange = { key: string; value: string | null };
export const isCompanyKey = (key: string) => key.startsWith("alsadiq_") && key !== "alsadiq_active_company";
export const pendingStorageKey = (userId: string, companyId: string) => `cloud_pending:${userId}:${companyId}`;

// Keep failed writes durable and serialize batches; newer edits always win locally.
export class CloudQueue {
  private entries = new Map<string, { value: string | null; revision: number }>();
  private revision = 0;
  private running: Promise<void> | null = null;
  constructor(private send: (changes: CloudChange[]) => Promise<void>, private persist: (changes: CloudChange[]) => void) {}
  get changes(): CloudChange[] { return [...this.entries].map(([key, entry]) => ({ key, value: entry.value })); }
  get dirty() { return this.entries.size > 0; }
  restore(changes: CloudChange[]) { for (const change of changes) if (isCompanyKey(change.key)) this.put(change.key, change.value); }
  put(key: string, value: string | null) {
    if (!isCompanyKey(key)) return;
    this.entries.set(key, { value, revision: ++this.revision });
    this.persist(this.changes);
  }
  flush(): Promise<void> {
    if (this.running) return this.running;
    this.running = this.drain().finally(() => { this.running = null; });
    return this.running;
  }
  private async drain() {
    while (this.entries.size) {
      const batch = [...this.entries.entries()].slice(0, 100);
      await this.send(batch.map(([key, entry]) => ({ key, value: entry.value })));
      for (const [key, entry] of batch) {
        if (this.entries.get(key)?.revision === entry.revision) this.entries.delete(key);
      }
      this.persist(this.changes);
    }
  }
}