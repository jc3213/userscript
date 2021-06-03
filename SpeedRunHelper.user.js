// ==UserScript==
// @name         Speedrun.com Helper
// @namespace    https://github.com/jc3213/userscript
// @version      2.5
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
css.innerHTML = '.speedrun-window {position: fixed; z-index: 99999; width: 850px; height: 500px;} \
.speedrun-menu {background-color: #52698A; width: 100%; text-align: right; user-select: none; height: 20px;}\
.speedrun-item {background-color: #fff; cursor: pointer; display: inline-block; height: 20px; width: 20px; font-size: 14px; text-align: center; vertical-align: top;}\
.speedrun-item:hover {filter: opacity(60%);}\
.speedrun-item:active {filter: opacity(30%);}';
document.head.appendChild(css);

document.querySelectorAll('div[data-ad]').forEach(item => item.remove());
document.querySelector('body > main > div > div:nth-child(5)').remove();

document.getElementById('leaderboarddiv').addEventListener('contextmenu', (event) => {
    event.preventDefault();
    document.querySelectorAll('tr[data-target]').forEach(item => {
        if (item.contains(event.target)) {
            var src = item.getAttribute('data-target');
            var id = src.split('/').pop();
            viewSpeedrunRecord(id, src, event.clientY, event.clientX);
        }
    });
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
    if (typeof content === 'string') {
        return open(content, '_blank');
    }

    var container = document.createElement('div');
    container.id = 'speedrun-' + id;
    container.draggable = 'true';
    container.className = 'speedrun-window';
    container.style.cssText = 'top: ' + top / 2 + 'px; left: ' + left / 2 + 'px;';
    container.innerHTML = '<div class="speedrun-menu"><span class="speedrun-item">✖</span></div>';
    container.appendChild(content);
    document.body.appendChild(container);
    container.querySelector('.speedrun-item').addEventListener('click', (event) => container.remove());
}

document.addEventListener('dragstart', (event) => {
    offset.top = event.clientY;
    offset.left = event.clientX
});
document.addEventListener('dragend', (event) => {
    event.target.style.top = event.target.offsetTop + event.clientY - offset.top + 'px';
    event.target.style.left = event.target.offsetLeft + event.clientX - offset.left + 'px';
});
