import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ApiExceptionFilter } from "./common/http/api-exception.filter";
import { ApiResponseInterceptor } from "./common/http/api-response.interceptor";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  app.setGlobalPrefix("api");
  app.enableCors({ origin: config.get<string>("FRONTEND_ORIGIN", "http://localhost:3000"), credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new ApiExceptionFilter());
  app.useGlobalInterceptors(new ApiResponseInterceptor());
  const port = Number(config.get<string>("PORT") ?? 5000);
  await app.listen(port);
}

void bootstrap();
