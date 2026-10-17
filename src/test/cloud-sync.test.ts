import { describe, expect, it } from "vitest";
import { CloudQueue, pendingStorageKey } from "@/lib/cloud-sync";

describe("Company cloud storage", () => {
  it("keeps company and user recovery queues separate", () => {
    expect(pendingStorageKey("user", "one")).not.toBe(pendingStorageKey("user", "two"));
    expect(pendingStorageKey("one", "company")).not.toBe(pendingStorageKey("two", "company"));
  });
  it("does not send company selection into shared data", async () => {
    const sent: unknown[] = [];
    const queue = new CloudQueue(async (changes) => { sent.push(changes); }, () => {});
    queue.put("alsadiq_active_company", "one");
    await queue.flush();
    expect(sent).toEqual([]);
  });
  it("retains failed invoice writes and saves them on retry", async () => {
    let fail = true;
    const sent: unknown[] = [];
    const queue = new CloudQueue(async (changes) => { if (fail) throw Error("offline"); sent.push(changes); }, () => {});
    queue.put("alsadiq_quartz_invoices_v10", '[{"id":"invoice-1"}]');
    await expect(queue.flush()).rejects.toThrow("offline");
    expect(queue.dirty).toBe(true);
    fail = false;
    await queue.flush();
    expect(sent).toEqual([[{ key: "alsadiq_quartz_invoices_v10", value: '[{"id":"invoice-1"}]' }]]);
    expect(queue.dirty).toBe(false);
  });
  it("serializes in-flight writes without dropping newer edits", async () => {
    let release: (() => void) | undefined;
    const sent: unknown[] = [];
    const queue = new CloudQueue(async (changes) => {
      sent.push(changes);
      if (sent.length === 1) await new Promise<void>((resolve) => { release = resolve; });
    }, () => {});
    queue.put("alsadiq_inventory_v1", "old");
    const first = queue.flush();
    queue.put("alsadiq_inventory_v1", "new");
    const second = queue.flush();
    expect(first).toBe(second);
    release?.();
    await first;
    expect(sent).toEqual([[{ key: "alsadiq_inventory_v1", value: "old" }], [{ key: "alsadiq_inventory_v1", value: "new" }]]);
  });
});