const { benchmark, md5 } = require('./utility');

const routeCount = 1000 * 1;
const matchTimes = 1000 * 100;

const path = "/12345";
const routes = [];
for (let i = 1; i <= routeCount; i++) {
    routes.push({
        paths: [path],
        priority: i,
        hosts: [`*.${md5(i.toString())}`],
        meta: `wildcard_hosts_${i}`
    });
}

const middleValue = Math.floor(routeCount / 2).toString();
const req = {
    path: path,
    headers: {
        host: `1.${md5(middleValue)}`
    }
};

benchmark("Match wildcard hosts", routeCount, matchTimes, routes, req);