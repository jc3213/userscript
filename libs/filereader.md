## How to implement
### HTML
```HTML
<script src="https://raw.githubusercontent.com/jc3213/userscript/main/libs/filereader.js"
        integrity="sha256-ra0CJCuvv/O10tgFcdiSFYFQXxEIa+KYMXHx1lsx7VE=" crossorigin="anonymous"></script>
```
### TamperMonkey
```javascript
// @require https://raw.githubusercontent.com/jc3213/userscript/main/libs/filereader.js#sha256-ra0CJCuvv/O10tgFcdiSFYFQXxEIa+KYMXHx1lsx7VE=
```
## Syntax
```javascript
const reader = PromiseFileReader(file);
```
### `file`
A javascript File object
```javascript
const text = reader.text();
```
### `text`
Promise object, returns the contents of the file as a text `string` if fulfilled
```javascript
const data = reader.data();
```
### `data`
Promise object, returns a `data:` URL representing the file's data if fulfilled
```javascript
const buffer = reader.buffer();
```
### `buffer`
Promise object, returns an `ArrayBuffer` representing the file's data if fulfilled
```javascript
const binary = reader.binary();
```
### `binary`
Promise object, returns the raw binary data from the file as a `string` if fulfilled
