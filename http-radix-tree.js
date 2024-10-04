const { RadixTree } = require('./radix-tree');
const { LRUCache } = require('lru-cache')
const compileExpression = require('filtrex').compileExpression
const { matches } = require('ip-matching');


function contains(str, substr) {
    return str.includes(substr)
}

function matchHosts(configHosts, requestHost) {
    if (!requestHost) {
        return false
    }
    const matched = configHosts.some(host => {
        if (host.startsWith('*.')) {
            const domain = host.slice(2)
            return requestHost.endsWith(domain)
        }
        return host === requestHost
    })

    return matched
}

const cache = new LRUCache({
    ttl: 1000 * 60,
    max: 10000
});


function matchRemoteAddrs(configAddrs, requestIp) {
    if (!requestIp) {
        return false
    }
    if (!Array.isArray(configAddrs) || configAddrs.length === 0) {
        return false;
    }
    const cacheKey = configAddrs.join(',') + ':' +  requestIp;
    let matched = cache.get(cacheKey);
    if (matched !== undefined) {
        return matched
    }
    matched = configAddrs.some(addr => matches(requestIp, addr));
    cache.set(cacheKey, matched)
    return matched;
}

function matchExprs(compiledExprs, req) {
    if (!Array.isArray(compiledExprs)) {
        return false
    }

    const context = {
        method: req.method,
        path: req.path,
    }
    const tryParseNumber = (value) => {
        if (typeof value === 'string') {
            const num = Number(value);
            return isNaN(num) ? value : num;
        }
        return value;
    };
    if (req.args) {
        for (let key in req.args) {
            key = key.toLowerCase()
            context[key] = tryParseNumber(req.args[key])
        }
    }
    if (req.headers) {
        for (const [key, value] of Object.entries(req.headers)) {
            const normalizedKey = key.toLowerCase().replace(/-/g, '_') // Replace - with _
            context[normalizedKey] = tryParseNumber(value)
        }
    }

    for (const { expr, compiledExpr } of compiledExprs) {
        try {
            const result = compiledExpr(context)
            if (result instanceof Error) {
                // console.info('matchExprs: eval expr %s with values(%s) error: %s', expr, JSON.stringify(context), result.message)
                continue
            }
            if (result) {
                return true
            }
        } catch (error) {
            console.error('Error evaluating filter:', error)
            return false
        }
    }

    return false
}

function httpMatchRoute(route, req) {
    // Check hosts
    const host = req.headers ? req.headers.host : ''
    if (route.hosts && route.hosts.length > 0 && !matchHosts(route.hosts, host)) {
        return false
    }

    // Check remoteAddrs
    if (route.remoteAddrs && route.remoteAddrs.length > 0
        && !matchRemoteAddrs(route.remoteAddrs, req.remoteAddr)) {
        return false
    }

    // Check exprs
    if (route.compiledExprs && route.compiledExprs.length > 0
        && !matchExprs(route.compiledExprs, req)) {
        return false
    }

    return true
}

class HttpRadixTree extends RadixTree {
    /**
     * Creates a new HttpRadixTree instance
     * 
     * @param {Array} routes - Array of route configurations
     * 
     * Each route object should contain:
     * @param {string|string[]} routes[].paths - Route path or array of paths
     * @param {string|string[]} [routes[].methods] - HTTP method or array of methods
     * @param {string[]} [routes[].hosts] - List of allowed hostnames, supports wildcards (e.g. *.example.com)
     * @param {string[]} [routes[].remoteAddrs] - List of allowed remote IP addresses or CIDR ranges
     * @param {string[]} [routes[].exprs] - List of filter expressions
     * 
     * The httpMatchRoute function is used to match routes:
     * - Checks if the request's host matches routes[].hosts
     * - Checks if the request's remoteAddr matches routes[].remoteAddrs
     * - Evaluates all expressions in routes[].compiledExprs
     */
    constructor(routes) {
        for (const route of routes) {
            const exprs = route.exprs || [];
            const compiledExprs = exprs.map(expr => ({
                expr,
                compiledExpr: compileExpression(expr, {extraFunctions: {contains}}),
            }));
            route.compiledExprs = compiledExprs;
        }
        super(routes, httpMatchRoute);
    }
}

exports.HttpRadixTree = HttpRadixTree;
