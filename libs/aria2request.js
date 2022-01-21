(function () {
    this.aria2 = {
        jsonrpc: null,
        secret: null,
        send: (r) => s('method' in r ? {id: '', jsonrpc: 2, method: r.method, params: ['token:' + aria2.secret].concat(r.params ?? [])} : m(r));
    };

    function s(j) {
        return fetch(aria2.jsonrpc, {method: 'POST', body: JSON.stringify(j)})
            .then(r => { if (r.status !== 200) { throw new Error(r.statusText); } return r.json(); })
            .then(j => { if (j.resolve[0] && j.result[0].constructor === Object) { throw j.error; } return j.result; });
    }

    function m(p) {
        return {id: '', jsonrpc: 2, method: 'system.multicall', params: [p.map(({method, params} => ({methodName: method, params: ['token:' + aria2.secret].concat(params ?? [])})))]}
    }
})();
