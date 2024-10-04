
const { benchmark, md5 } = require('./utility');
const routeCount = 1000 * 100;
const matchTimes = 1000 * 1000;
const routes = [];
for (let i = 1; i <= routeCount; i++) {
    routes.push({
        paths: ["/" + md5(i.toString()) + "/*"],
        meta: `prefix_${i}`
    });
}

const middleValue = Math.floor(routeCount / 2).toString();
const path = "/" + md5(middleValue) + "/a";

const req = {
    path: path,
};

benchmark("Match prefix, route found", routeCount, matchTimes, routes, req);

const path2 = "/" + md5((routeCount + 1).toString()) + "/a";

const req2 = {
    path: path2,
};

benchmark("Match prefix, route not found", routeCount, matchTimes, routes, req2);
