// ==UserScript==
// @name         天使动漫自动签到打工
// @namespace    https://github.com/jc3213/userscript
// @version      3.2
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
var today = new Date().getFullYear() + new Date().getMonth() + new Date().getDate();
var now = Date.now();

var css = document.createElement('style');
css.innerHTML = '.my-menu {background-color: #fff; position: fixed; top: 40px; right: 100px; width: 100px; z-index: 99999;}\
.my-menu button {width: 100px; padding: 5px;}\
iframe {position: absolute; top: 200px; left: 100px; height: 800px; width: 800px; display: none;}';

var menu = document.createElement('div');
menu.innerHTML = '<button class="my-button">签到</button>\
<button class="my-button">打工</button>\
<button class="my-button"><span class="my-auto"></span>自动</button>';
menu.className = 'my-menu';
menu.querySelector('.my-auto').innerHTML = autoed ? '✅' : '';

document.body.append(menu, css);

if (autoed) {
    today > signed && autoSign();
    now > worked ? autoWork() : setTimeout(autoWork, worked - now);
}

menu.querySelector('.my-button:nth-child(1)').addEventListener('click', autoSign);
menu.querySelector('.my-button:nth-child(2)').addEventListener('click', autoWork);
menu.querySelector('.my-button:nth-child(3)').addEventListener('click', event => {
    autoed = !autoed;
    menu.querySelector('.my-auto').innerHTML = autoed ? '✅' : '';
    GM_setValue('autoed', autoed);
});

async function autoSign() {
    var {warn, window, document} = await startWork('/plugin.php?id=dsu_paulsign:sign');
    if (document.querySelector('#ct_shell > div:nth-child(1) > h1:nth-child(1)')) {
        GM_setValue('signed', today);
        warn.innerText = document.querySelector('#ct_shell > div:nth-child(1) > h1:nth-child(1)').innerText;
        endWork(window, warn);
    }
    else {
        warn.innerText = '开始签到...';
        window.Icon_selected('kx');
        document.getElementById('todaysay').value = '每日签到';
        setTimeout(() => {
            window.showWindow('qwindow', 'qiandao', 'post', '0');
            GM_setValue('signed', today);
            warn.innerText = '已完成签到';
            endWork(window, warn);
        }, 3000);
    }
}

async function autoWork() {
    var {warn, window, document} = await startWork('/plugin.php?id=np_cliworkdz:work');
    if (document.querySelector('#messagetext')) {
        var text = document.querySelector('#messagetext > p:nth-child(1)').innerHTML.split(/<br>|<script/)[1];
        var clock = text.match(/\d+/g);
        var next = (clock[0] | 0) * 3600000 + (clock[1] | 0) * 60000 + (clock[2] | 0) * 1000;
        warn.innerText = text;
        endWork(window, warn);
        worked === 0 && GM_setValue('worked', Date.now() + next);
    }
    else {
        warn.innerText = '开始打工...';
        document.querySelectorAll('#advids > div > a').forEach((element, index) => {
            element.removeAttribute('href');
            element.removeAttribute('target');
            setTimeout(() => element.click(), index * 300);
        });
        setTimeout(() => {
            document.querySelector('#stopad > a').click();
            GM_setValue('worked', Date.now() + 21600000);
            setTimeout(autoWork, next ?? 21600000);
            warn.innerText = '已完成打工';
            endWork(window, warn);
        }, 3000);
    }
}

function startWork(url) {
    return new Promise(resolve => {
        var type = url.slice(url.lastIndexOf(':') + 1);
        var iframe = document.createElement('iframe');
        var warn = document.createElement('div');
        iframe.src = url;
        iframe.addEventListener('load', event => resolve({warn, window: iframe.contentWindow, document: iframe.contentDocument}));
        var {top, text} = type === 'sign' ? {top: '125px', text: '查询签到状态...'} : {top: '165px', text: '查询打工状态...'};
        warn.style.cssText = 'border-radius: 5px; background-color: #FFF; padding: 5px; position: fixed; width: 380px; text-align: center; left: ' + (innerWidth - 380) / 2 + 'px; font-size: 16px; top: ' + top;
        warn.innerHTML = text;
        document.body.append(iframe, warn);
    });
}

function endWork(window, warn) {
    setTimeout(() => {
        window.frameElement.remove();
        warn.remove();
    }, 5000);
}
