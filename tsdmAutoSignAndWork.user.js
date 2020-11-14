// ==UserScript==
// @name         天使动漫自动签到打工
// @namespace    https://github.com/jc3213/userscript
// @version      10.0
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
        autoHandler('/plugin.php?id=dsu_paulsign:sign', 'auto-sign', signHandler);
    }
    if (Date.now() > worked) {
        autoHandler('/plugin.php?id=np_cliworkdz:work', 'auto-work', workHandler);
    }
}

var css = document.createElement('style');
css.innerHTML = '.my-button {padding: 5px; border: 1px outset #000; text-align: center; background-color: #FFF; width: 50px;}\
.my-button:hover {filter: opacity(60%);}\
.my-button:active {filter: opacity(30%);}\
.my-checked {padding: 4px; border: 2px inset #00F;}\
.my-dropdown {background-color: #FFF;}'
document.head.appendChild(css);

var container = document.createElement('div');
container.style.cssText = 'position: absolute; top: 3px; left: calc(50% - 50px); font-weight: bold; cursor: pointer;';
document.body.appendChild(container);

var menu = document.createElement('div');
menu.innerHTML = '菜单';
menu.className = 'my-button';
menu.addEventListener('click', (event) => {
    if (menu.classList.contains('my-checked')) {
        box.style.display = 'none';
    }
    else {
        box.style.display = 'block';
    }
    menu.classList.toggle('my-checked');
});
container.appendChild(menu);

var box = document.createElement('div');
box.className = 'my-dropdown';
box.style.cssText = 'display: none;';
container.appendChild(box);

var sign = document.createElement('div');
sign.innerHTML = '签到';
sign.className = 'my-button';
sign.addEventListener('click', (event) => { autoHandler('/plugin.php?id=dsu_paulsign:sign', signHandler); });
box.appendChild(sign);

var work = document.createElement('div');
work.innerHTML = '打工';
work.className = 'my-button';
work.addEventListener('click', (event) => { autoHandler('/plugin.php?id=np_cliworkdz:work', workHandler); });
box.appendChild(work);

var auto = document.createElement('div');
auto.className = 'my-button';
auto.addEventListener('click', (event) => {
    autoed = !autoed;
    autoIcon.innerHTML = autoed ? '✅' : '';
    GM_setValue('autoed', autoed);
});
box.appendChild(auto);
var autoIcon = document.createElement('span');
autoIcon.innerHTML = autoed ? '✅' : '';
var autoText = document.createTextNode('自动');
auto.appendChild(autoIcon);
auto.appendChild(autoText);

function autoHandler(url, load) {
    var id = 'auto-' + url.match(/\w{4}$/)[0];
    if (document.getElementById(id)) {
        return;
    }
    warnHandler(id);
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onload = () => {
        var node = document.createElement('div');
        node.innerHTML = xhr.response;
        load(node, url, id);
    };
    xhr.send()
}

function signHandler(node, url, id) {
    if (node.querySelector('#ct_shell > div:nth-child(1) > h1:nth-child(1)')) {
        GM_setValue('signed', today);
        warnOver(id, node.querySelector('#ct_shell > div:nth-child(1) > h1:nth-child(1)').innerHTML);
    }
    else {
        makeFrame(url, id, autoSign);
    }
}

function workHandler(node, url, id) {
    if (node.querySelector('#messagetext')) {
        var text = node.querySelector('#messagetext > p:nth-child(1)').innerHTML.split(/<br>|<script/)[1];
        var clock = text.match(/\d+/g);
        var next = (clock[0] | 0) * 3600000 + (clock[1] | 0) * 60000 + (clock[2] | 0) * 1000;
        GM_setValue('worked', Date.now() + next);
        warnOver(id, text);
    }
    else {
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

function warnHandler(id) {
    var data = id === 'auto-sign' ? {top: '125px', text: '正在自动签到...'} : {top: '165px', text: '正在自动打工...'};
    var warn = document.createElement('div');
    warn.id = id;
    warn.style.cssText = 'border-radius: 5px; background-color: #FFF; padding: 5px; position: fixed; width: 380px; text-align: center; left: calc((100% - 380px) / 2); font-size: 16px; top: ' + data.top;
    warn.innerHTML = data.text;
    document.body.appendChild(warn);
}

function warnOver(id, text) {
    var warn = document.getElementById(id);
    warn.innerHTML = text;
    setTimeout(() => warn.remove(), 3000);
}

window.addEventListener('message', (event) => setTimeout(() => document.getElementById(event.data).remove(), 3000));
