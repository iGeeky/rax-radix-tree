
const { HttpRadixTree } = require('../index');
const crypto = require('crypto');
const profiler = require('v8-profiler-node8');

function md5(input) {
    return crypto.createHash('md5').update(input).digest('hex');
}


function benchmark(benchmarkName, routeCount, matchTimes, routes, req, profile=false) {
    const rx = new HttpRadixTree(routes);

    let res;
    if (profile) {
        profiler.startProfiling('findRoute', true);
    }
    const startTime = process.hrtime();
    for (let i = 0; i < matchTimes; i++) {
        res = rx.findRoute(req);
    }
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const duration = seconds * 1000 + nanoseconds / 1e6;
    if (profile) {
        var profileResult = profiler.stopProfiling();
        var fs = require('fs');
        profileResult.export(function(error, result) {
            const currentTime = new Date().toLocaleString('zh-CN', { 
                year: '2-digit', 
                month: '2-digit', 
                day: '2-digit', 
                hour: '2-digit', 
                minute: '2-digit', 
                hour12: false 
            }).replace(/[\/\s:]/g, '-').replace(',', '_');
            const fileName = `profile_result_${benchmarkName.replace(/[\s,]+/g, '_')}_${currentTime}.json`;
            console.log(`Writing profile result to file: ${fileName}`);
            fs.writeFileSync(fileName, result);
            profileResult.delete();
        });
    }

    console.log(`## ${benchmarkName}`);
    console.log("")
    console.log("* Result:            ", res ? res.meta : null);
    console.log("* Number of routes:  ", routeCount);
    console.log("* Number of matches: ", matchTimes);
    console.log("* Execution time:    ", duration.toFixed(0), "ms");
    console.log("* QPS:               ", Math.floor(matchTimes / (duration / 1000)));
    console.log("")
}

module.exports = {
    benchmark,
    md5
};
