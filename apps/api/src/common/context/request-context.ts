import { AsyncLocalStorage } from 'node:async_hooks';

export const REQUEST_ID_HEADER = 'X-Request-ID';

interface RequestStore {
  requestId: string;
}

const storage = new AsyncLocalStorage<RequestStore>();

/** Per-request context (request id), available anywhere in the call chain without DI. */
export const RequestContext = {
  run<T>(store: RequestStore, fn: () => T): T {
    return storage.run(store, fn);
  },
  requestId(): string | undefined {
    return storage.getStore()?.requestId;
  },
};
