/**
 * Type declarations for dns-packet library.
 * dns-packet does not ship its own types.
 */
declare module 'dns-packet' {
  export interface Record {
    name: string;
    type: string;
    ttl?: number;
    class?: string;
    data?: unknown;
    flags?: number;
    algorithm?: number;
    publicKey?: string;
    keyTag?: number;
    digestType?: number;
    digest?: string;
  }

  export interface Packet {
    id?: number;
    type?: string;
    flags?: number;
    questions?: Array<{ name: string; type: string; class?: string }>;
    answers?: Record[];
    authority?: Record[];
    additional?: Record[];
  }

  export function encode(packet: Packet): Buffer;
  export function decode(buf: Buffer): Packet;
  export function parse(buf: Buffer): Packet;

  export const AUTHORITATIVE_ANSWER: number;
  export const RECURSION_DESIRED: number;
}
