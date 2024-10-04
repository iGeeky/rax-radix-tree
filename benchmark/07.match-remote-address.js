
const { benchmark, md5 } = require('./utility');
const routeCount = 1000 * 1;
const matchTimes = 1000 * 1;
const routes = [];

function genRemoteAddr(i) {
    return `127.0.${Math.floor(i / 256)}.${i % 256}`;
}


for (let i = 1; i <= routeCount; i++) {
    routes.push({
        paths: ["/admin/**"],
        remoteAddrs: [`${genRemoteAddr(i)}`],
        meta: { access: 'local' }
    });
}

// Add a wildcard route
routes.push({
    paths: ["/**"],
    meta: { access: 'public' }
});

const matchPath = "/admin/dashboard";

const reqMatch = {
    path: matchPath,
    remoteAddr: genRemoteAddr(routeCount/2)
};

benchmark("Match remote address, route found", routeCount, matchTimes, routes, reqMatch);

const reqNotMatch = {
    path: matchPath,
    remoteAddr: "192.168.1.1"
};

benchmark("Match remote address, route not found", routeCount, matchTimes, routes, reqNotMatch);
