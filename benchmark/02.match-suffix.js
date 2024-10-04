
const { benchmark, md5 } = require('./utility');
const routeCount = 1000 * 100;
const matchTimes = 1000 * 1000;
const routes = [];
for (let i = 1; i <= routeCount; i++) {
    routes.push({
        paths: ["**." + md5(i.toString())],
        meta: `suffix_${i}`
    });
}

const middleValue = Math.floor(routeCount / 2).toString();
const path = "abc." + md5(middleValue);

const req = {
    path: path,
};

benchmark("Match suffix", routeCount, matchTimes, routes, req);
