const assert = require('assert');
const { HttpRadixTree } = require('../http-radix-tree');

describe('HttpRadixTree', function () {

    describe('Http Route Matching By Host', function () {
        let tree;

        beforeEach(function () {
            const routes = [
                { paths: ['/api/**'], meta: { id: 1 }, hosts: ['test.com'] },
                { paths: ['/api/users/**'], meta: { id: 3 }, hosts: ['a.com', 'b.com'] },
                { paths: ['/api/users/**'], meta: { id: 4 }, hosts: ['*.c.com'] },
                { paths: ['/api/users/**'], meta: { id: 10 }, remoteAddrs: ['127.0.0.1', '192.168.1.3'] },
                { paths: ['/api/users/**'], meta: { id: 11 }, remoteAddrs: ['192.168.1.1/24'] },
                { paths: ['/api/users/**'], meta: { id: 12 }, remoteAddrs: ['192.168.1.1/16'] },
                { paths: ['/api/users/**'], meta: { id: 20 }, exprs: ['age >= 10 and x_id mod 20 == 0'] },
                { paths: ['/api/users/**'], meta: { id: 21 }, exprs: ['name in ("tom", "lily")'] },
            ];
            tree = new HttpRadixTree(routes);
        });

        it('path not found', function () {
            const result = tree.findRoute({
                path: '/notfound',
                method: 'GET',
                headers: {
                    host: 'a.com',
                },
            });
            assert.strictEqual(result, null);
        });

        it('path matched, but host not matched', function () {
            const result = tree.findRoute({
                path: '/api/users/1',
                method: 'GET',
                headers: {
                    host: 'x.com',
                },
            });
            assert.strictEqual(result, null);
        });

        it('path matched, host matched with a.com', function () {
            const result = tree.findRoute({
                path: '/api/users/1',
                method: 'GET',
                headers: {
                    host: 'a.com',
                },
            });
            assert.notStrictEqual(result, null);
            assert.strictEqual(result.meta.id, 3);
        });

        it('path matched, host matched with b.com', function () {
            const result = tree.findRoute({
                path: '/api/users/1',
                method: 'GET',
                headers: {
                    host: 'b.com',
                },
            });
            assert.notStrictEqual(result, null);
            assert.strictEqual(result.meta.id, 3);
        });

        it('path matched, host matched with c.com', function () {
            const result = tree.findRoute({
                path: '/api/users/1',
                method: 'GET',
                headers: {
                    host: 'c.com',
                },
            });
            assert.notStrictEqual(result, null);
            assert.strictEqual(result.meta.id, 4);
        });

        it('path matched, host matched with www.c.com', function () {
            const result = tree.findRoute({
                path: '/api/users/1',
                method: 'GET',
                headers: {
                    host: 'www.c.com',
                },
            });
            assert.notStrictEqual(result, null);
            assert.strictEqual(result.meta.id, 4);
        });

        it('path matched, remoteAddr matched with 127.0.0.1', function () {
            const result = tree.findRoute({
                path: '/api/users/1',
                method: 'GET',
                remoteAddr: '127.0.0.1',
            });
            assert.notStrictEqual(result, null);
            assert.strictEqual(result.meta.id, 10);
        });

        it('path matched, remoteAddr matched with 192.168.1.3', function () {
            const result = tree.findRoute({
                path: '/api/users/1',
                method: 'GET',
                remoteAddr: '192.168.1.3',
            });
            assert.notStrictEqual(result, null);
            assert.strictEqual(result.meta.id, 10);
        });

        it('path matched, remoteAddr matched with IP in 192.168.1.0/24 subnet', function () {
            const result = tree.findRoute({
                path: '/api/users/1',
                method: 'GET',
                remoteAddr: '192.168.1.100',
            });
            assert.notStrictEqual(result, null);
            assert.strictEqual(result.meta.id, 11);
        });

        it('path matched, host matched with IP in 192.168.0.0/16 subnet', function () {
            const result = tree.findRoute({
                path: '/api/users/1',
                method: 'GET',
                remoteAddr: '192.168.2.1',
            });
            assert.notStrictEqual(result, null);
            assert.strictEqual(result.meta.id, 12);
        });

        it('path matched, but remoteAddr not matched', function () {
            const result = tree.findRoute({
                path: '/api/users/1',
                method: 'GET',
                remoteAddr: '10.0.0.1',
            });
            assert.strictEqual(result, null);
        });


        it('should match expression condition: age >= 10 and x_id divisible by 20', function () {
            const result = tree.findRoute({
                path: '/api/users/profile',
                method: 'GET',
                args: { age: '25' },
                headers: { 'x-id': '40' },
            });
            assert.notStrictEqual(result, null);
            assert.strictEqual(result.meta.id, 20);
        });

        it('should not match: empty variables', function () {
            const result = tree.findRoute({
                path: '/api/users/profile',
                method: 'GET',
                args: {},
                headers: {},
            });
            assert.strictEqual(result, null);
        });

        it('should not match: age < 10', function () {
            const result = tree.findRoute({
                path: '/api/users/profile',
                method: 'GET',
                args: { age: '9' },
                headers: { 'x-id': '40' },
            });
            assert.strictEqual(result, null);
        });

        it('should not match: x_id not divisible by 20', function () {
            const result = tree.findRoute({
                path: '/api/users/profile',
                method: 'GET',
                args: { age: '25' },
                headers: { 'x-id': '41' },
            });
            assert.strictEqual(result, null);
        });

        it('should match edge case: age = 10 and x_id = 0', function () {
            const result = tree.findRoute({
                path: '/api/users/profile',
                method: 'GET',
                args: { age: '10' },
                headers: { 'x-id': '0' },
            });
            assert.notStrictEqual(result, null);
            assert.strictEqual(result.meta.id, 20);
        });

        it('should match large numbers: both age and x_id are large', function () {
            const result = tree.findRoute({
                path: '/api/users/profile',
                method: 'GET',
                args: { age: '100' },
                headers: { 'x-id': '1000' },
            });
            assert.notStrictEqual(result, null);
            assert.strictEqual(result.meta.id, 20);
        });

        it('should match: name is tom', function () {
            const result = tree.findRoute({
                path: '/api/users/profile',
                method: 'GET',
                args: { name: 'tom' },
            });
            assert.notStrictEqual(result, null);
            assert.strictEqual(result.meta.id, 21);
        });

        it('should match: name is lily', function () {
            const result = tree.findRoute({
                path: '/api/users/profile',
                method: 'GET',
                args: { name: 'lily' },
            });
            assert.notStrictEqual(result, null);
            assert.strictEqual(result.meta.id, 21);
        });

        it('should not match: name is other value', function () {
            const result = tree.findRoute({
                path: '/api/users/profile',
                method: 'GET',
                args: { name: 'john' },
            });
            assert.strictEqual(result, null);
        });

        it('should not match: name parameter missing', function () {
            const result = tree.findRoute({
                path: '/api/users/profile',
                method: 'GET',
                args: {},
            });
            assert.strictEqual(result, null);
        });

        it('should match: name is tom (case sensitive)', function () {
            const result = tree.findRoute({
                path: '/api/users/profile',
                method: 'GET',
                args: { name: 'TOM' },
            });
            assert.strictEqual(result, null);
        });
    });

    describe('Http Route Matching By Host Extension', function () {
        let tree;

        beforeEach(function () {
            const routes = [
                { paths: ['/**'], meta: { id: 30 }, hosts: ['example.com']},
                { paths: ['/**'], meta: { id: 31 }, hosts: ['*.example.com']},
                { paths: ['/**'], meta: { id: 32 }, hosts: ['api.example.com']}

            ];
            tree = new HttpRadixTree(routes);
        });

        it('should match exact host example.com', function () {
            const result = tree.findRoute({
                path: '/',
                method: 'GET',
                headers: { host: 'example.com' },
            });
            assert.notStrictEqual(result, null);
            assert.strictEqual(result.meta.id, 30);
        });

        it('should match wildcard subdomain of example.com', function () {
            const result = tree.findRoute({
                path: '/about',
                method: 'GET',
                headers: { host: 'blog.example.com' },
            });
            assert.notStrictEqual(result, null);
            assert.strictEqual(result.meta.id, 31);
        });

        it('should match specific subdomain api.example.com', function () {
            const result = tree.findRoute({
                path: '/users',
                method: 'GET',
                headers: { host: 'api.example.com' },
            });
            assert.notStrictEqual(result, null);
            assert.strictEqual(result.meta.id, 32);
        });

        it('should not match unrelated domain', function () {
            const result = tree.findRoute({
                path: '/',
                method: 'GET',
                headers: { host: 'unrelated.com' },
            });
            assert.strictEqual(result, null);
        });

        it('should match example.com with longer path', function () {
            const result = tree.findRoute({
                path: '/some/long/path',
                method: 'GET',
                headers: { host: 'example.com' },
            });
            assert.notStrictEqual(result, null);
            assert.strictEqual(result.meta.id, 30);
        });
    });
});