import { decryptField } from "@/lib/crypto";

interface RawPasswordEntry {
  id: string;
  category: string;
  service: string;
  url: string;
  username: string;
  usernameLabel: string;
  password: string;
  notes: string;
  createdAt: Date;
}

export function serializePasswordEntry(p: RawPasswordEntry) {
  return {
    id: p.id,
    category: p.category,
    service: p.service,
    url: p.url,
    username: decryptField(p.username),
    usernameLabel: p.usernameLabel,
    password: decryptField(p.password),
    notes: p.notes,
    createdAt: p.createdAt.toISOString(),
  };
}
