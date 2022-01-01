(function () {
    this.aria2 = {
        jsonrpc: null,
        secret: null,
        request: (m, p) => {
            fetch(aria2.jsonrpc, {method: 'POST', body: JSON.stringify({id: '', jsonrpc: 2, method: m, params: ['token:' + aria2.secret, ...p]})}).then(r => {
                if (r.ok) { return r.json(); } else { throw new Error(r.statusText); }
            });
        }
    };
})();
