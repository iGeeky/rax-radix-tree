const assert = require('assert');
const { parsePath } = require('../radix-tree');

describe('parsePath', function() {
  it('should handle path without asterisk', function() {
    const result = parsePath('/api/users');
    assert.deepStrictEqual(result, {
      treePath: '/api/users',
      path: '/api/users',
      matchType: 'equals',
      pathPattern: undefined
    });
  });

  it('should handle path with a single asterisk', function() {
    const result = parsePath('/api/users/*');
    assert.deepStrictEqual(result, {
      treePath: '/api/users/',
      path: '/api/users/*',
      matchType: 'prefix',
      pathPattern: '^\\/api\\/users\\/[^/]*$'
    });
  });

  it('should handle path with two consecutive asterisks', function() {
    const result = parsePath('/api/**');
    assert.deepStrictEqual(result, {
      treePath: '/api/',
      path: '/api/**',
      matchType: 'prefix',
      pathPattern: '^\\/api\\/.*$'
    });
  });

  it('should handle complex path with multiple asterisks', function() {
    const result = parsePath('/api/*/users/**/profile');
    assert.deepStrictEqual(result, {
      treePath: '/api/',
      path: '/api/*/users/**/profile',
      matchType: 'prefix',
      pathPattern: '^\\/api\\/[^/]*\\/users\\/.*\\/profile$'
    });
  });

  it('should handle path starting with asterisk', function() {
    const result = parsePath('**.jpg');
    assert.deepStrictEqual(result, {
      treePath: 'gpj.',
      path: '**.jpg',
      matchType: 'suffix',
      pathPattern: '^gpj\\..*$'
    });
  });

  it('should handle path with special characters', function() {
    const result = parsePath('/api/users?id=*');
    assert.deepStrictEqual(result, {
      treePath: '/api/users?id=',
      path: '/api/users?id=*',
      matchType: 'prefix',
      pathPattern: '^\\/api\\/users\\?id=[^/]*$'
    });
  });

  it('should handle path with more special characters', function() {
    const result = parsePath('/api/users+/[profile].{json}');
    assert.deepStrictEqual(result, {
      treePath: '/api/users+/[profile].{json}',
      path: '/api/users+/[profile].{json}',
      matchType: 'equals',
      pathPattern: undefined,
    });
  });

  it('should handle empty path', function() {
    const result = parsePath('');
    assert.deepStrictEqual(result, {
      treePath: '',
      path: '',
      matchType: 'equals',
      pathPattern: undefined
    });
  });
});
