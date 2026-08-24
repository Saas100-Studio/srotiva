import { isIP } from "node:net";

type IpRange = {
  network: bigint;
  prefixLength: number;
};

const IPV4_BITS = 32;
const IPV6_BITS = 128;

function ipv4ToBigInt(address: string): bigint | null {
  const parts = address.split(".");
  if (parts.length !== 4) {
    return null;
  }

  let value = 0n;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) {
      return null;
    }
    const octet = Number(part);
    if (octet > 255) {
      return null;
    }
    value = (value << 8n) | BigInt(octet);
  }
  return value;
}

function ipv6ToBigInt(address: string): bigint | null {
  let normalized = address.toLowerCase();
  if (normalized.startsWith("[") && normalized.endsWith("]")) {
    normalized = normalized.slice(1, -1);
  }
  if (normalized.includes("%")) {
    return null;
  }

  if (normalized.includes(".")) {
    const lastColon = normalized.lastIndexOf(":");
    const ipv4 = ipv4ToBigInt(normalized.slice(lastColon + 1));
    if (lastColon < 0 || ipv4 === null) {
      return null;
    }
    normalized = `${normalized.slice(0, lastColon)}:${(
      ipv4 >> 16n
    ).toString(16)}:${(ipv4 & 0xffffn).toString(16)}`;
  }

  const halves = normalized.split("::");
  if (halves.length > 2) {
    return null;
  }

  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves[1] ? halves[1].split(":") : [];
  const missing = IPV6_BITS / 16 - left.length - right.length;

  if (
    (halves.length === 1 && missing !== 0) ||
    (halves.length === 2 && missing < 1)
  ) {
    return null;
  }

  const groups = [
    ...left,
    ...Array.from({ length: missing }, () => "0"),
    ...right,
  ];
  let value = 0n;
  for (const group of groups) {
    if (!/^[0-9a-f]{1,4}$/.test(group)) {
      return null;
    }
    value = (value << 16n) | BigInt(`0x${group}`);
  }
  return value;
}

function cidr(address: string, prefixLength: number): IpRange {
  const bits = isIP(address) === 4 ? IPV4_BITS : IPV6_BITS;
  const network = bits === IPV4_BITS
    ? ipv4ToBigInt(address)
    : ipv6ToBigInt(address);

  if (network === null || prefixLength < 0 || prefixLength > bits) {
    throw new Error(`Invalid IP range: ${address}/${prefixLength}`);
  }

  return { network, prefixLength };
}

function inRange(value: bigint, range: IpRange, bits: number): boolean {
  const shift = BigInt(bits - range.prefixLength);
  return value >> shift === range.network >> shift;
}

const UNSAFE_IPV4_RANGES = [
  cidr("0.0.0.0", 8),
  cidr("10.0.0.0", 8),
  cidr("100.64.0.0", 10),
  cidr("127.0.0.0", 8),
  cidr("169.254.0.0", 16),
  cidr("172.16.0.0", 12),
  cidr("192.0.0.0", 24),
  cidr("192.0.2.0", 24),
  cidr("192.88.99.0", 24),
  cidr("192.168.0.0", 16),
  cidr("198.18.0.0", 15),
  cidr("198.51.100.0", 24),
  cidr("203.0.113.0", 24),
  cidr("224.0.0.0", 4),
  cidr("240.0.0.0", 4),
];

const IPV4_MAPPED_RANGE = cidr("::ffff:0:0", 96);
const NAT64_WELL_KNOWN_RANGE = cidr("64:ff9b::", 96);
const GLOBAL_IPV6_RANGE = cidr("2000::", 3);
const UNSAFE_IPV6_RANGES = [
  cidr("2001::", 23),
  cidr("2001:db8::", 32),
  cidr("2002::", 16),
  cidr("3fff::", 20),
];

function isUnsafeIpv4Value(value: bigint): boolean {
  return UNSAFE_IPV4_RANGES.some((range) =>
    inRange(value, range, IPV4_BITS),
  );
}

function isUnsafeIpv6Value(value: bigint): boolean {
  if (inRange(value, IPV4_MAPPED_RANGE, IPV6_BITS)) {
    return isUnsafeIpv4Value(value & 0xffffffffn);
  }
  if (inRange(value, NAT64_WELL_KNOWN_RANGE, IPV6_BITS)) {
    return isUnsafeIpv4Value(value & 0xffffffffn);
  }
  if (!inRange(value, GLOBAL_IPV6_RANGE, IPV6_BITS)) {
    return true;
  }
  return UNSAFE_IPV6_RANGES.some((range) =>
    inRange(value, range, IPV6_BITS),
  );
}

export function isUnsafeIpAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) {
    const value = ipv4ToBigInt(address);
    return value === null || isUnsafeIpv4Value(value);
  }
  if (family === 6) {
    const value = ipv6ToBigInt(address);
    return value === null || isUnsafeIpv6Value(value);
  }
  return true;
}
