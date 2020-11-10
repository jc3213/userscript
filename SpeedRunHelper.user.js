// ==UserScript==
// @name         Speedrun.com Helper
// @version      10.0
// @description  Easy way for speedrun.com to open record window
// @author       jc3213
// @match        *://www.speedrun.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_webRequest
// @webRequest   {"selector": "https://www.speedrun.com/assets/js/ads.js", "action": "cancel"}
// @webRequest   {"selector": "*.amazon-adsystem.com/*", "action": "cancel"}
// @webRequest   {"selector": "*.doubleclick.net/*", "action": "cancel"}
// @webRequest   {"selector": "*lngtd.com/*", "action": "cancel"}
// @webRequest   {"selector": "*.hotjar.com/*", "action": "cancel"}
// @webRequest   {"selector": "*.scorecardresearch.com/*", "action": "cancel"}
// @webRequest   {"selector": "*adservice.google.com/*", "action": "cancel"}
// @webRequest   {"selector": "*quantcast.mgr.consensu.org/*", "action": "cancel"}
// ==/UserScript==

'use strict';
var logger = {};
var drag = {};

var css = document.createElement('style');
css.innerHTML = '.speedrun-menu {background-color: #FFF; cursor: pointer; border: 1px outset #F00; padding: 1px; font-size: 12px;}\
.speedrun-menu:hover {filter: contrast(60%)}\
.speedrun-menu:active {border: 2px inset #00F; padding: 0px; filter: contrast(30%)}';
document.head.appendChild(css);

document.querySelectorAll('div[data-ad]').forEach(item => item.remove());

document.getElementById('leaderboarddiv').addEventListener('contextmenu', (event) => {
    event.preventDefault();
    var element;
    document.querySelectorAll('tr[data-target]').forEach(item => { if (item.contains(event.target)) element = item; });
    if (element) {
        var src = element.getAttribute('data-target');
        var id = src.split('/').pop();
        viewSpeedrunRecord(id, src, event.clientY, event.clientX);
    }
});

function viewSpeedrunRecord(id, src, top, left) {
    if (document.getElementById('speedrun-' + id)) {
        document.getElementById('speedrun-' + id).remove();
    }
    if (logger[id]) {
        createRecordWindow(id, logger[id], top, left);
    }
    else {
        GM_xmlhttpRequest({
            url: src,
            method: 'GET',
            onload: (response) => {
                var xml = document.createElement('div');
                xml.innerHTML = response.responseText;
                logger[id] = xml.querySelector('#centerbar').querySelector('iframe');
                createRecordWindow(id, logger[id], top, left);
            }
        });
    }
}

function createRecordWindow(id, content, top, left) {
    var container = document.createElement('div');
    container.id = 'speedrun-' + id;
    container.style.cssText = 'position: fixed; top: ' + top / 2 + 'px; left: ' + left / 2 + 'px; z-index: 3213; width: 850px; height: 500px;';
    document.body.appendChild(container);

    var box = document.createElement('div');
    box.style.cssText = 'background-color: #000; height: 22px; width: 100%; text-align: right; user-select: none;';
    container.appendChild(box);

    var close = document.createElement('span');
    close.className = 'speedrun-menu';
    close.addEventListener('click', (event) => container.remove())
    close.innerHTML = '✖';
    box.appendChild(close);

    container.appendChild(content);
}

document.addEventListener('mousedown', (event) => {
    document.querySelectorAll('div[id^="speedrun-"]').forEach(item => { if (item.contains(event.target)) drag.element = item; });
    if (drag.element) {
        drag.is = true;
        drag.top = event.clientY;
        drag.left = event.clientX;
    }
});
document.addEventListener('mousemove', (event) => {
    if (drag.is) {
        drag.top = drag.element.offsetTop - drag.top + event.clientY;
        drag.left = drag.element.offsetLeft - drag.left + event.clientX;
        drag.element.style.top = drag.top + 'px';
        drag.element.style.left = drag.left + 'px';
    }
})
document.addEventListener('mouseup', (event) => {drag.is = false});
