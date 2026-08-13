import { decryptField } from "@/lib/crypto";

interface RawClient {
  id: string;
  clientNumber: number;
  companyName: string;
  tradeName: string;
  address: string;
  contactName: string;
  phone: string;
  email: string;
  contactMethod: string;
  source: string;
  notes: string;
  createdAt: Date;
}

export function serializeClient(c: RawClient) {
  return {
    id: c.id,
    clientNumber: c.clientNumber,
    companyName: c.companyName,
    tradeName: c.tradeName,
    address: decryptField(c.address),
    contactName: decryptField(c.contactName),
    phone: decryptField(c.phone),
    email: decryptField(c.email),
    contactMethod: c.contactMethod,
    source: c.source,
    notes: c.notes,
    createdAt: c.createdAt.toISOString(),
  };
}
