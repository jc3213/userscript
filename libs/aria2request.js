(function () {
    this.aria2 = {
        jsonrpc: null,
        secret: null,
        send: (m, p) => s({id: '', jsonrpc: 2, method: m, params: ['token:' + aria2.secret].concat(p ?? [])}),
        multi: (p) => s({id: '', jsonrpc: 2, method: 'system.multicall', params: [p.map(m)]})
    };
    
    function s(j) {
        return fetch(aria2.jsonrpc, {method: 'POST', body: JSON.stringify(j)})
            .then(r => { if (r.ok) { return r.json(); } else { throw new Error(r.statusText); } })
            .then(j => { return 'result' in j ? j.result : j.error; });
    }

    function m({method, params}) {
        return {methodName: method, params: ['token:' + aria2.secret].concat(params ?? [])};
    }
})();
