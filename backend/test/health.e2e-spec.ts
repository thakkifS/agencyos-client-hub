import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { ApiExceptionFilter } from "../src/common/http/api-exception.filter";
import { ApiResponseInterceptor } from "../src/common/http/api-response.interceptor";

describe("Health API (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api");
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new ApiExceptionFilter());
    app.useGlobalInterceptors(new ApiResponseInterceptor());
    await app.init();
  });

  afterAll(async () => app.close());

  it("returns the standard success envelope without requiring database access", async () => {
    await request(app.getHttpServer()).get("/api/health").expect(200).expect(({ body }) => {
      expect(body.success).toBe(true);
      expect(body.data.status).toBe("ok");
      expect(body.message).toBe("Operation completed successfully");
    });
  });
});
