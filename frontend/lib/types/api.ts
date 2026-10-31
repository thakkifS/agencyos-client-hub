export type ApiSuccess<T> = {
  success: true;
  data: T;
  message: string;
};

export type ApiFailure = {
  success: false;
  message: string;
  code: string;
  details?: unknown;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export type HealthData = {
  status: "ok";
  timestamp: string;
  service: string;
};
