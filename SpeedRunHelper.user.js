// ==UserScript==
// @name         Speedrun.com Helper
// @namespace    https://github.com/jc3213/userscript
// @version      1.4.1
// @description  Easy way for speedrun.com to open record window
// @author       jc3213
// @match        https://www.speedrun.com/*
// @require      https://cdn.jsdelivr.net/gh/jc3213/jslib@6a62f0fd4a32b30ad4e0dcd34a5856048401e638/ui/dragdrop.js#sha256-cC3r27zz33gEpm1Esdzlxiw3pshWSINZbJ6TohfyFpo=
// ==/UserScript==

'use strict';
var speedrun = {};
var opened = 0;
var worker = {};
var style = {};
var {clientWidth, clientHeight} = document.documentElement;
var {pathname} = location;

var css = document.createElement('style');
css.innerHTML = `
#app-main [class$="lg:w-[400px]"] {display: none !important;}
.speedrun-window {position: fixed; width: 1280px; height: 742px; z-index: 999999; display: grid; grid-template-areas: "title menu" "player player"; grid-template-columns: calc(100% - 66px) 66px;}
.speedrun-window iframe {width: 1280px !important; height: 720px !important; grid-area: "player";}
.speedrun-record, .speedrun-menu {background-color: #181B1C; display: flex; height: 22px;}
.speedrun-record > * {flex: 1; margin: auto; padding: 0px 5px 0px 3px;}
.speedrun-record * {display: inline-block !important;}
.speedrun-record img {height: 16px !important; width: 16px !important; position: relative !important; margin-right: 3px;}
.speedrun-menu {margin-left: auto;}
.speedrun-menu > * {background-color: #fff; color: #000; cursor: pointer; height: 20px; width: 20px; font-size: 14px; text-align: center; vertical-align: top; margin-left: 2px;}
.speedrun-menu > :hover {filter: opacity(60%);}
.speedrun-menu > :active {filter: opacity(30%);}
#speedrun-minimum {line-height: 30px;}
.speedrun-minimum {bottom: 0px; left: 0px; width: 30% !important; height: 20px !important; z-index: 99999;}
.speedrun-minimum iframe {display: none !important;}
.speedrun-maximum {top: 0px; left: 0px; width: ${clientWidth}px !important; height: ${clientHeight}px !important; z-index: 999999;}
.speedrun-maximum iframe {width: ${clientWidth}px !important; height: ${clientHeight - 20}px !important;}
#speedrun-restore, .speedrun-minimum #speedrun-minimum, .speedrun-maximum #speedrun-maximum {display: none;}
.speedrun-minimum #speedrun-restore, .speedrun-maximum #speedrun-restore {display: block;}`;
document.body.append(css);

document.querySelector('main').addEventListener('contextmenu', pathname === '/' ? mainboard : pathname.startsWith('/series/') ? seriesboard : pathname.startsWith('/users/') ? userboard : gameboard);

function mainboard(event) {
    speedrunRecord(event, 'div.flex.flex-row.flex-wrap.items-start.justify-start.p-2', (record) => {
        var [rank, time, player] = record.querySelectorAll('a > .truncate, a.x-username-truncate');
        return {url: rank.parentNode.href, rank, player, time};
    });
}

function seriesboard(event) {
    speedrunRecord(event, 'div.cursor-pointer.x-focus-outline-offset.overflow-hidden', (record) => {
        var [rank, time, player] = record.querySelectorAll('a > .truncate, a.x-username-truncate');
        return {url: rank.parentNode.href, rank, player, time};
    });
}

function userboard(event) {
    speedrunRecord(event, 'div.cursor-pointer.x-focus-outline-offset.overflow-hidden', (record) => {
        var player = document.querySelector('.x-username > span');
        var [rank, time] = record.querySelectorAll('a > .truncate');
        return {url: rank.parentNode.href, rank, player, time};
    });
}

function gameboard(event) {
    speedrunRecord(event, 'tr', (record) => {
        var [rank, player, time] = record.querySelectorAll('a');
        return {url: rank.href, rank, player, time};
    });
}

function cssTextGetter(offset) {
    var top = 130 + offset;
    var left = (document.documentElement.clientWidth - 1280) / 2 + offset;
    if (left < 0) {
        left = 0;
    }
    return `top: ${top}px; left: ${left}px;`;
}

async function speedrunRecord(event, selector, callback) {
    var record = event.target.closest(selector);
    if (!record || event.ctrlKey) {
        return;
    }
    event.preventDefault();
    var {url, rank, player, time} = callback(record);
    var id = url.slice(url.lastIndexOf('/') + 1);
    if (worker[id]) {
        return;
    }
    worker[id] = true;
    var title = '<div>Rank: ' + rank.innerHTML + '</div><div>Player: ' + player.innerHTML + '</div><div>Time: ' + time.textContent + '</div>';
    if (speedrun[id]) {
        worker[id] = false;
        speedrun[id].style.cssText = style[id] = cssTextGetter(speedrun[id].offset);
        return document.body.appendChild(speedrun[id]);
    }
    var response = await fetch(url);
    var html = await response.text();
    var xml = document.createElement('div');
    xml.innerHTML = html;
    var iframe = xml.querySelector('iframe[class]');
    createRecordWindow(id, title, top, iframe);
    xml.remove();
}

function createRecordWindow(id, title, top, player) {
    var container = document.createElement('div');
    container.id = 'speedrun-' + id;
    container.offset = opened * 30;
    container.className = 'speedrun-window';
    container.innerHTML = `<div class="speedrun-record">${title}</div>
<div class="speedrun-menu"><div id="speedrun-minimum">➖</div><div id="speedrun-restore">🔳</div><div id="speedrun-maximum">🔲</div><div id="speedrun-remove">❌</div></div>`;
    container.style.cssText = style[id] = cssTextGetter(container.offset);
    container.appendChild(player);
    container.addEventListener('click', (event) => {
        switch (event.target.id) {
            case 'speedrun-minimum':
                container.classList.add('speedrun-minimum');
                container.classList.remove('speedrun-maximum');
                container.style.cssText = '';
                break;
            case 'speedrun-maximum':
                container.classList.add('speedrun-maximum');
                container.classList.remove('speedrun-minimum');
                container.style.cssText = '';
                break;
            case 'speedrun-restore':
                container.classList.remove('speedrun-maximum', 'speedrun-minimum');
                container.style.cssText = style[id];
                break;
            case 'speedrun-remove':
                container.remove();
                break;
        }
    });
    document.body.appendChild(container);
    speedrun[id] = container;
    opened ++;
    var dragdrop = new DragDrop(container);
    dragdrop.ondragend = position => {
        if (container.className === 'speedrun-window') {
            style[id] = container.style.cssText;
            return;
        }
        container.style.cssText = '';
    }
    worker[id] = false;
}
