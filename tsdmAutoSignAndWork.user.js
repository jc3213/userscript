// ==UserScript==
// @name         天使动漫自动签到打工
// @namespace    https://github.com/jc3213/userscript
// @version      6
// @description  天使动漫全自动打工签到脚本 — 完全自动无需任何操作，只需静待一分钟左右
// @author       jc3213
// @match        *://www.tsdm39.net/*
// @grant        GM_getValue
// @grant        GM_setValue
// @noframes
// ==/UserScript==

'use strict';
var signed = GM_getValue('signed', 0);
var worked = GM_getValue('worked', 0);
var autoed = GM_getValue('autoed', false);
var today = [new Date().getYear(), new Date().getMonth(), new Date().getDate()].join('');

if (autoed) {
    if (today > signed) {
        autoHandler('/plugin.php?id=dsu_paulsign:sign', signHandler);
    }
    if (Date.now() > worked) {
        autoHandler('/plugin.php?id=np_cliworkdz:work', workHandler);
    }
}

var css = document.createElement('style');
css.innerHTML = '.my-button {padding: 5px; border: 1px outset #000; text-align: center; vertical-align: middle; display: inline-block; background-color: #FFF; width: 60px; height: 20px; cursor: pointer; font-weight: bold;}\
.my-button:hover {filter: opacity(60%);}\
.my-button:active {filter: opacity(30%);}\
.my-menu {background-color: #fff; position: absolute; top: 15px; left: 100px; z-index: 99999;}'
document.head.appendChild(css);

var click = [(event) => {
    autoHandler('/plugin.php?id=dsu_paulsign:sign', signHandler);
}, (event) => {
    autoHandler('/plugin.php?id=np_cliworkdz:work', workHandler);
}, (event) => {
    autoed = !autoed;
    menu.querySelector('.my-auto').innerHTML = autoed ? '✅' : '';
    GM_setValue('autoed', autoed);
}];
var menu = document.createElement('div');
menu.innerHTML = '<span class="my-button">签到</span>\
<span class="my-button">打工</span>\
<span class="my-button"><span class="my-auto"></span>自动</span>';
menu.className = 'my-menu';
menu.querySelectorAll('.my-button').forEach((item, index) => item.addEventListener('click', click[index]));
menu.querySelector('.my-auto').innerHTML = autoed ? '✅' : '';
document.body.appendChild(menu);

function autoHandler(url, load) {
    var id = 'auto-' + url.match(/\w{4}$/)[0];
    if (document.getElementById(id)) {
        return;
    }
    var warn = warnStart(id);
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onload = () => {
        var node = document.createElement('div');
        node.innerHTML = xhr.response;
        load(node, url, id, warn);
    };
    xhr.send()
}

function signHandler(node, url, id, warn) {
    if (node.querySelector('#ct_shell > div:nth-child(1) > h1:nth-child(1)')) {
        GM_setValue('signed', today);
        warnOver(id, node.querySelector('#ct_shell > div:nth-child(1) > h1:nth-child(1)').innerHTML);
    }
    else {
        warn.innerHTML = '开始签到...';
        makeFrame(url, id, autoSign);
    }
}

function workHandler(node, url, id, warn) {
    if (node.querySelector('#messagetext')) {
        var text = node.querySelector('#messagetext > p:nth-child(1)').innerHTML.split(/<br>|<script/)[1];
        var clock = text.match(/\d+/g);
        var next = (clock[0] | 0) * 3600000 + (clock[1] | 0) * 60000 + (clock[2] | 0) * 1000;
        if (worked === 0) GM_setValue('worked', Date.now() + next);
        warnOver(id, text);
    }
    else {
        warn.innerHTML = '开始打工...';
        makeFrame(url, id, autoWork);
    }
}

function makeFrame(url, id, load) {
    var iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.id = id + '-frame';
    iframe.style.cssText = 'position: absolute; top: 200px; left: 100px; height: 800px; width: 800px; display: none;';
    iframe.addEventListener('load', (event) => load(iframe.contentWindow, iframe.contentDocument));
    document.body.appendChild(iframe);
}

function autoSign(window, document) {
    window.Icon_selected('kx');
    document.getElementById('todaysay').value = '每日签到';
    setTimeout(() => {
        window.showWindow('qwindow', 'qiandao', 'post', '0');
        GM_setValue('signed', today);
        warnOver('auto-sign', '已完成签到');
        window.parent.window.postMessage('auto-sign-frame');
    }, 3000);
}

function autoWork(window, document) {
    document.querySelectorAll('#advids > div > a').forEach((element, index) => {
        element.removeAttribute('href');
        element.removeAttribute('target');
        setTimeout(() => {
            element.click();
        }, index * 300);
    });
    setTimeout(() => {
        document.querySelector('#stopad > a').click();
        GM_setValue('worked', Date.now() + 21600000);
        warnOver('auto-work', '已完成打工');
        window.parent.window.postMessage('auto-work-frame');
    }, 3000);
}

function warnStart(id) {
    var data = id === 'auto-sign' ? {top: '125px', text: '查询签到状态...'} : {top: '165px', text: '查询打工状态...'};
    var warn = document.createElement('div');
    warn.id = id;
    warn.style.cssText = 'border-radius: 5px; background-color: #FFF; padding: 5px; position: fixed; width: 380px; text-align: center; left: ' + (innerWidth - 380) / 2 + 'px; font-size: 16px; top: ' + data.top;
    warn.innerHTML = data.text;
    document.body.appendChild(warn);
    return warn;
}

function warnOver(id, text) {
    var warn = document.getElementById(id);
    warn.innerHTML = text;
    setTimeout(() => warn.remove(), 3000);
}

window.addEventListener('message', (event) => setTimeout(() => document.getElementById(event.data).remove(), 5000));
