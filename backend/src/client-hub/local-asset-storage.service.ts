import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { chmod, mkdir, realpath, stat, unlink, writeFile } from "node:fs/promises";
import { join, resolve, sep } from "node:path";

const FILE_LIMIT = 10 * 1024 * 1024;
export type UploadBufferFile = { originalname: string; mimetype: string; size: number; buffer: Buffer };
const ALLOWED = new Map<string, { extension: string; matches: (data: Buffer) => boolean }>([
  ["application/pdf", { extension: ".pdf", matches: (data) => data.length >= 5 && data.subarray(0, 5).toString() === "%PDF-" }],
  ["image/jpeg", { extension: ".jpg", matches: (data) => data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff }],
  ["image/png", { extension: ".png", matches: (data) => data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) }],
  ["image/webp", { extension: ".webp", matches: (data) => data.length >= 12 && data.subarray(0, 4).toString() === "RIFF" && data.subarray(8, 12).toString() === "WEBP" }],
]);

@Injectable()
export class LocalAssetStorageService {
  private readonly root = resolve(process.cwd(), "storage", "client-hub");

  validate(file: UploadBufferFile) {
    if (process.env.NODE_ENV === "production") throw new ServiceUnavailableException("Local file storage is development-only; configure an approved production storage adapter");
    if (!file?.buffer?.length || file.size !== file.buffer.length || file.size > FILE_LIMIT) throw new BadRequestException({ code: "INVALID_FILE_SIZE", message: "Files must be between 1 byte and 10 MB" });
    const allowed = ALLOWED.get(file.mimetype);
    const lower = file.originalname.toLowerCase();
    if (!allowed || !(lower.endsWith(allowed.extension) || (allowed.extension === ".jpg" && lower.endsWith(".jpeg"))) || !allowed.matches(file.buffer)) {
      throw new BadRequestException({ code: "UNSUPPORTED_FILE_TYPE", message: "Only valid PDF, JPEG, PNG, and WebP files are allowed" });
    }
    const originalName = file.originalname.normalize("NFKC").replace(/[\\/]/g, "/").split("/").pop()!.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 255);
    if (!originalName || originalName === "." || originalName === "..") throw new BadRequestException({ code: "INVALID_FILENAME", message: "The uploaded filename is invalid" });
    return { originalName, mimeType: file.mimetype, fileSize: file.size, extension: allowed.extension };
  }

  async save(buffer: Buffer, extension: string) {
    const storageKey = `${randomUUID()}${extension}`;
    const target = this.pathFor(storageKey);
    await mkdir(this.root, { recursive: true, mode: 0o700 });
    await chmod(this.root, 0o700);
    await writeFile(target, buffer, { flag: "wx", mode: 0o600 });
    return storageKey;
  }

  async pathForDownload(storageKey: string) {
    if (process.env.NODE_ENV === "production") throw new ServiceUnavailableException("Local file storage is development-only; configure an approved production storage adapter");
    const target = this.pathFor(storageKey);
    try {
      const [realRoot, realTarget, info] = await Promise.all([realpath(this.root), realpath(target), stat(target)]);
      if (!realTarget.startsWith(`${realRoot}${sep}`) || !info.isFile()) throw new Error("Invalid stored file");
      return realTarget;
    } catch {
      throw new NotFoundException({ code: "FILE_CONTENT_NOT_FOUND", message: "File content is not available" });
    }
  }

  async discard(storageKey: string) {
    try { await unlink(this.pathFor(storageKey)); } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  }

  private pathFor(storageKey: string) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(pdf|jpg|png|webp)$/.test(storageKey)) throw new BadRequestException({ code: "INVALID_STORAGE_REFERENCE", message: "Invalid internal storage reference" });
    const target = resolve(this.root, storageKey);
    if (!target.startsWith(`${this.root}${sep}`)) throw new BadRequestException({ code: "INVALID_STORAGE_REFERENCE", message: "Invalid internal storage reference" });
    return join(this.root, storageKey);
  }
}
