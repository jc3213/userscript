// ==UserScript==
// @name         Speedrun.com Helper
// @namespace    https://github.com/jc3213/userscript
// @version      4
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
var offset = {};

var css = document.createElement('style');
css.innerHTML = '.speedrun-menu {background-color: #FFF; cursor: pointer; border: 1px outset #F00; padding: 1px; font-size: 14px;}\
.speedrun-menu:hover {filter: opacity(60%);}\
.speedrun-menu:active {border: 2px inset #00F; padding: 0px; filter: opacity(30%);}';
document.head.appendChild(css);

document.querySelectorAll('div[data-ad]').forEach(item => item.remove());
document.querySelector('body > main > div > div:nth-child(5)').remove();

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
                if (!logger[id]) {
                    logger[id] = xml.querySelector('#centerbar > div > div > center > a').href;
                }
                createRecordWindow(id, logger[id], top, left);
            }
        });
    }
}

function createRecordWindow(id, content, top, left) {
    if (typeof content === 'string') {
        return open(content, '_blank');
    }

    var container = document.createElement('div');
    container.id = 'speedrun-' + id;
    container.draggable = 'true';
    container.style.cssText = 'position: fixed; top: ' + top / 2 + 'px; left: ' + left / 2 + 'px; z-index: 3213; width: 850px; height: 500px;';
    document.body.appendChild(container);

    var menu = document.createElement('div');
    menu.style.cssText = 'background-color: #000; height: 25px; width: 100%; text-align: right; user-select: none;';
    container.appendChild(menu);

    var close = document.createElement('span');
    close.className = 'speedrun-menu';
    close.addEventListener('click', (event) => container.remove())
    close.innerHTML = '✖';
    menu.appendChild(close);

    container.appendChild(content);
}

document.addEventListener('dragstart', (event) => {
    offset.top = event.clientY;
    offset.left = event.clientX
});
document.addEventListener('dragend', (event) => {
    event.target.style.top = event.target.offsetTop + event.clientY - offset.top + 'px';
    event.target.style.left = event.target.offsetLeft + event.clientX - offset.left + 'px';
});
