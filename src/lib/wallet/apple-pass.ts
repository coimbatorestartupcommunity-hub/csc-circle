import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { deflateRawSync } from "node:zlib";
import sharp from "sharp";

interface ZipFileEntry {
  name: string;
  content: Buffer;
}

function crc32(buf: Buffer): number {
  let crc = ~0;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (-(crc & 1) & 0xEDB88320);
    }
  }
  return (crc ^ ~0) >>> 0;
}

function buildZipArchive(files: ZipFileEntry[]): Buffer {
  const localHeaders: Buffer[] = [];
  const centralDirs: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const data = file.content;
    const compressed = deflateRawSync(data);
    const nameBuf = Buffer.from(file.name);
    const crc = crc32(data);

    // Local Header (30 bytes + name length)
    const lh = Buffer.alloc(30 + nameBuf.length);
    lh.writeUInt32LE(0x04034b50, 0); // Local file header signature
    lh.writeUInt16LE(20, 4); // Version needed (2.0)
    lh.writeUInt16LE(0, 6); // General purpose bit flag
    lh.writeUInt16LE(8, 8); // Compression method (deflate)
    lh.writeUInt16LE(0, 10); // File last mod time
    lh.writeUInt16LE(0, 12); // File last mod date
    lh.writeUInt32LE(crc, 14); // CRC-32
    lh.writeUInt32LE(compressed.length, 18); // Compressed size
    lh.writeUInt32LE(data.length, 22); // Uncompressed size
    lh.writeUInt16LE(nameBuf.length, 26); // File name length
    lh.writeUInt16LE(0, 28); // Extra field length
    nameBuf.copy(lh, 30);

    // Central Directory Header (46 bytes + name length)
    const cdh = Buffer.alloc(46 + nameBuf.length);
    cdh.writeUInt32LE(0x02014b50, 0); // Central directory file header signature
    cdh.writeUInt16LE(20, 4); // Version made by
    cdh.writeUInt16LE(20, 6); // Version needed
    cdh.writeUInt16LE(0, 8); // General purpose bit flag
    cdh.writeUInt16LE(8, 10); // Compression method
    cdh.writeUInt16LE(0, 12); // File last mod time
    cdh.writeUInt16LE(0, 14); // File last mod date
    cdh.writeUInt32LE(crc, 16); // CRC-32
    cdh.writeUInt32LE(compressed.length, 20); // Compressed size
    cdh.writeUInt32LE(data.length, 24); // Uncompressed size
    cdh.writeUInt16LE(nameBuf.length, 28); // File name length
    cdh.writeUInt16LE(0, 30); // Extra field length
    cdh.writeUInt16LE(0, 32); // File comment length
    cdh.writeUInt16LE(0, 34); // Disk number start
    cdh.writeUInt16LE(0, 36); // Internal file attributes
    cdh.writeUInt32LE(0, 38); // External file attributes
    cdh.writeUInt32LE(offset, 42); // Relative offset of local header
    nameBuf.copy(cdh, 46);

    localHeaders.push(lh, compressed);
    centralDirs.push(cdh);
    offset += lh.length + compressed.length;
  }

  const centralDirBuffer = Buffer.concat(centralDirs);
  const cdOffset = offset;
  const cdSize = centralDirBuffer.length;

  // End of central directory record (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // End of central directory signature
  eocd.writeUInt16LE(0, 4); // Number of this disk
  eocd.writeUInt16LE(0, 6); // Number of the disk with the start of the central directory
  eocd.writeUInt16LE(files.length, 8); // Total number of entries in the central directory on this disk
  eocd.writeUInt16LE(files.length, 10); // Total number of entries in the central directory
  eocd.writeUInt32LE(cdSize, 12); // Size of the central directory
  eocd.writeUInt32LE(cdOffset, 16); // Offset of start of central directory with respect to the starting disk number
  eocd.writeUInt16LE(0, 20); // .ZIP file comment length

  return Buffer.concat([...localHeaders, centralDirBuffer, eocd]);
}

export interface MemberPassData {
  memberNumber: string;
  fullName: string;
  designationLabel: string;
  startupName?: string | null;
  status: string;
  qrPayload: string;
  issuedAt?: string;
  expiresAt?: string | null;
}

export interface EventPassData {
  registrationId: string;
  eventTitle: string;
  attendeeName: string;
  startsAt: string;
  venueName?: string | null;
  qrPayload: string;
  passUid: string;
}

export async function generateAppleMemberPass(data: MemberPassData): Promise<Buffer> {
  const iconSource = readFileSync(join(process.cwd(), "public/brand/csc-icon.png"));

  const [icon, icon2x, logo, logo2x] = await Promise.all([
    sharp(iconSource).resize(29, 29).png().toBuffer(),
    sharp(iconSource).resize(58, 58).png().toBuffer(),
    sharp(iconSource).resize(160, 50, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(),
    sharp(iconSource).resize(320, 100, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(),
  ]);

  const passJson = {
    formatVersion: 1,
    passTypeIdentifier: "pass.in.csc.member",
    serialNumber: data.memberNumber,
    teamIdentifier: "CSCCOMMUNITY",
    organizationName: "Coimbatore Startup Community",
    description: "CSC Circle Verified Member Credential",
    foregroundColor: "rgb(255, 255, 255)",
    backgroundColor: "rgb(23, 27, 53)",
    labelColor: "rgb(180, 190, 220)",
    logoText: "CSC CIRCLE",
    generic: {
      primaryFields: [
        {
          key: "member",
          label: "MEMBER",
          value: data.fullName,
        },
      ],
      secondaryFields: [
        {
          key: "memberId",
          label: "MEMBERSHIP ID",
          value: data.memberNumber,
        },
        {
          key: "role",
          label: "DESIGNATION",
          value: data.designationLabel || "Founder",
        },
      ],
      auxiliaryFields: [
        {
          key: "startup",
          label: "STARTUP / ORG",
          value: data.startupName || "Coimbatore Startup Community",
        },
        {
          key: "status",
          label: "STATUS",
          value: data.status.toUpperCase(),
        },
      ],
      backFields: [
        {
          key: "about",
          label: "CSC CIRCLE MEMBERSHIP",
          value: "Certified digital credential of the Coimbatore Startup Community. Grants member admission to ecosystem founder meetups, demo days, and partner incubation venues.",
        },
        {
          key: "offline",
          label: "OFFLINE ENTRY",
          value: "Present this digital pass at check-in kiosks or volunteer scanners. The embedded cryptographic QR code verifies your membership token offline.",
        },
        {
          key: "portal",
          label: "OFFICIAL PORTAL",
          value: "https://csc.logicintelligencetechnologies.in",
        },
      ],
    },
    barcode: {
      format: "PKBarcodeFormatQR",
      message: data.qrPayload,
      messageEncoding: "iso-8859-1",
      altText: data.memberNumber,
    },
    barcodes: [
      {
        format: "PKBarcodeFormatQR",
        message: data.qrPayload,
        messageEncoding: "iso-8859-1",
        altText: data.memberNumber,
      },
    ],
  };

  const passJsonBuf = Buffer.from(JSON.stringify(passJson, null, 2));

  const files: ZipFileEntry[] = [
    { name: "pass.json", content: passJsonBuf },
    { name: "icon.png", content: icon },
    { name: "icon@2x.png", content: icon2x },
    { name: "logo.png", content: logo },
    { name: "logo@2x.png", content: logo2x },
  ];

  const manifest: Record<string, string> = {};
  for (const f of files) {
    manifest[f.name] = createHash("sha1").update(f.content).digest("hex");
  }
  files.push({
    name: "manifest.json",
    content: Buffer.from(JSON.stringify(manifest, null, 2)),
  });

  return buildZipArchive(files);
}

export async function generateAppleEventPass(data: EventPassData): Promise<Buffer> {
  const iconSource = readFileSync(join(process.cwd(), "public/brand/csc-icon.png"));

  const [icon, icon2x, logo, logo2x] = await Promise.all([
    sharp(iconSource).resize(29, 29).png().toBuffer(),
    sharp(iconSource).resize(58, 58).png().toBuffer(),
    sharp(iconSource).resize(160, 50, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(),
    sharp(iconSource).resize(320, 100, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(),
  ]);

  const passJson = {
    formatVersion: 1,
    passTypeIdentifier: "pass.in.csc.event",
    serialNumber: data.passUid,
    teamIdentifier: "CSCCOMMUNITY",
    organizationName: "Coimbatore Startup Community",
    description: `CSC Event Pass · ${data.eventTitle}`,
    foregroundColor: "rgb(255, 255, 255)",
    backgroundColor: "rgb(18, 24, 38)",
    labelColor: "rgb(165, 180, 252)",
    logoText: "CSC EVENTS",
    eventTicket: {
      primaryFields: [
        {
          key: "event",
          label: "EVENT",
          value: data.eventTitle,
        },
      ],
      secondaryFields: [
        {
          key: "attendee",
          label: "ATTENDEE",
          value: data.attendeeName,
        },
        {
          key: "date",
          label: "DATE & TIME",
          value: new Date(data.startsAt).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
        },
      ],
      auxiliaryFields: [
        {
          key: "venue",
          label: "LOCATION",
          value: data.venueName || "Coimbatore, Tamil Nadu",
        },
        {
          key: "uid",
          label: "PASS UID",
          value: data.passUid,
        },
      ],
      backFields: [
        {
          key: "admission",
          label: "ADMISSION RULES",
          value: "Present this pass at the entrance scanner. Valid for one attendee check-in.",
        },
        {
          key: "support",
          label: "SUPPORT",
          value: "coimbatorestartup.csc@gmail.com",
        },
      ],
    },
    barcode: {
      format: "PKBarcodeFormatQR",
      message: data.qrPayload,
      messageEncoding: "iso-8859-1",
      altText: data.passUid,
    },
    barcodes: [
      {
        format: "PKBarcodeFormatQR",
        message: data.qrPayload,
        messageEncoding: "iso-8859-1",
        altText: data.passUid,
      },
    ],
  };

  const passJsonBuf = Buffer.from(JSON.stringify(passJson, null, 2));

  const files: ZipFileEntry[] = [
    { name: "pass.json", content: passJsonBuf },
    { name: "icon.png", content: icon },
    { name: "icon@2x.png", content: icon2x },
    { name: "logo.png", content: logo },
    { name: "logo@2x.png", content: logo2x },
  ];

  const manifest: Record<string, string> = {};
  for (const f of files) {
    manifest[f.name] = createHash("sha1").update(f.content).digest("hex");
  }
  files.push({
    name: "manifest.json",
    content: Buffer.from(JSON.stringify(manifest, null, 2)),
  });

  return buildZipArchive(files);
}
