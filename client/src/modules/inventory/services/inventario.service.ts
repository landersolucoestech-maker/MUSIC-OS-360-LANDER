/**
 * Service layer do módulo inventory.
 */
import { storage } from "@/shared/lib/storage";
import type { InventarioItem, InventarioInsert, InventarioUpdate } from "../types";

export const inventarioService = {
  async list(): Promise<InventarioItem[]> {
    return (await storage.list<InventarioItem & { id: string }>("inventario")) as InventarioItem[];
  },

  async findById(id: string): Promise<InventarioItem | undefined> {
    return (await storage.findById<InventarioItem & { id: string }>("inventario", id)) as InventarioItem | undefined;
  },

  async create(data: InventarioInsert): Promise<InventarioItem> {
    return (await storage.create<InventarioItem & { id: string }>(
      "inventario",
      data as Omit<InventarioItem & { id: string }, "id" | "user_id" | "created_at" | "updated_at">,
    )) as InventarioItem;
  },

  async update(id: string, data: InventarioUpdate): Promise<InventarioItem> {
    return (await storage.update<InventarioItem & { id: string }>(
      "inventario",
      id,
      data as Partial<InventarioItem & { id: string }>,
    )) as InventarioItem;
  },

  async delete(id: string): Promise<void> {
    await storage.delete("inventario", id);
  },
};
