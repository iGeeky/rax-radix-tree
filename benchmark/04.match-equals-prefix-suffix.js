const { benchmark, md5 } = require('./utility');
const routeCount = 1000 * 100;
const matchTimes = 1000 * 100;

const routes = [];
for (let i = 1; i <= routeCount; i++) {
    const hash = md5(i.toString());
    routes.push(
        { paths: ["/" + hash], meta: `equals_${i}` },
        { paths: ["/" + hash + "/*"], meta: `prefix_${i}` },
        { paths: ["**." + hash], meta: `suffix_${i}` }
    );
}

// Calculate middle value
const middleValue = Math.floor(routeCount / 2).toString();

// Equal match test in combined tree
const equalPath = "/" + md5(middleValue);
const equalReq = { path: equalPath };
benchmark("Equal match in combined tree", routeCount * 3, matchTimes, routes, equalReq);

// Prefix match test in combined tree
const prefixPath = "/" + md5(middleValue) + "/a";
const prefixReq = { path: prefixPath };
benchmark("Prefix match in combined tree", routeCount * 3, matchTimes, routes, prefixReq);

// Suffix match test in combined tree
const suffixPath = "abc." + md5(middleValue);
const suffixReq = { path: suffixPath };
benchmark("Suffix match in combined tree", routeCount * 3, matchTimes, routes, suffixReq);

// Route not found test in combined tree
const notFoundPath = "/" + md5((routeCount + 1).toString()) + "/notfound";
const notFoundReq = { path: notFoundPath };
benchmark("Route not found in combined tree", routeCount * 3, matchTimes, routes, notFoundReq);
