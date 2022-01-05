## How to implement
### HTML
```HTML
<script src="https://raw.githubusercontent.com/jc3213/userscript/main/libs/metalink4.js"
        integrity="sha256-D+Tb/9BPMUZ/Bu2RTyHkWFiJkO0U2ihmWbZeBQ7BwTo=" crossorigin="anonymous"></script>
```
### TamperMonkey
```javascript
// @require https://raw.githubusercontent.com/jc3213/userscript/main/libs/metalink4.js#sha256-D+Tb/9BPMUZ/Bu2RTyHkWFiJkO0U2ihmWbZeBQ7BwTo=
```
## Syntax
```javascript
const meta4 = toMetalink4(input);
```
### `input`
An array of object `[ object0, object1, ... ]`
#### `object`
An object contains key `{url, name, size, version, locale, hash, metaurl }`
#### url `*required`
The download address of the file\
Array `[ url0, url1... ]` to generate `<url>https://sam.pl/e.zip</url>` for multiple download addresses\
Array `[ [ locale0, url0 ], [ locale1, url1 ]... ]` to generate `<url location="en">https://sam.pl/e.zip</url>` for multiple download addresses with locales 
#### name `Optional`
The name of the file `<file name="This.File">`
#### size `Optional`
The size of the file `<size>4279183</size>`
#### version `Optional`
The version of the file `<version>1.0.1</version>`
#### locale `Optional`
The language of the file `<laguage>en</language>`
#### hash `Optional`
The hash of the file\
Array `[ [ type0, hash0 ], [ type1, hash1 ]... ]` to generate `<hash type="sha-256">40a51...1e1d7</hash>` for multiple hashes
#### metaurl `Optional`
The metaurl address of the file\
Array `[ [ type0, metaurl0 ], [ type1, metaurl1 ]... ]` to generate `<metaurl type="torrent">https://sam.pl/e.zip.torrent</metaurl>` for multiple metaurl addresses
### `meta4`
An object contains the result `{ binary, blob, text, saveAs }`
#### binary
An `array` of text of the result
#### blob
A `blob` object of the result
#### text
A `string` of the result
#### saveAs(filename) `function`
Save the result into a local file. If **filename** is not defined, default filename is `metalink`
