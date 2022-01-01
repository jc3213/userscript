(function () {
    this.aria2 = {
        jsonrpc: null,
        secret: null,
        request: (m, p = []) => {
            return fetch(aria2.jsonrpc, {method: 'POST', body: JSON.stringify({id: '', jsonrpc: 2, method: m, params: ['token:' + aria2.secret, ...p]})})
                .then(r => { if (r.ok) { return r.json(); } else { throw new Error(r.statusText); } }).then(j => { return 'result' in j ? j.result : j.error; });
        }
    };
})();
