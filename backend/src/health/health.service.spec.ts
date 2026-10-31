import { HealthService } from "./health.service";

describe("HealthService", () => {
  it("returns an operational health payload", () => {
    const result = new HealthService().check();

    expect(result.status).toBe("ok");
    expect(result.service).toBe("agencyos-api");
    expect(Number.isNaN(Date.parse(result.timestamp))).toBe(false);
  });
});
