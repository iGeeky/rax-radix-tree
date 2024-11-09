# Name

A high-performance radix tree implementation for Node.js, providing efficient routing and pattern matching capabilities. This library is built on top of the rax radix tree implementation in ANSI C (https://github.com/antirez/rax), offering excellent performance and scalability for large-scale applications.

# Table of Contents

- [Name](#name)
- [Table of Contents](#table-of-contents)
- [Synopsis](#synopsis)
  - [RadixTree](#radixtree)
  - [HttpRadixTree](#httpradixtree)
- [Class Methods](#class-methods)
  - [RadixTree](#radixtree-1)
    - [constructor](#constructor)
    - [findAllRoutes](#findallroutes)
    - [findRoute](#findroute)
  - [HttpRadixTree](#httpradixtree-1)
    - [constructor](#constructor-1)
- [Examples](#examples)
  - [Full Path Match](#full-path-match)
  - [Prefix Match](#prefix-match)
  - [Suffix Match](#suffix-match)
  - [Domain Matching](#domain-matching)
  - [Remote Address Matching](#remote-address-matching)
  - [Expression Matching (GET Parameters)](#expression-matching-get-parameters)
  - [Expression Matching (Request Headers)](#expression-matching-request-headers)
- [Installation](#installation)
- [Benchmarks](#benchmarks)
- [License](#license)

# Synopsis

## RadixTree

```js
const { RadixTree } = require('rax-radix-tree');

// Define routes
const routes = [
  { paths: ['/api/users'], meta: { id: 1 } },
  { paths: ['/api/users/*'], meta: { id: 2 } },
  { paths: ['/api/posts/**'], meta: { id: 3 } },
  { paths: ['**.jpg', '*.png'], meta: { id: 4 } },
];

// Create RadixTree instance
const tree = new RadixTree(routes);

// Find matching routes
const result1 = tree.findAllRoutes('/api/users');
console.log(result1); // [{ meta: { id: 1 } }]

const result2 = tree.findAllRoutes('/api/users/123');
console.log(result2); // [{ meta: { id: 2 } }]

const result3 = tree.findAllRoutes('/api/posts/2023/05/01');
console.log(result3); // [{ meta: { id: 3 } }]

const result4 = tree.findAllRoutes('/images/photo.jpg');
console.log(result4); // [{ meta: { id: 4 } }]

// Use findRoute method (requires passing an object containing path)
const matchedRoute = tree.findRoute({ path: '/api/users/123', method: 'GET' });
console.log(matchedRoute); // { meta: { id: 2 } }
```

## HttpRadixTree

```js
const { HttpRadixTree } = require('rax-radix-tree');

// Define HTTP routes
const httpRoutes = [
  { paths: ['/api/**'], meta: { id: 1 }, hosts: ['example.com'] },
  { paths: ['/api/users/**'], meta: { id: 2 }, methods: ['GET', 'POST'] },
  { paths: ['/api/admin/**'], meta: { id: 3 }, remoteAddrs: ['127.0.0.1', '192.168.1.0/24'] },
  { paths: ['/api/products/**'], meta: { id: 4 }, exprs: ['category == "electronics" and price > 100'] },
];

// Create HttpRadixTree instance
const httpTree = new HttpRadixTree(httpRoutes);

// Find matching HTTP routes
const httpResult1 = httpTree.findRoute({
  path: '/api/users/123',
  method: 'GET',
  headers: { host: 'example.com' }
});
console.log(httpResult1); // { meta: { id: 2 } }

const httpResult2 = httpTree.findRoute({
  path: '/api/admin/dashboard',
  method: 'GET',
  remoteAddr: '127.0.0.1'
});
console.log(httpResult2); // { meta: { id: 3 } }

const httpResult3 = httpTree.findRoute({
  path: '/api/products/laptop',
  method: 'GET',
  args: { category: 'electronics', price: '599.99' }
});
console.log(httpResult3); // { meta: { id: 4 } }

// Non-matching case
const httpResult4 = httpTree.findRoute({
  path: '/api/users/123',
  method: 'PUT',
  headers: { host: 'other-domain.com' }
});
console.log(httpResult4); // null
```

[Back to TOC](#table-of-contents)

# Class Methods

## RadixTree

### constructor

```js
constructor(routes: Route[], matchFunc?: MatchFunction)
```

Creates a new RadixTree instance.

Parameters:

- `routes`: Array of route configurations
- `matchFunc`: Optional custom matching function

Each route can contain the following properties:

| Name    | Required? | Description                                                           | Example                      |
|---------|-----------|-----------------------------------------------------------------------|------------------------------|
| paths   | Required  | List of request paths to match. By default, performs full matching. Adding `*` at the end will perform prefix matching, but not including '/' characters. Adding `**` will perform arbitrary matching, matching all characters. For example, `/foo*` can match `/foobar`, but not `/foo/bar`. `/foo**` can match both `/foo/bar` and `/foo/car/far`. Adding a suffix pattern like `**.jpg` will match all paths ending with `.jpg`. For instance, `**.jpg` would match `/images/photo.jpg` and `/uploads/profile.jpg`. | `["/", "/foo", "/bar/*", "/baz/**", "**.jpg"]` |
| methods | Optional  | List of HTTP methods to match. Valid values: "GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS", "CONNECT", "TRACE", and "ALL". If not specified, defaults to "ALL". | `["GET", "POST"]`                   |
| meta    | Optional  | Metadata to be returned when the route matches.                        | `{ id: 1 }`            |

### findAllRoutes

```js
findAllRoutes(path: string, method?: string): Array<Route>
```

Finds all routes that match the given path and method.

Parameters:

- `path`: The path to match against
- `method`: (Optional) The HTTP method to match

Returns:

- An array of matching routes

### findRoute

```js
findRoute(req: { path: string, method?: string, [key: string]: any }): Route | null
```

Finds the first route that matches the given request object.

Parameters:

- `req`: A request object containing path, method, and other optional properties

Returns:

- The matching route object if found, or null if no match is found

## HttpRadixTree

### constructor

```js
constructor(routes: HttpRoute[])
```

Creates a new HttpRadixTree instance.

Parameters:

- `routes`: Array of HTTP route configurations

Each HTTP route can contain the following properties:

| Name        | Required? | Description                                                                                    | Example                                     |
|-------------|-----------|------------------------------------------------------------------------------------------------|---------------------------------------------|
| paths       | Required  | List of request paths to match. Supports the same matching rules as RadixTree.                 | `["/api/**", "/users/*"]`                   |
| methods     | Optional  | List of HTTP methods to match. Same as RadixTree.                                              | `["GET", "POST"]`                           |
| hosts       | Optional  | List of host addresses to match. Supports wildcards. For example, `*.example.com` can match `foo.example.com` and `bar.example.com`. | `["example.com", "*.api.com"]`              |
| remoteAddrs | Optional  | List of remote addresses (IPv4 or IPv6) to match. Supports CIDR format.                        | `["127.0.0.1", "192.168.1.0/24", "::1", "fe80::/10"]` |
| exprs       | Optional  | List of expressions to evaluate request parameters. Uses [filtrex](https://github.com/joewalnes/filtrex) syntax. | `["age >= 18", "category in ('electronics', 'books')"]` |
| meta        | Optional  | Metadata to be returned when the route matches.                                                | `{ id: 1 }`                                 |

HttpRadixTree adds support for matching hosts, remote addresses, and custom expressions on top of RadixTree, making it more suitable for HTTP routing scenarios.

Both classes provide powerful route matching capabilities and can be chosen based on different needs. RadixTree is suitable for general path matching scenarios, while HttpRadixTree is more suitable for complex HTTP routing matching requirements.

[Back to TOC](#table-of-contents)

# Examples

## Full Path Match

Demonstrates basic full path matching:

```js
const { RadixTree } = require('rax-radix-tree');

const routes = [
  { paths: ['/users'], meta: { handler: 'listUsers' } },
  { paths: ['/users/create'], meta: { handler: 'createUser' } },
  { paths: ['/posts'], meta: { handler: 'listPosts' } }
];

const tree = new RadixTree(routes);

console.log(tree.findRoute({ path: '/users' }));
// Output: { meta: { handler: 'listUsers' } }

console.log(tree.findRoute({ path: '/users/create' }));
// Output: { meta: { handler: 'createUser' } }

console.log(tree.findRoute({ path: '/posts' }));
// Output: { meta: { handler: 'listPosts' } }

console.log(tree.findRoute({ path: '/unknown' }));
// Output: null
```

## Prefix Match

Shows how to use wildcard characters for prefix matching:


```js
const { RadixTree } = require('rax-radix-tree');

const routes = [
  { paths: ['/api/*'], meta: { access: 'public' } },
  { paths: ['/admin/**'], meta: { access: 'private' } }
];

const tree = new RadixTree(routes);

console.log(tree.findRoute({ path: '/api/users' }));
// Output: { meta: { access: 'public' } }

console.log(tree.findRoute({ path: '/api/posts/recent' }));
// Output: null (because '/api/*' only matches one level)

console.log(tree.findRoute({ path: '/admin/dashboard' }));
// Output: { meta: { access: 'private' } }

console.log(tree.findRoute({ path: '/admin/users/edit' }));
// Output: { meta: { access: 'private' } }
```

## Suffix Match

Illustrates suffix matching using double wildcards:

```js
const { RadixTree } = require('rax-radix-tree');

const routes = [
  { paths: ['**.jpg', '**.png'], meta: { type: 'image' } },
  { paths: ['**.html'], meta: { type: 'webpage' } }
];

const tree = new RadixTree(routes);

console.log(tree.findRoute({ path: '/images/photo.jpg' }));
// Output: { meta: { type: 'image' } }

console.log(tree.findRoute({ path: '/assets/icon.png' }));
// Output: { meta: { type: 'image' } }

console.log(tree.findRoute({ path: '/index.html' }));
// Output: { meta: { type: 'webpage' } }

console.log(tree.findRoute({ path: '/document.pdf' }));
// Output: null
```

## Domain Matching

Demonstrates domain matching using HttpRadixTree:

```js
const { HttpRadixTree } = require('rax-radix-tree');

const routes = [
  { paths: ['/**'], hosts: ['example.com'], meta: { site: 'main' } },
  { paths: ['/**'], hosts: ['*.example.com'], meta: { site: 'subdomain' } },
  { paths: ['/**'], hosts: ['api.example.com'], meta: { site: 'api' } }
];

const tree = new HttpRadixTree(routes);

console.log(tree.findRoute({ path: '/', headers: { host: 'example.com' } }));
// Output: { meta: { site: 'main' } }

console.log(tree.findRoute({ path: '/about', headers: { host: 'blog.example.com' } }));
// Output: { meta: { site: 'subdomain' } }

console.log(tree.findRoute({ path: '/users', headers: { host: 'api.example.com' } }));
// Output: { meta: { site: 'api' } }
```

## Remote Address Matching

Shows how to match routes based on remote IP addresses:

```js
const { HttpRadixTree } = require('rax-radix-tree');

const routes = [
  { paths: ['/admin/**'], remoteAddrs: ['127.0.0.1'], meta: { access: 'local' } },
  { paths: ['/api/**'], remoteAddrs: ['192.168.1.0/24'], meta: { access: 'lan' } },
  { paths: ['/**'], meta: { access: 'public' } }
];

const tree = new HttpRadixTree(routes);

console.log(tree.findRoute({ path: '/admin/dashboard', remoteAddr: '127.0.0.1' }));
// Output: { meta: { access: 'local' } }

console.log(tree.findRoute({ path: '/api/users', remoteAddr: '192.168.1.100' }));
// Output: { meta: { access: 'lan' } }

console.log(tree.findRoute({ path: '/', remoteAddr: '203.0.113.1' }));
// Output: { meta: { access: 'public' } }
```

## Expression Matching (GET Parameters)

Illustrates how to use expressions for matching GET parameters:

```js
const { HttpRadixTree } = require('rax-radix-tree');

const routes = [
  { paths: ['/products/**'], exprs: ['category == "electronics" and price > 100'], meta: { discount: '10%' } },
  { paths: ['/products/**'], exprs: ['category == "books" and quantity >= 5'], meta: { discount: '20%' } },
  { paths: ['/products/**'], meta: { discount: '0%' } }
];

const tree = new HttpRadixTree(routes);

console.log(tree.findRoute({ 
  path: '/products/laptop', 
  args: { category: 'electronics', price: '999.99' } 
}));
// Output: { meta: { discount: '10%' } }

console.log(tree.findRoute({ 
  path: '/products/novel', 
  args: { category: 'books', quantity: '7' } 
}));
// Output: { meta: { discount: '20%' } }

console.log(tree.findRoute({ 
  path: '/products/pencil', 
  args: { category: 'stationery', price: '1.99' } 
}));
// Output: { meta: { discount: '0%' } }
```

## Expression Matching (Request Headers)

Demonstrates expression matching based on request headers:

```js
const { HttpRadixTree } = require('rax-radix-tree');

const routes = [
  { paths: ['/**'], exprs: ['contains(user_agent, "Mozilla") and accept_language == "en-US"'], meta: { version: 'v1' } },
  { paths: ['/**'], exprs: ['contains(user_agent, "Chrome") and accept_language == "zh-CN"'], meta: { version: 'v2' } },
  { paths: ['/**'], meta: { version: 'default' } }
];

const tree = new HttpRadixTree(routes);

console.log(tree.findRoute({ 
  path: '/', 
  headers: { 
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'accept-language': 'en-US'
  } 
}));
// Output: { meta: { version: 'v1' } }

console.log(tree.findRoute({ 
  path: '/about', 
  headers: { 
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'accept-language': 'zh-CN'
  } 
}));
// Output: { meta: { version: 'v2' } }

console.log(tree.findRoute({ 
  path: '/contact', 
  headers: { 
    'user-agent': 'curl/7.64.1',
    'accept-language': 'fr-FR'
  } 
}));
// Output: { meta: { version: 'default' } }
```

[Back to TOC](#table-of-contents)

# Installation

```shell
npm install rax-radix-tree
```


# Benchmarks

Benchmark test cases are located in the [benchmark](./benchmark) directory.

Environment: MacBook Pro (2023), Apple M3 Max

To start benchmarking, run:

```shell
sh benchmark/run.sh
```

Result:

```markdown
## Match equals

* Result:             equals_50000
* Number of routes:   100000
* Number of matches:  10000000
* Execution time:     492 ms
* QPS:                20320429

## Match suffix

* Result:             suffix_50000
* Number of routes:   100000
* Number of matches:  1000000
* Execution time:     2851 ms
* QPS:                350786

## Match prefix, route found

* Result:             prefix_50000
* Number of routes:   100000
* Number of matches:  1000000
* Execution time:     2302 ms
* QPS:                434428

## Match prefix, route not found

* Result:             null
* Number of routes:   100000
* Number of matches:  1000000
* Execution time:     2231 ms
* QPS:                448280

## Equal match in combined tree

* Result:             equals_50000
* Number of routes:   300000
* Number of matches:  100000
* Execution time:     372 ms
* QPS:                269047

## Prefix match in combined tree

* Result:             prefix_50000
* Number of routes:   300000
* Number of matches:  100000
* Execution time:     453 ms
* QPS:                220543

## Suffix match in combined tree

* Result:             suffix_50000
* Number of routes:   300000
* Number of matches:  100000
* Execution time:     525 ms
* QPS:                190578

## Route not found in combined tree

* Result:             null
* Number of routes:   300000
* Number of matches:  100000
* Execution time:     444 ms
* QPS:                225436

## Match hosts

* Result:             hosts_500
* Number of routes:   1000
* Number of matches:  100000
* Execution time:     3067 ms
* QPS:                32608

## Match wildcard hosts

* Result:             wildcard_hosts_500
* Number of routes:   1000
* Number of matches:  100000
* Execution time:     3995 ms
* QPS:                25029

## Match remote address, route found

* Result:             { access: 'local' }
* Number of routes:   1000
* Number of matches:  1000
* Execution time:     172 ms
* QPS:                5804

## Match remote address, route not found

* Result:             { access: 'public' }
* Number of routes:   1000
* Number of matches:  1000
* Execution time:     300 ms
* QPS:                3327

## Match expressions and headers, route found

* Result:             { version: 'v501' }
* Number of routes:   1000
* Number of matches:  1000
* Execution time:     442 ms
* QPS:                2262

## Match expressions and headers, route not found

* Result:             { version: 'default' }
* Number of routes:   1000
* Number of matches:  1000
* Execution time:     778 ms
* QPS:                1285

## Match expressions and parameters, route found

* Result:             { discount: '10%' }
* Number of routes:   1000
* Number of matches:  1000
* Execution time:     275 ms
* QPS:                3632

## Match expressions and parameters, route not found

* Result:             { discount: '0%' }
* Number of routes:   1000
* Number of matches:  1000
* Execution time:     475 ms
* QPS:                2104
```

[Back to TOC](#table-of-contents)

# License

[MIT](./LICENSE)
