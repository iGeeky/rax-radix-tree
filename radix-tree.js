const { RadixTree: RaxRadixTree } = require('./build/Release/rax_radix_tree.node');
const assert = require('assert');

const MATCH_TYPE_EQUALS = 'equals';
const MATCH_TYPE_PREFIX = 'prefix';
const MATCH_TYPE_SUFFIX = 'suffix';

/**
 * Parse path, path supports several patterns:
 * 1. Without '*', full match
 * 2. With a single '*', '*' matches any text not containing '/'
 * 3. With consecutive '**', '**' matches any text
 * Parsing function, the parsed result includes the following parts:
 * treePath: The part before the first '*'
 * path: The input path
 * matchType: Match type, equals => path without '*'. prefix => path with '*'
 * pathPattern: Pattern used for secondary regex matching
 * @param {string} path
 * @returns {Object} Parsing result
 */
function parsePath(path) {
    const originPath = path;
    let matchType = MATCH_TYPE_EQUALS;
    let treePath = path;
    let pathPattern = undefined;

    const starPattern = /(\*\*|\*)/g;
    let parts = undefined;
    if (path.startsWith("*")) {
        matchType = MATCH_TYPE_SUFFIX;
        path = path.split('').reverse().join('');
        parts = path.split(starPattern);
    } else {
        parts = path.split(starPattern);
        matchType = parts.length > 1 ? MATCH_TYPE_PREFIX : MATCH_TYPE_EQUALS;
    }
    treePath = parts[0];
    if (matchType === MATCH_TYPE_PREFIX || matchType === MATCH_TYPE_SUFFIX) {
        pathPattern = '^' + parts.map((part, index) => {
            if (part === '**') {
                return '.*';
            } else if (part === '*') {
                return '[^/]*';
            }
            return part.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&');
        }).join('') + '$';
    }

    return {
        treePath: treePath,
        path: originPath,
        pathPattern: pathPattern,
        matchType: matchType,
    };
}

class RadixTree {
    constructor(routes, matchFunc) {
        this.originRoutes = routes
        // Initialize routes array with undefined at index 0 to ensure indexing starts from 1
        this.routes = [undefined]
        this.prefixTree = new RaxRadixTree() // Prefix matching
        this.suffixTree = new RaxRadixTree() // Suffix matching
        this.equalsMap = {}
        this.prefixRouteCount = 0;
        this.suffixRouteCount = 0;
        this.equalsRouteCount = 0;
        this.matchFunc = matchFunc
        this._initRoutes()
    }

    _initRoute(route, routePath) {
        const pathInfo = parsePath(routePath)
        if (!route.methods) {
            route.methods = ['ALL']
        }
        const treePath = pathInfo.treePath
        const path = pathInfo.path
        delete pathInfo.path

        if (pathInfo.matchType == MATCH_TYPE_EQUALS) {
            const routeInfo = Object.assign({pathInfo, path}, route);
            let index = this.equalsMap[treePath]
            if (index === undefined) {
                this.routes.push([routeInfo]);
                index = this.routes.length - 1;
                this.equalsMap[treePath] = index;
            } else {
                this.routes[index].push(routeInfo);
            }
            this.equalsRouteCount++;
            return
        }

        pathInfo.pattern = new RegExp(pathInfo.pathPattern);
        const routeInfo = Object.assign({pathInfo, path}, route);
        const tree = pathInfo.matchType === MATCH_TYPE_SUFFIX ? this.suffixTree : this.prefixTree;
        // console.log("pathInfo.matchType: %s, tree: %s", pathInfo.matchType, treePath)
        let index = tree.find(treePath)
        if (index === null) {
            this.routes.push([routeInfo]);
            index = this.routes.length - 1;
            tree.insert(treePath, index)
        } else {
            assert(index >= 0 && index < this.routes.length);
            this.routes[index].push(routeInfo);
        }
        if (pathInfo.matchType === MATCH_TYPE_PREFIX) {
            this.prefixRouteCount++;
        } else if (pathInfo.matchType === MATCH_TYPE_SUFFIX) {
            this.suffixRouteCount++;
        }
    }

    _initRoutes() {
        for (let route of this.originRoutes) {
            route = Object.assign({}, route);
            const routePaths = route.paths;
            delete route.paths;
            for(let routePath of routePaths) {
                this._initRoute(route, routePath)
            }
        }

        this._sortAllRoutes();
    }

    _sortAllRoutes() {
        for (let routeArray of this.routes) {
            if (!routeArray) {
                continue
            }
            routeArray.sort((a, b) => {
                const lengthDiff = b.path.length - a.path.length;
                if (lengthDiff !== 0) {
                    return lengthDiff;
                }
                // Compare methods only when both a and b have exactly one method
                if (a.methods.length === 1 && b.methods.length === 1) {
                    if (a.methods[0] === 'ALL' && b.methods[0] !== 'ALL') {
                        return 1;  // a should be placed after
                    } else if (a.methods[0] !== 'ALL' && b.methods[0] === 'ALL') {
                        return -1;  // b should be placed after
                    }
                }

                // Compare hosts (when hosts length is 1)
                if (a.hosts && a.hosts.length === 1 && b.hosts && b.hosts.length === 1) {
                    const aIsWildcard = a.hosts[0].startsWith('*');
                    const bIsWildcard = b.hosts[0].startsWith('*');
                    if (aIsWildcard && !bIsWildcard) {
                        return 1;  // a is a wildcard domain, should be placed after
                    } else if (!aIsWildcard && bIsWildcard) {
                        return -1;  // b is a wildcard domain, should be placed after
                    }
                }

                // If both are 'ALL' or neither is 'ALL', consider them equal
                return 0;
            });
        }
    }
    _routeSimpleMatch(routeInfo, reqPath, method) {
        const { treePath, pattern, matchType } = routeInfo.pathInfo;
        const routeMethods = routeInfo.methods;
        // Check method matching
        if (!routeMethods.includes('ALL') && !routeMethods.includes(method)) {
            return false;
        }

        // Path matching logic
        if (matchType === MATCH_TYPE_EQUALS) {
            return reqPath === routeInfo.path;
        } else if (matchType === MATCH_TYPE_SUFFIX) {
            if (!reqPath.startsWith(treePath)) {
                return false;
            }
            return pattern.test(reqPath);
        } else if (matchType === MATCH_TYPE_PREFIX) {
            if (!reqPath.startsWith(treePath)) {
                return false;
            }
            return pattern.test(reqPath);
        }

        // If no case is matched, return false
        console.error("No case matched, {matchType: %s, path: %s}", matchType, reqPath)
        return false;
    }

    /**
     * Find all routes that match the given path and method.
     * @param {string} path - The path to match against.
     * @param {string} [method=''] - The HTTP method to match (optional).
     * @returns {Array} An array of matching routes.
     */
    findAllRoutes(path, method='') {
        const allRoutes = [];

        // Hash lookup logic
        if (this.equalsRouteCount > 0) {
            const hashIndex = this.equalsMap[path];
            if (hashIndex !== undefined) {
                const exactMatchRoutes = this.routes[hashIndex];
                for (const route of exactMatchRoutes) {
                    if (this._routeSimpleMatch(route, path, method)) {
                        allRoutes.push(route);
                    }
                }
            }
        }

        // Suffix tree lookup logic
        if (this.suffixRouteCount > 0) {
            const reversePath = path.split('').reverse().join('');
            const treeIt = this.suffixTree.search(reversePath);
            if (treeIt) {
                let idx;
                while ((idx = treeIt.up()) !== -1) {
                    if (idx >= this.routes.length) {
                        console.error("Index out of range");
                        break;
                    }
                    const routesArr = this.routes[idx];
                    for (const route of routesArr) {
                        if (this._routeSimpleMatch(route, reversePath, method)) {
                            allRoutes.push(route);
                        }
                    }
                }
            }
        }

        // Prefix tree lookup logic
        if (this.prefixRouteCount > 0) {
            const treeIt = this.prefixTree.search(path);
            if (treeIt) {
                let idx;
                while ((idx = treeIt.up()) !== -1) {
                    if (idx >= this.routes.length) {
                        console.error("Index out of range");
                        break;
                    }
                    const routesArr = this.routes[idx];
                    for (const route of routesArr) {
                        if (this._routeSimpleMatch(route, path, method)) {
                            allRoutes.push(route);
                        }
                    }
                }
            }
        }

        return allRoutes;
    }

    /**
     * Find the first matching route for the given request.
     * @param {Object} req - The request object containing path and method.
     * @returns {Object|null} The first matching route, or null if no match is found.
     */
    findRoute(req) {
        const allRoutes = this.findAllRoutes(req.path, req.method, false);
        if (allRoutes.length === 0) {
            return null;
        }
        if (!this.matchFunc) {
            return allRoutes[0];
        }

        // Use matchFunc to test for a match
        for (const route of allRoutes) {
            const matched = this.matchFunc(route, req)
            if (matched) {
                return route;
            }
        }

        return null;
    }
};

exports.parsePath = parsePath;
exports.RadixTree = RadixTree
