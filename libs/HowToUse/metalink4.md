## How to implement
### HTML
```HTML
<script src="https://raw.githubusercontent.com/jc3213/userscript/main/libs/metalink4.js"
        integrity="sha256-QKUXWW5bZZv7sqNDpGB+nhKv6e2IdGELUp99owlh4dc=" crossorigin="anonymous">
</script>
```
### TamperMonkey
```javascript
// @require https://raw.githubusercontent.com/jc3213/userscript/main/libs/metalink4.js#sha256-QKUXWW5bZZv7sqNDpGB+nhKv6e2IdGELUp99owlh4dc=
```
## Syntax
```javascript
const meta4 = toMetalink4(input);
```
### `input`
An object containing information to generate metalink file `{ name, size, version, locale, hash, url, metaurl }`, or\
An array `[ { name, size, version, locale, hash, url, metaurl }, { name, size, version, locale, hash, url, metaurl }... ]`
#### url `*required`
The download address of the file\
String to generate `<url>https://sam.pl/e.zip</url>`\
Array `[ locale, url ]` to generate `<url location="en">https://sam.pl/e.zip</url>`\
Array `[ [ locale, url ], [ locale, url ]... ]` for multiple download addresses
####`name `Optional`
The name of the file `<file name="This.File">`
#### size `Optional`
The size of the file `<size>4279183</size>`
#### version `Optional`
The version of the file `<version>1.0.1</version>`
#### locale `Optional`
The language of the file `<laguage>en</language>`
#### hash `Optional`
The hash of the file\
Array `[ type, hash ]` to generate `<hash type="sha-256">40a51...1e1d7</hash>`\
Array `[ [ type, hash ], [ type, hash ]... ]` for multiple hashes
#### metaurl `Optional`
The metaurl address of the file\
Array `[ type, metaurl ]` to generate `<metaurl type="torrent">https://sam.pl/e.zip.torrent</metaurl>`\
Array `[ [ type, metaurl ], [ type, metaurl ]... ]` for multiple metaurl addresses
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
