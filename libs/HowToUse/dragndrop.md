## How to implement
### HTML
```HTML
<script src="https://raw.githubusercontent.com/jc3213/userscript/main/libs/dragndrop.js"
        integrity="sha256-NkLbP8qGlQ6SEBaf0HeiUVT+5/kXjyJYaSwd28Dj9zA=" crossorigin="anonymous"></script>
```
### TamperMonkey
```javascript
// @require https://raw.githubusercontent.com/jc3213/userscript/main/libs/dragndrop.js#sha256-NkLbP8qGlQ6SEBaf0HeiUVT+5/kXjyJYaSwd28Dj9zA=
```
## Syntax
```javascript
dragndrop(object, callback);
```
### `object`
An object containing information to append drag'n'drop event for an element `{ node, top, right, bottom, left }`
#### node `*required`
The target DOM node
#### top `Optional`
The offset of top `integer`, `default: 0`
#### right `Optional`
The offset of right `integer`, `default: 0`
#### bottom `Optional`
The offset of bottom `integer`, `default: 0`
#### left `Optional`
The offset of left `integer`, `default: 0`
### `callback` `function` `Optional`
A callback function with new position
```javascript
function (top, left) {
    // Your code here
}
```
