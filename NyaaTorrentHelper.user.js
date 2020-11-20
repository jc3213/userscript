// ==UserScript==
// @name         Nyaa Torrent Helper
// @namespace    https://github.com/jc3213/userscript
// @version      22
// @description  Nyaa Torrent right click to open available open preview in new tab
// @author       jc3213
// @match        *://*.nyaa.si/*
// @exclude      *://*.nyaa.si/view/*
// @grant        GM_xmlhttpRequest
// @connect      *
// ==/UserScript==

'use strict';
// Variables
var filter = false;
var keyword = [];
var queue = [];
var action = {};
var hosts = {
    'hentai-covers.site': '#image-viewer-container > img',
    'e-hentai.org': '#gd1 > div',
    'www.dlsite.com': 'div.slider_body'
}

// Create UI
var css= document.createElement('style');
css.innerHTML = '.filterButton {background-color: #056b00; border: 1px solid black; color: #FFF; padding: 10px; cursor: pointer; user-select: none;}\
.filterButton:active {filter: opacity(30%);}\
.filterItem {position: relative; padding: 3px;}\
.filterItem span {color: #FFF; border: 1px transparent solid; padding: 10px 5px; width: fit-content; border-radius: 3px; position: absolute;}\
.filterItem a {color: #FFF; text-decoration: none;}\
.filterItem span:nth-child(n+2) {margin-left: 5px; user-select: none; cursor: pointer; width: 60px; text-align: center;}\
.filterItem span:nth-child(n+2):hover, filterButton:hover {filter: opacity(60%);}\
.filterItem span:nth-child(1) {background-color: #2bceec; overflow: hidden; z-index: 3213; width: 910px;}\
.filterItem span:nth-child(1):hover {min-width: fit-content;}\
.filterItem span:nth-child(2) {background-color: #ee1c1c; left: 915px;}\
.filterItem span:nth-child(3) {background-color: #0056b0; left: 980px;}\
.filterItem span:nth-child(4) {background-color: #056b00; left: 1045px;}\
.filterItem span:nth-child(5) {background-color: #0005CC; left: 1110px;}\
.previewItem {position: fixed; z-index: 3213;}';
document.head.appendChild(css);

var container = document.createElement('div');
container.style.cssText = 'position:fixed; top: 6px; left: calc(40% - 50px); z-index: 3213; padding: 1px;';
document.body.appendChild(container);

var input = document.createElement('input');
input.style.cssText = 'color: black; border: 1px solid black; padding: 5px; width: 180px; height: 38px;';
input.placeholder = 'Keyword...';
input.addEventListener('keypress', (event) => { if (event.key === 'Enter') {button.click();} });
container.appendChild(input);

var button = document.createElement('span');
button.className = 'filterButton';
button.innerHTML = 'Filter';
button.addEventListener('click', (event) => {
    var keyword = input.value.split(/[\|\/\\\+\,\:\; ]+/);
    if (filter && keyword.join() === keyword.join()) {
        popup.style.display = 'none';
        filter = false;
    }
    else {
        popup.innerHTML = '';
        popup.style.display = 'block';
        queue.forEach(data => {
            if (keyword.filter(key => data.name.includes(key)).length === keyword.length) {
                getFilterResult(data);
            }
        });
        popup.querySelectorAll('div').forEach((element, index) => { element.style.top = index * 40 + 'px'; });
        keyword = keyword;
        filter = true;
    }
});
container.appendChild(button);
// Show filter result
function getFilterResult(data) {
    var box = document.createElement('div');
    box.className = 'filterItem';
    popup.appendChild(box);
    getFilterItem(box, {html: data.name});
    getFilterItem(box, {html: 'Preview', click: (event) => {event.target.style.cssText = 'background-color: #C3C;'; getPreviewHandler(data, {top: event.clientY, left: event.clientX});}});
    getFilterItem(box, {html: '<a href="' + data.torrent + '" target="_blank">Torrent</a>', style: 'display: ' + (data.torrent ? 'block' : 'none')});
    getFilterItem(box, {html: '<a href="' + data.magnet + '">Magnet</a>'});
    getFilterItem(box, {html: 'Copy', click: (event) => navigator.clipboard.writeText(data.name + '\n' + (data.torrent ? data.torrent + '\n' : '') + data.magnet)});
}
function getFilterItem(box, props) {
    var item = document.createElement('span');
    item.innerHTML = props.html;
    if (props.style) {
        item.style.cssText = props.style;
    }
    if (props.click) {
        item.addEventListener('click', props.click);
    }
    box.appendChild(item);
}

var popup = document.createElement('div');
popup.style.cssText = 'position: fixed; left: calc(50% - 600px); background-color: #dff0d8; width: 1200px; height: 560px; white-space: nowrap; overflow-y: scroll; display: none;';
container.appendChild(popup);

// Extract data
document.querySelectorAll('table > tbody > tr').forEach((element) => {
    var data = {};
    var a = element.querySelectorAll('td:nth-child(2) > a');
    a = a.length === 2 ? a[1] : a[0];
    data.id = a.href.split('/').pop();
    data.name = a.innerHTML;
    data.src = a.href;
    var link = element.querySelectorAll('td:nth-child(3) > a');
    if (link.length === 2) {
        data.torrent = link[0].href;
        data.magnet = link[1].href;
    }
    else {
        data.magnet = link[0].href;
    }
    queue.push(data);
    a.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        a.style.cssText = 'color: #C33;';
        getPreviewHandler(data, {top: event.clientY, left: event.clientX});
    });
});

// Preview handler
function getPreviewHandler(data, mouse) {
    if (action[data.id] || document.getElementById('preview-' + data.id)) {
        return;
    }
    action[data.id] = true;
    if (data.image) {
        createPreview(data, mouse);
    }
    else if (data.new) {
        openWebPreview(data);
    }
    else if (data.sel) {
        xmlNodeHandler(data, mouse, getWebPreview);
    }
    else if (data.none) {
        noValidPreview(data);
    }
    else {
        xmlNodeHandler(data, mouse, getPreviewURL);
    }
}
function xmlNodeHandler(data, mouse, handler) {
    GM_xmlhttpRequest({
        method: 'GET',
        url: data.src,
        onload: (details) => {
            var node = document.createElement('div');
            node.innerHTML = details.response;
            handler(node, data, mouse);
        }
    });
}
function getPreviewURL(node, data, mouse) {
    var description = node.querySelector('#torrent-description').innerHTML;
    var url = description.match(/(\*\*)?https?:\/\/[^(\*\*)]+(\*\*)?/g);
    var img = description.match(/\(https?:\/\/[^\)]+\)/g);
    if (img) {
        data.image = document.createElement('img');
        data.image.src = img[0].substring(1, img[0].length - 1);
        createPreview(data, mouse);
    }
    else if (url) {
        var src = url[0].replace(/\*\*/g, '');
        var host = src.split(/[\/:]+/)[1];
        data.src = src;
        if (data.sel = hosts[host]) {
            xmlNodeHandler(data, mouse, getWebPreview);
        }
        else {
            data.new = true;
            openWebPreview(data);
        }
    }
    else {
        data.none = true;
        noValidPreview(data);
    }
}
function getWebPreview(node, data, mouse) {
    data.image = node.querySelector(data.sel);
    if (data.image) {
        createPreview(data, mouse);
    }
    else {
        alert(data.name + '\n' + data.src + '\nFailed Previewing');
        action[data.id] = false;
    }
}
function openWebPreview(data) {
    if (confirm(data.name + '\n' + data.src + '\nNot Supported!\nOpen in New Tab?')) {
        open(data.src, '_blank');
    }
    action[data.id] = false;
}
function noValidPreview(data) {
    alert(data.name + '\nNo Preview!');
    action[data.id] = false;
}

// Create preview
function createPreview(data, mouse) {
    data.image.className = 'previewItem';
    data.image.style.cssText = 'max-height: 800px; top: ' + (mouse.top + 900 > screen.availHeight ? screen.availHeight - 900 : mouse.top) + 'px; left: ' + (mouse.left + 600 > screen.availWidth ? screen.availWidth - 600 : mouse.left) + 'px;';
    data.image.addEventListener('click', (event) => data.image.remove());
    document.body.appendChild(data.image);
    action[data.id] = false;
}
