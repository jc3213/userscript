## How to implement
### HTML
```HTML
<script src="https://raw.githubusercontent.com/jc3213/userscript/main/libs/aria2.js"
        integrity="sha256-x9Xlp9IO/8Qu6vkkaE5DZXUZK/Mz4RD2yAGiVRtYqQQ=" crossorigin="anonymous"></script>
```
### TamperMonkey
```javascript
// @require https://raw.githubusercontent.com/jc3213/userscript/main/libs/aria2.js#sha256-x9Xlp9IO/8Qu6vkkaE5DZXUZK/Mz4RD2yAGiVRtYqQQ=
```
## Syntax
```javascript
const aria2 = new Aria2(jsonrpc, secret);;
const result = aria2.message(method, params);
```
### `method` `*required`, `params` `Optional`
Read [RPC method calls](https://aria2.github.io/manual/en/html/aria2c.html#methods)
### `result`
Promise object, returns an `object` if fulfilled
