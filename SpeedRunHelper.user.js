// ==UserScript==
// @name         Speedrun.com Helper
// @namespace    https://github.com/jc3213/userscript
// @version      1.5.0
// @description  Easy way for speedrun.com to open record window
// @author       jc3213
// @match        https://www.speedrun.com/*
// ==/UserScript==

'use strict';
let speedrun = {};
let worker = {};
let style = {};
let srFixed = fixedPanePlayer();
let srDrag;
let srY;
let srX;
let srPane = 0;
let srWatch = location.pathname.split('/')?.[1];
var {clientWidth, clientHeight} = document.documentElement;

let css = document.createElement('style');
css.innerHTML = `
#app-main [class$="lg:w-[400px]"] {display: none !important;}
.speedrun-window {position: absolute; z-index: 999999; display: grid; grid-template-columns: calc(100% - 66px) 66px;}
.speedrun-window iframe {width: ${srFixed.x}px; height: ${srFixed.y}px; grid-column: span 2;}
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

const videoHandlers = {
    '': mainboard,
    'series': seriesboard,
    'users': usersboard,
    game: gameboard
};

document.querySelector('main').addEventListener('contextmenu', (event) => {
    let handler = videoHandlers[srWatch] ?? videoHandlers.game;
    handler(event);
});

function mainboard(event) {
    speedrunRecord(event, 'div.flex.flex-row.flex-wrap.items-start.justify-start.p-2', (record) => {
        let [rank, time, player] = record.querySelectorAll('a > .truncate, a.x-username-truncate');
        return {url: rank.parentNode.href, rank, player, time};
    });
}

function seriesboard(event) {
    speedrunRecord(event, 'div.cursor-pointer.x-focus-outline-offset.overflow-hidden', (record) => {
        let [rank, time, player] = record.querySelectorAll('a > .truncate, a.x-username-truncate');
        return {url: rank.parentNode.href, rank, player, time};
    });
}

function usersboard(event) {
    speedrunRecord(event, 'div.cursor-pointer.x-focus-outline-offset.overflow-hidden', (record) => {
        let player = document.querySelector('.x-username > span');
        let [rank, time] = record.querySelectorAll('a > .truncate');
        return {url: rank.parentNode.href, rank, player, time};
    });
}

function gameboard(event) {
    speedrunRecord(event, 'tr', (record) => {
        let [rank, player, time] = record.querySelectorAll('a');
        return {url: rank.href, rank, player, time};
    });
}

async function speedrunRecord(event, selector, callback) {
    let record = event.target.closest(selector);
    if (!record || event.ctrlKey) {
        return;
    }
    event.preventDefault();
    let {url, rank, player, time} = callback(record);
    let id = url.slice(url.lastIndexOf('/') + 1);
    if (worker[id]) {
        return;
    }
    worker[id] = true;
    let title = '<div>Rank: ' + rank.innerHTML + '</div><div>Player: ' + player.innerHTML + '</div><div>Time: ' + time.textContent + '</div>';
    if (speedrun[id]) {
        worker[id] = false;
        speedrun[id].style.cssText = style[id] = fixedPanePosition(speedrun[id].offset);
        return document.body.appendChild(speedrun[id]);
    }
    let response = await fetch(url);
    let html = await response.text();
    let xml = document.createElement('div');
    xml.innerHTML = html;
    let iframe = xml.querySelector('iframe[class]');
    createRecordWindow(id, title, top, iframe);
    xml.remove();
}

const recordHandlers = {
    'speedrun-minimum': (pane) => {
        pane.classList.add('speedrun-minimum');
        pane.classList.remove('speedrun-maximum');
        pane.style.cssText = '';
    },
    'speedrun-maximum': (pane) => {
        pane.classList.add('speedrun-maximum');
        pane.classList.remove('speedrun-minimum');
        pane.style.cssText = '';
    },
    'speedrun-restore': (pane, id) => {
        pane.classList.remove('speedrun-maximum', 'speedrun-minimum');
        pane.style.cssText = style[id];
    },
    'speedrun-remove': (pane) => {
        pane.remove();
        -- srPane;
    }
}

document.addEventListener('dragstart', (event) => {
    let pane = event.target.closest('div[id^=speedrun-');
    if (pane.draggable) {
        srDrag = pane;
        srX = event.clientX - srDrag.offsetLeft;
        srY = event.clientY - srDrag.offsetTop;
    }
});

document.addEventListener('dragover', (event) => {
    event.preventDefault();
});

document.addEventListener('drop', (event) => {
    event.preventDefault();
    srDrag.style.left = event.clientX - srX + 'px';
    srDrag.style.top = event.clientY - srY + 'px';
    srDrag = null;
});

function createRecordWindow(id, title, top, player) {
    let pane = document.createElement('div');
    pane.id = 'speedrun-' + id;
    pane.offset = srPane * 30;
    pane.className = 'speedrun-window';
    pane.draggable = true;
    pane.innerHTML = `<div class="speedrun-record">${title}</div>
<div class="speedrun-menu"><div id="speedrun-minimum">➖</div><div id="speedrun-restore">🔳</div><div id="speedrun-maximum">🔲</div><div id="speedrun-remove">❌</div></div>`;
    pane.style.cssText = style[id] = fixedPanePosition(pane.offset);
    pane.appendChild(player);
    pane.addEventListener('click', (event) => {
        let handler = recordHandlers[event.target.id];
        if (handler) {
            handler(pane, id);
        }
    });
    document.body.appendChild(pane);
    speedrun[id] = pane;
    ++ srPane;
    worker[id] = false;
}

function fixedPanePosition(offset) {
    let top = 130 + offset;
    let left = (document.documentElement.clientWidth - srFixed.x) / 2 + offset;
    if (left < 0) {
        left = 0;
    }
    return `top: ${top}px; left: ${left}px;`;
}

function fixedPanePlayer() {
    let {innerHeight} = window;
    if (innerHeight < 720) {
        return {x: 854, y: 480};
    }
    if (innerHeight < 1080) {
        return {x: 1280, y: 720};
    }
    if (innerHeight < 1440) {
        return {x: 1920, y: 1080};
    }
    if (innerHeight < 2160) {
        return {x: 2560, y: 1440};
    }
    return {x: 3840, y: 2160};
}
