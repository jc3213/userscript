## How to implement
### HTML
```HTML
<script src="https://raw.githubusercontent.com/jc3213/userscript/main/libs/aria2request.js"
        integrity="sha256-wzomqXdCxnFpRTaVKPS+BWGKaScbF+PhAjX+EMxOLBo=" crossorigin="anonymous"/>
```
### TamperMonkey
```javascript
// @require https://raw.githubusercontent.com/jc3213/userscript/main/libs/aria2request.js#sha256-wzomqXdCxnFpRTaVKPS+BWGKaScbF+PhAjX+EMxOLBo=
```
## Syntax
```javascript
const aria2.jsonrpc = 'http://localhost:6800/jsonrpc';
const aria2.secret = 'Your secret token';
const result = aria2.send(method, params);
const arrayResult = aria2.multi([ {method0, params0}, {method1, params1} ]);
```
### `method` `*required`, `params` `Optional`
Read [RPC method calls](https://aria2.github.io/manual/en/html/aria2c.html#methods)
### `result`
Promise object, returns an `object` if fufilled
### `arrayResult`
Promise object, returns an `array` if fufilled\
`[ [result0], [result1], ... ]`
