import { BadRequestException } from "@nestjs/common";
import { LocalAssetStorageService } from "./local-asset-storage.service";

describe("LocalAssetStorageService", () => {
  const storage = new LocalAssetStorageService();
  const makePdf = (originalname = "proposal.pdf") => { const buffer = Buffer.from("%PDF-1.7 test"); return { originalname, mimetype: "application/pdf", size: buffer.length, buffer }; };

  it("accepts an allowed file signature and reduces path-like names to a display filename", () => {
    expect(storage.validate(makePdf("../../proposal.pdf")).originalName).toBe("proposal.pdf");
  });

  it("rejects MIME and extension mismatches and file sizes over the configured limit", () => {
    expect(() => storage.validate({ ...makePdf("payload.exe"), mimetype: "application/pdf" })).toThrow(BadRequestException);
    expect(() => storage.validate({ ...makePdf("payload.pdf"), mimetype: "text/plain" })).toThrow(BadRequestException);
    const oversize = Buffer.alloc(10 * 1024 * 1024 + 1, 0x41);
    expect(() => storage.validate({ ...makePdf("big.pdf"), size: oversize.length, buffer: oversize })).toThrow(BadRequestException);
  });

  it("rejects content that does not match the declared PDF type", () => {
    const invalid = { ...makePdf(), buffer: Buffer.from("not actually a pdf") };
    invalid.size = invalid.buffer.length;
    expect(() => storage.validate(invalid)).toThrow(BadRequestException);
  });
});
