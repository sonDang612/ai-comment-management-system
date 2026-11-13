import { ErrorCode, isApiErrorBody } from "@acms/shared";

/** Normalized error thrown by the API client for every failed request. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;
  readonly requestId: string | null;

  constructor(params: {
    status: number;
    code: string;
    message: string;
    details?: unknown;
    requestId?: string | null;
  }) {
    super(params.message);
    this.name = "ApiError";
    this.status = params.status;
    this.code = params.code;
    this.details = params.details;
    this.requestId = params.requestId ?? null;
  }

  /** Network failures and 5xx responses are worth retrying; 4xx are not. */
  get isRetryable(): boolean {
    return this.status === 0 || this.status >= 500;
  }

  static async fromResponse(response: Response): Promise<ApiError> {
    const requestId = response.headers.get("x-request-id");
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      // Non-JSON body (e.g. a proxy error page); fall through to a generic error.
    }
    if (isApiErrorBody(body)) {
      return new ApiError({
        status: response.status,
        code: body.error.code,
        message: body.error.message,
        details: body.error.details,
        requestId: body.error.request_id ?? requestId,
      });
    }
    return new ApiError({
      status: response.status,
      code: response.status >= 500 ? ErrorCode.INTERNAL_ERROR : ErrorCode.BAD_REQUEST,
      message: response.statusText || `Request failed with status ${response.status}`,
      requestId,
    });
  }

  static network(cause: unknown): ApiError {
    return new ApiError({
      status: 0,
      code: "network_error",
      message: cause instanceof Error ? cause.message : "Network request failed",
    });
  }
}
