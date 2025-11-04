import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { getGithubLastEdit } from '@/content/github';

// Mock fetch globally
const originalFetch = global.fetch;

beforeEach(() => {
  global.fetch = vi.fn();
});

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe('getGithubLastEdit', () => {
  test('uses default GitHub API URL when baseUrl is not provided', async () => {
    const mockResponse = [
      {
        commit: {
          committer: {
            date: '2024-01-01T00:00:00Z',
          },
        },
      },
    ];

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await getGithubLastEdit({
      owner: 'fuma-nama',
      repo: 'fumadocs',
      path: 'content/docs/index.mdx',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('https://api.github.com/repos/fuma-nama/fumadocs/commits'),
      expect.any(Object),
    );
    expect(result).toBeInstanceOf(Date);
    expect(result?.toISOString()).toBe('2024-01-01T00:00:00.000Z');
  });

  test('uses custom baseUrl when provided', async () => {
    const mockResponse = [
      {
        commit: {
          committer: {
            date: '2024-02-15T12:30:00Z',
          },
        },
      },
    ];

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const customBaseUrl = 'https://github.enterprise.com/api/v3';
    const result = await getGithubLastEdit({
      owner: 'myorg',
      repo: 'myrepo',
      path: 'docs/test.md',
      baseUrl: customBaseUrl,
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(`${customBaseUrl}/repos/myorg/myrepo/commits`),
      expect.any(Object),
    );
    expect(result).toBeInstanceOf(Date);
    expect(result?.toISOString()).toBe('2024-02-15T12:30:00.000Z');
  });

  test('includes token in authorization header when provided', async () => {
    const mockResponse = [
      {
        commit: {
          committer: {
            date: '2024-01-01T00:00:00Z',
          },
        },
      },
    ];

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    await getGithubLastEdit({
      owner: 'test',
      repo: 'test',
      path: 'test.md',
      token: 'Bearer ghp_test123',
    });

    const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const fetchOptions = fetchCall[1];
    expect(fetchOptions.headers.get('authorization')).toBe('Bearer ghp_test123');
  });

  test('returns null when no commits are found', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    const result = await getGithubLastEdit({
      owner: 'test',
      repo: 'test',
      path: 'nonexistent.md',
    });

    expect(result).toBeNull();
  });

  test('throws error when fetch fails', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      text: async () => 'Not Found',
    });

    await expect(
      getGithubLastEdit({
        owner: 'test',
        repo: 'test',
        path: 'test.md',
      }),
    ).rejects.toThrow('Failed to fetch last edit time from Git');
  });

  test('correctly formats query parameters', async () => {
    const mockResponse = [
      {
        commit: {
          committer: {
            date: '2024-01-01T00:00:00Z',
          },
        },
      },
    ];

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    await getGithubLastEdit({
      owner: 'test',
      repo: 'test',
      path: 'docs/test.md',
      sha: 'main',
      params: { author: 'testuser' },
    });

    const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const url = fetchCall[0];
    
    expect(url).toContain('path=docs%2Ftest.md');
    expect(url).toContain('page=1');
    expect(url).toContain('per_page=1');
    expect(url).toContain('sha=main');
    expect(url).toContain('author=testuser');
  });
});
