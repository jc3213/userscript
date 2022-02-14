class Aria2 {
    constructor(jsonrpc, secret) {
        this.jsonrpc = jsonrpc;
        this.secret = 'token:' + secret;
        this.sender = jsonrpc.startsWith('http') ? this.http : this.socket;
    }
    http (body) {
        return new Promise((resolve, reject) => {
            fetch(this.jsonrpc, {method: 'POST', body})
            .then(response => response.json())
            .then(({result, error}) => result ? resolve(result) : reject())
            .catch(reject);
        });
    }
    socket (message) {
        return new Promise((resolve, reject) => {
            var socket = new WebSocket(this.jsonrpc);
            socket.onopen = event => socket.send(message);
            socket.onclose = reject;
            socket.onmessage = event => {
                var {result, error} = JSON.parse(event.data);
                result ? resolve(result) : reject();
                socket.close();
            };
        });
    }
    message (method, params = []) {
        var message = JSON.stringify({id: '', jsonrpc: 2, method, params: [this.secret, ...params]});
        return this.sender(message);
    }
}
