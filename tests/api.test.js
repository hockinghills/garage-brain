import { describe, it, expect, vi } from 'vitest';

// Mock D1 database
function mockDB(overrides = {}) {
  const defaultPrepare = () => ({
    bind: (...args) => ({
      all: async () => ({ results: [] }),
      run: async () => ({ success: true }),
    }),
  });
  return { prepare: overrides.prepare || defaultPrepare };
}

// Mock R2 bucket
function mockStorage() {
  return {
    put: vi.fn(async () => ({})),
    get: vi.fn(async () => null),
  };
}

// Mock KV namespace
function mockKV(store = {}) {
  return {
    get: vi.fn(async (key, opts) => {
      const val = store[key];
      if (!val) return null;
      if (opts?.type === 'json') return JSON.parse(val);
      return val;
    }),
    put: vi.fn(async (key, value) => {
      store[key] = typeof value === 'string' ? value : JSON.stringify(value);
    }),
  };
}

// Build a mock request
function mockRequest(method, body = null, formData = null) {
  const req = {
    method,
    url: 'https://garage-brain.pages.dev/api/test',
    headers: new Map(),
    json: async () => body,
    formData: async () => formData,
  };
  return req;
}

// Build mock context
function mockContext(method, body, env = {}) {
  return {
    env: {
      DB: mockDB(),
      STORAGE: mockStorage(),
      CACHE: mockKV(),
      ...env,
    },
    request: mockRequest(method, body),
  };
}

// ============================================================
// Vehicles API tests
// ============================================================
describe('Vehicles API', async () => {
  const { onRequestPost } = await import('../functions/api/vehicles.js');

  it('rejects POST with missing make', async () => {
    const ctx = mockContext('POST', { model: 'Civic', year: 2015 });
    const res = await onRequestPost(ctx);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('make');
  });

  it('rejects POST with missing model', async () => {
    const ctx = mockContext('POST', { make: 'Honda', year: 2015 });
    const res = await onRequestPost(ctx);
    expect(res.status).toBe(400);
  });

  it('rejects POST with missing year', async () => {
    const ctx = mockContext('POST', { make: 'Honda', model: 'Civic' });
    const res = await onRequestPost(ctx);
    expect(res.status).toBe(400);
  });

  it('accepts valid POST with all required fields', async () => {
    const ctx = mockContext('POST', { make: 'Honda', model: 'Civic', year: 2015 });
    const res = await onRequestPost(ctx);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.id).toBe('honda-civic-2015');
  });

  it('generates clean ID from make/model/year', async () => {
    const ctx = mockContext('POST', { make: 'Toyota', model: 'Tacoma', year: 2008 });
    const res = await onRequestPost(ctx);
    const data = await res.json();
    expect(data.id).toBe('toyota-tacoma-2008');
  });
});

// ============================================================
// Projects API tests
// ============================================================
describe('Projects API', async () => {
  const { onRequestPost } = await import('../functions/api/projects.js');

  it('rejects POST with missing vehicle_id', async () => {
    const ctx = mockContext('POST', { title: 'Test', module: 'repair' });
    const res = await onRequestPost(ctx);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('vehicle_id');
  });

  it('rejects POST with missing title', async () => {
    const ctx = mockContext('POST', { vehicle_id: 'test-vehicle-1', module: 'repair' });
    const res = await onRequestPost(ctx);
    expect(res.status).toBe(400);
  });

  it('rejects POST with missing module', async () => {
    const ctx = mockContext('POST', { vehicle_id: 'test-vehicle-1', title: 'Test' });
    const res = await onRequestPost(ctx);
    expect(res.status).toBe(400);
  });

  it('accepts valid POST', async () => {
    const ctx = mockContext('POST', {
      vehicle_id: 'test-vehicle-1', title: 'Brake repair', module: 'repair',
    });
    const res = await onRequestPost(ctx);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.id).toContain('test-vehicle-1');
  });
});

// ============================================================
// FSM Upload validation tests
// ============================================================
describe('FSM Upload', async () => {
  const mod = await import('../functions/api/fsm.js');
  const onRequestPost = mod.onRequestPost;

  function mockFormData(fields) {
    return {
      get: (key) => fields[key] ?? null,
    };
  }

  it('rejects when file is a string instead of File', async () => {
    const ctx = {
      env: { DB: mockDB(), STORAGE: mockStorage() },
      request: {
        formData: async () => mockFormData({
          file: 'not-a-file',
          vehicle_id: 'test-vehicle-1',
          title: 'Test',
        }),
      },
    };
    const res = await onRequestPost(ctx);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('File');
  });

  it('rejects missing file', async () => {
    const ctx = {
      env: { DB: mockDB(), STORAGE: mockStorage() },
      request: {
        formData: async () => mockFormData({
          vehicle_id: 'test-vehicle-1',
          title: 'Test',
        }),
      },
    };
    const res = await onRequestPost(ctx);
    expect(res.status).toBe(400);
  });

  it('rejects oversized files', async () => {
    const fakeFile = {
      name: 'huge.pdf',
      size: 200 * 1024 * 1024, // 200MB
      type: 'application/pdf',
      stream: () => ({}),
    };
    const ctx = {
      env: { DB: mockDB(), STORAGE: mockStorage() },
      request: {
        formData: async () => mockFormData({
          file: fakeFile,
          vehicle_id: 'test-vehicle-1',
          title: 'Test',
        }),
      },
    };
    const res = await onRequestPost(ctx);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('too large');
  });

  it('rejects non-PDF files', async () => {
    const fakeFile = {
      name: 'script.js',
      size: 1024,
      type: 'application/javascript',
      stream: () => ({}),
    };
    const ctx = {
      env: { DB: mockDB(), STORAGE: mockStorage() },
      request: {
        formData: async () => mockFormData({
          file: fakeFile,
          vehicle_id: 'test-vehicle-1',
          title: 'Test',
        }),
      },
    };
    const res = await onRequestPost(ctx);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('PDF');
  });

  it('accepts valid PDF upload', async () => {
    const fakeFile = {
      name: 'FSU.pdf',
      size: 5 * 1024 * 1024, // 5MB
      type: 'application/pdf',
      stream: () => ({}),
    };
    const ctx = {
      env: { DB: mockDB(), STORAGE: mockStorage() },
      request: {
        formData: async () => mockFormData({
          file: fakeFile,
          vehicle_id: 'test-vehicle-1',
          title: 'Front Suspension',
        }),
      },
    };
    const res = await onRequestPost(ctx);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.r2Key).toContain('test-vehicle-1');
    expect(ctx.env.STORAGE.put).toHaveBeenCalled();
  });

  it('sanitizes filenames with path traversal', async () => {
    const fakeFile = {
      name: '../../../etc/passwd',
      size: 1024,
      type: 'application/pdf',
      stream: () => ({}),
    };
    const ctx = {
      env: { DB: mockDB(), STORAGE: mockStorage() },
      request: {
        formData: async () => mockFormData({
          file: fakeFile,
          vehicle_id: 'test-vehicle-1',
          title: 'Test',
        }),
      },
    };
    const res = await onRequestPost(ctx);
    expect(res.status).toBe(200);
    // Check that the R2 key doesn't contain path traversal
    const putCall = ctx.env.STORAGE.put.mock.calls[0];
    expect(putCall[0]).not.toContain('..');
    expect(putCall[0]).not.toContain('/etc/');
  });
});

// ============================================================
// Crawler tests
// ============================================================
describe('FSM Crawler', async () => {
  const { onRequestPost: crawlPost, onRequestGet: crawlGet } = await import('../functions/api/fsm/crawl.js');

  it('rejects crawl without required fields', async () => {
    const ctx = mockContext('POST', { vehicle_id: 'test-vehicle-1' });
    const res = await crawlPost(ctx);
    expect(res.status).toBe(400);
  });

  it('rejects unknown source', async () => {
    const ctx = mockContext('POST', {
      vehicle_id: 'test-vehicle-1',
      source: 'fake_source',
      model: 'Leaf',
      year: '2013',
    });
    const res = await crawlPost(ctx);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Unknown source');
  });

  it('returns 501 for unmapped model/year', async () => {
    const ctx = mockContext('POST', {
      vehicle_id: 'test-vehicle-2',
      source: 'nicoclub_nissan',
      model: 'Rogue',
      year: '2020',
    });
    const res = await crawlPost(ctx);
    expect(res.status).toBe(501);
    const data = await res.json();
    expect(data.hint).toContain('upload');
  });

  it('creates job for known model/year (Leaf 2013)', async () => {
    const ctx = mockContext('POST', {
      vehicle_id: 'test-vehicle-1',
      source: 'nicoclub_nissan',
      model: 'Leaf',
      year: '2013',
    });
    const res = await crawlPost(ctx);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.jobId).toBeTruthy();
    expect(data.sections.length).toBeGreaterThan(40);
    expect(data.hint).toContain('/continue');
  });

  it('GET lists available sources when no job_id', async () => {
    const ctx = {
      env: { CACHE: mockKV() },
      request: { url: 'https://test.dev/api/fsm/crawl', method: 'GET' },
    };
    const res = await crawlGet(ctx);
    const data = await res.json();
    expect(data.sources).toBeDefined();
    expect(data.sources.length).toBeGreaterThan(0);
    expect(data.knownSections).toBeDefined();
  });
});

// ============================================================
// Auth middleware tests
// ============================================================
describe('Auth Middleware', async () => {
  const { onRequest } = await import('../functions/api/_middleware.js');

  const TEST_URL = 'https://garage-brain.pages.dev/api/test';

  it('allows GET requests without auth', async () => {
    let nextCalled = false;
    const ctx = {
      env: { API_SECRET: 'test-secret' },
      request: { method: 'GET', url: TEST_URL, headers: new Map() },
      next: async () => { nextCalled = true; return new Response('ok'); },
    };
    await onRequest(ctx);
    expect(nextCalled).toBe(true);
  });

  it('blocks POST without token from external origin', async () => {
    const headers = new Map();
    headers.set('Origin', 'https://evil-site.com');
    const ctx = {
      env: { API_SECRET: 'test-secret' },
      request: { method: 'POST', url: TEST_URL, headers },
      next: async () => new Response('ok'),
    };
    const res = await onRequest(ctx);
    expect(res.status).toBe(401);
  });

  it('blocks POST with no origin and no token', async () => {
    const ctx = {
      env: { API_SECRET: 'test-secret' },
      request: { method: 'POST', url: TEST_URL, headers: new Map() },
      next: async () => new Response('ok'),
    };
    const res = await onRequest(ctx);
    expect(res.status).toBe(401);
  });

  it('blocks POST with wrong token', async () => {
    const headers = new Map();
    headers.set('Authorization', 'Bearer wrong-token');
    const ctx = {
      env: { API_SECRET: 'test-secret' },
      request: { method: 'POST', url: TEST_URL, headers },
      next: async () => new Response('ok'),
    };
    const res = await onRequest(ctx);
    expect(res.status).toBe(401);
  });

  it('allows POST with correct Bearer token', async () => {
    let nextCalled = false;
    const headers = new Map();
    headers.set('Authorization', 'Bearer test-secret');
    const ctx = {
      env: { API_SECRET: 'test-secret' },
      request: { method: 'POST', url: TEST_URL, headers },
      next: async () => { nextCalled = true; return new Response('ok'); },
    };
    await onRequest(ctx);
    expect(nextCalled).toBe(true);
  });

  it('allows POST with correct X-API-Key header', async () => {
    let nextCalled = false;
    const headers = new Map();
    headers.set('X-API-Key', 'test-secret');
    const ctx = {
      env: { API_SECRET: 'test-secret' },
      request: { method: 'POST', url: TEST_URL, headers },
      next: async () => { nextCalled = true; return new Response('ok'); },
    };
    await onRequest(ctx);
    expect(nextCalled).toBe(true);
  });

  it('allows same-origin POST without token', async () => {
    let nextCalled = false;
    const headers = new Map();
    headers.set('Origin', 'https://garage-brain.pages.dev');
    const ctx = {
      env: { API_SECRET: 'test-secret' },
      request: { method: 'POST', url: TEST_URL, headers },
      next: async () => { nextCalled = true; return new Response('ok'); },
    };
    await onRequest(ctx);
    expect(nextCalled).toBe(true);
  });

  it('blocks cross-origin POST without token', async () => {
    const headers = new Map();
    headers.set('Origin', 'https://different-site.com');
    const ctx = {
      env: { API_SECRET: 'test-secret' },
      request: { method: 'POST', url: TEST_URL, headers },
      next: async () => new Response('ok'),
    };
    const res = await onRequest(ctx);
    expect(res.status).toBe(401);
  });

  it('allows all methods in dev mode without secret', async () => {
    let nextCalled = false;
    const ctx = {
      env: { ENVIRONMENT: 'development' },
      request: { method: 'POST', url: TEST_URL, headers: new Map() },
      next: async () => { nextCalled = true; return new Response('ok'); },
    };
    await onRequest(ctx);
    expect(nextCalled).toBe(true);
  });
});
