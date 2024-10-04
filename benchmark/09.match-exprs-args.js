const { benchmark, md5 } = require('./utility');
const routeCount = 1000 * 1;
const matchTimes = 1000 * 1;
const routes = [];

function genRandomCategory(i) {
    return md5(i.toString());
}

function genRandomPrice() {
    return Math.floor(Math.random() * 1000) + 1;
}

for (let i = 1; i <= routeCount; i++) {
    const category = genRandomCategory(i);
    const price = genRandomPrice();
    routes.push({
        paths: ["/products/**"],
        exprs: [`category == "${category}" and price == ${price}`],
        meta: { discount: '10%' }
    });
}

routes.push({
    paths: ["/products/**"],
    meta: { discount: '0%' }
});

const matchPath = "/products/item";

const middleRoute = routes[Math.floor(routeCount / 2)];
const reqMatch = {
    path: matchPath,
    args: {
        category: middleRoute.exprs[0].split('"')[1],
        price: middleRoute.exprs[0].split('==')[2].trim()
    }
};

benchmark("Match expressions and parameters, route found", routeCount, matchTimes, routes, reqMatch);

const reqNotMatch = {
    path: matchPath,
    args: {
        category: md5('nonexistent'),
        price: '0'
    }
};

benchmark("Match expressions and parameters, route not found", routeCount, matchTimes, routes, reqNotMatch);
