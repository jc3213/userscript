(function () {
    this.aria2 = {
        jsonrpc: null,
        secret: null,
        send: (r) => s('method' in r ? {id: '', jsonrpc: 2, method: r.method, params: ['token:' + aria2.secret].concat(r.params ?? [])} : {id: '', jsonrpc: 2, method: 'system.multicall', params: [r.map(({method, params = []}) => ({methodName: method, params: ['token:' + aria2.secret, ...params]}))]})
    };

    function s(j) {
        return fetch(aria2.jsonrpc, {method: 'POST', body: JSON.stringify(j)})
            .then(r => { if (r.status !== 200) { throw new Error(r.statusText); } return r.json(); })
            .then(j => { var r = j.result; if (r[0] && r[0].constructor === Object) { throw r[0]; } return r; });
    }
})();
