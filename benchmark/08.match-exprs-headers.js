const { benchmark, md5 } = require('./utility');
const routeCount = 1000 * 1;
const matchTimes = 1000 * 1;
const routes = [];

function genUserAgent(i) {
    return md5(`useragent${i}`);
}

function genLanguage(i) {
    return md5(`language${i}`);
}

for (let i = 1; i <= routeCount; i++) {
    const userAgent = genUserAgent(i);
    const language = genLanguage(i);
    routes.push({
        paths: ['/**'],
        exprs: [`contains(user_agent, "${userAgent}") and accept_language == "${language}"`],
        meta: { version: `v${i}` }
    });
}

routes.push({
    paths: ['/**'],
    meta: { version: 'default' }
});

const matchPath = '/';

const middleRoute = routes[Math.floor(routeCount / 2)];
const reqMatch = {
    path: matchPath,
    headers: {
        'user-agent': middleRoute.exprs[0].split('"')[1] + '/91.0.4472.124 Safari/537.36',
        'accept-language': middleRoute.exprs[0].split('"')[3]
    }
};

benchmark("Match expressions and headers, route found", routeCount, matchTimes, routes, reqMatch);

const reqNotMatch = {
    path: matchPath,
    headers: {
        'user-agent': 'curl/7.64.1',
        'accept-language': 'fr-FR'
    }
};

benchmark("Match expressions and headers, route not found", routeCount, matchTimes, routes, reqNotMatch);
