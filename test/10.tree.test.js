const assert = require('assert');
const { RadixTree } = require('../index');

describe('RadixTree', function() {
  describe('Construction and Initialization', function() {
    it('should correctly initialize RadixTree', function() {
      const routes = [
        { paths: ['/api/users'], methods: ['GET'], meta: { id: 1 } },
        { paths: ['/api/users/*'], methods: ['POST'], meta: { id: 2 } },
      ];
      const tree = new RadixTree(routes);
      assert(tree instanceof RadixTree);
    });
  });

  describe('Route Matching', function() {
    let tree;

    beforeEach(function() {
      const routes = [
        { paths: ['/api/users'], meta: { id: 1 } },
        { paths: ['/api/users'], meta: { id: 2 } },
        { paths: ['/api/users/*'], meta: { id: 3 } },
        { paths: ['/api/posts/**'], meta: { id: 4 } },
        { paths: ['/api/comments'], meta: { id: 5 } },
        { paths: ['/service/**', '/servicev2/**'], meta: { id: 6 } },
        { paths: ['/service/user/*'], meta: { id: 7 } },
        { paths: ['**.jpg', '*.png'], meta: { id: 8 } },
        { paths: ['**/test.jpg'], meta: { id: 9 } },
        { paths: ['/static/**'], meta: { id: 10 } },
      ];
      tree = new RadixTree(routes, null);
    });

    it('should match exact paths', function() {
      const result = tree.findAllRoutes('/api/users');
      assert.strictEqual(result.length, 2);
      assert.deepStrictEqual(result.map(r => r.meta.id), [1, 2]);
    });

    it('should match paths with a single asterisk', function() {
      const result = tree.findAllRoutes('/api/users/123');
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].meta.id, 3);
    });

    it('should match normal paths with double asterisks', function() {
        const result = tree.findAllRoutes('/api/posts/2023');
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].meta.id, 4);
    });

    it('should match suffix .jpg file in nested directories', function() {
      const result = tree.findAllRoutes('/2023/05/01.jpg');
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].meta.id, 8);
    });

    it('should match suffix .png file in root directory', function() {
      const result = tree.findAllRoutes('01.png');
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].meta.id, 8);
    });

    it('should test high priority suffix matching functionality', function() {
        const result = tree.findAllRoutes('/static/img/test.jpg');
        assert.strictEqual(result.length, 3);
        assert.deepStrictEqual(result.map(r => r.meta.id), [9, 8, 10]);
    });

    it('should match paths with double asterisks', function() {
      const result = tree.findAllRoutes('/api/posts/2023/05/01');
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].meta.id, 4);
    });

    it('should not match non-existent paths', function() {
      const result = tree.findAllRoutes('/api/nonexistent');
      assert.strictEqual(result.length, 0);
    });

    it('should correctly handle prefix matching', function() {
      const result = tree.findAllRoutes('/api/users/profile');
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].meta.id, 3);
    });

    it('should match normal paths with service/**', function() {
      const result = tree.findAllRoutes('/service/user/123');
      assert.strictEqual(result.length, 2);
      assert.deepStrictEqual(result.map(r => r.meta.id), [7, 6]);
    });

    it('should match normal paths with servicev2/**', function() {
      const result = tree.findAllRoutes('/servicev2/user/123');
      assert.strictEqual(result.length, 1);
      assert.deepStrictEqual(result.map(r => r.meta.id), [6]);
    });

  });

  describe('Adding Any Route Configuration', function() {
    let tree;
    beforeEach(function() {
      const routes = [
        { paths: ['/**'], meta: { id: 10 } },
        { paths: ['/api/users/*/posts'], meta: { id: 11 } },
        { paths: ['/api/users/**/comments'], meta: { id: 12 } },
      ];
      tree = new RadixTree(routes, null);
    });
    it('should match any path', function() {
        const result = tree.findAllRoutes('/users/123/posts');
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].meta.id, 10);
      });
      it('should match any path 2', function() {
        const result = tree.findAllRoutes('/index');
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].meta.id, 10);
      });
      it('should match any path 3', function() {
        const result = tree.findAllRoutes('/');
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].meta.id, 10);
    });
  });

  describe('Method Matching', function() {
    let tree;
    beforeEach(function() {
      const routes = [
        { paths: ['/api/**'], meta: { id: 1 } },
        { methods: ['POST'], paths: ['/**'], meta: { id: 2 } },
        { methods: ['ALL'], paths: ['/api/users'], meta: { id: 5 } },
        { methods: ['POST'], paths: ['/api/users'], meta: { id: 6} },
        { methods: ['GET'], paths: ['/api/users'], meta: { id: 7} },
        { methods: ['GET', 'POST'], paths: ['/api/users/**'], meta: { id: 8} },
      ];
      tree = new RadixTree(routes, null);
    });

    it('should match routes without specified method (treated as ALL)', function() {
      const result = tree.findAllRoutes('/api/posts', 'GET');
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].meta.id, 1);
    });

    it('should match routes with specified method', function() {
      const result = tree.findAllRoutes('/api/users', 'POST');
      assert.strictEqual(result.length, 4);
      assert.deepStrictEqual(result.map(r => r.meta.id), [6, 5, 1, 2]);
      // assert.deepStrictEqual(result.map(r => r.meta.id).sort(), [5, 6, 8]);
    });

    it('should match routes with ALL method', function() {
      const result = tree.findAllRoutes('/api/users', 'PUT');
      assert.strictEqual(result.length, 2);
      assert.deepStrictEqual(result.map(r => r.meta.id), [5, 1]);
    });

    it('should match multiple matching routes', function() {
      const result = tree.findAllRoutes('/api/users/123', 'GET');
      assert.strictEqual(result.length, 2);
      assert.deepStrictEqual(result.map(r => r.meta.id), [8, 1]);
    });

    it('should not match routes with non-matching method', function() {
      const result = tree.findAllRoutes('/api/users', 'DELETE');
      assert.strictEqual(result.length, 2);
      assert.deepStrictEqual(result.map(r => r.meta.id), [5, 1]);
    });

    it('should match global POST route', function() {
      const result = tree.findAllRoutes('/random/path', 'POST');
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].meta.id, 2);
    });
  });

  describe('Complex Route Matching', function() {
    let tree;

    beforeEach(function() {
      const routes = [
        { paths: ['/api/items'], meta: { id: 1 } },
        { paths: ['/api/items/*'], meta: { id: 2 } },
        { paths: ['/api/items/**'], meta: { id: 3 } },

        { paths: ['/api/users/**'], meta: { id: 10 } },
        { paths: ['/api/users/*/posts'], meta: { id: 11 } },
        { paths: ['/api/users/**/comments'], meta: { id: 12 } },
      ];
      tree = new RadixTree(routes, null);
    });

    it('should correctly distinguish between single asterisk and double asterisk matching', function() {
      let result = tree.findAllRoutes('/api/items/123');
      assert.strictEqual(result.length, 2);
      assert.deepStrictEqual(result.map(r => r.meta.id).sort(), [2, 3]);

      result = tree.findAllRoutes('/api/items/123/456');
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].meta.id, 3);
    });

    it('should correctly handle complex route patterns', function() {
      let result = tree.findAllRoutes('/api/users/123/posts');
      assert.strictEqual(result.length, 2);
      assert.deepStrictEqual(result.map(r => r.meta.id), [11, 10]);

      result = tree.findAllRoutes('/api/users/123/profile/comments');
      assert.strictEqual(result.length, 2);
      assert.deepStrictEqual(result.map(r => r.meta.id), [12, 10]);
    });
  });
});