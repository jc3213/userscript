// ==UserScript==
// @name            Raw Manga Assistant
// @name:zh         漫画生肉网站助手
// @namespace       https://github.com/jc3213/userscript
// @version         1.8.4
// @description     Assistant for raw manga online website
// @description:zh  漫画生肉网站助手脚本
// @author          jc3213
// @match           *://mangaraw.ru/*
// @match           *://klmanga.net/*
// @match           *://rawdevart.com/*
// @match           *://weloma.art/*
// @match           *://mangahatachi.com/*
// @connect         *
// @require         https://raw.githubusercontent.com/jc3213/jslib/7d4380aa6dfc2fcc830791497fb3dc959cf3e49d/ui/menu.js#sha256-/1vgY/GegKrXhrdVf0ttWNavDrD5WyqgbAMMt7MK4SM=
// @require         https://raw.githubusercontent.com/jc3213/jslib/main/ui/dragdrop.js#sha256-cC3r27zz33gEpm1Esdzlxiw3pshWSINZbJ6TohfyFpo=
// @require         https://raw.githubusercontent.com/jc3213/jslib/26bdf18ec342013e1bdb27c20bd7633859d9cc72/ui/notify.js#sha256-7be5JjqTLPgG4In14VPg/1ZRxaAMg8uADYBd3mtSmsY=
// @require         https://raw.githubusercontent.com/jc3213/jslib/4221499b1b97992c9bce74122a4fe54435dbab59/js/aria2.js#sha256-ec7cbh5Q0xlLUETJEtPJCV2PvqFATCREK5/mtPFOA4Q=
// @grant           GM_setValue
// @grant           GM_getValue
// @grant           GM_xmlhttpRequest
// @grant           GM_webRequest
// @webRequest      {"selector": "*.googlesyndication.com/*", "action": "cancel"}
// @webRequest      {"selector": "*.googletagservices.com/*", "action": "cancel"}
// @webRequest      {"selector": "*.googletagmanager.com/*", "action": "cancel"}
// @webRequest      {"selector": "*.amazon-adsystem.com/*", "action": "cancel"}
// @webRequest      {"selector": "*.doubleclick.net/*", "action": "cancel"}
// @webRequest      {"selector": "*.cloudfront.net/*", "action": "cancel"}
// @webRequest      {"selector": "*.disqus.com/*", "action": "cancel"}
// @webRequest      {"selector": "*.facebook.net/*", "action": "cancel"}
// @webRequest      {"selector": "*.sharethis.com/*", "action": "cancel"}
// @                klmanga.net
// @webRequest      {"selector": "*.wpadmngr.com/*", "action": "cancel"}
// @webRequest      {"selector": "*anciengoddize.com/*", "action": "cancel"}
// @webRequest      {"selector": "*gheraosonger.com/*", "action": "cancel"}
// @webRequest      {"selector": {"include":"*://*.*.com/*.js", "exclude": null}, "action": "cancel"}
// @                rawdevart.com
// @webRequest      {"selector": "*.vdo.ai/*", "action": "cancel"}
// @webRequest      {"selector": "*.exdynsrv.com/*", "action": "cancel"}
// @                weloma.art
// @webRequest      {"selector": "*.com/*52076", "action": "cancel"}
// @                mangaraw.ru
// @webRequest      {"selector": "*saimifoa.net/*", "action": "cancel"}
// @                mangahatachi.com
// @webRequest      {"selector": "*sinmgaepu3or9a61w.com/*", "action": "cancel"}
// ==/UserScript==

'use strict';
// Initial variables
var urls = [];
var fail = [];
var observer;
var images;
var watching;
var options = GM_getValue('options', {});
var {jsonrpc = 'http://localhost:6800/jsonrpc', secret = '', iconTop = 350, iconLeft = 200, ctxMenu = 1} = options;
var aria2 = new Aria2(jsonrpc, secret);
var folder;
var warning;
var headers = {'cookie': document.cookie, 'referer': location.href, 'user-agent': navigator.userAgent};
var jsMenu = new FlexMenu();
var jsNotify = new SimpleNotify();

// i18n strings and labels
var message = {
    'en-US': {
        save: {
            label: 'Download',
            done: 'All %n% images have been successfully downloaded',
            error: 'Some image can\'t be downloaded'
        },
        copy: {
            label: 'Copy Urls',
            done: 'All %n% urls have been copied to clipboard'
        },
        aria2: {
            label: 'Send to Aria2',
            done: 'All %n% image urls have been sent to Aria2 JSON-RPC',
            error: 'JSONRPC: Failed to send request'
        },
        gotop: {
            label: 'Scroll to Top',
        },
        menu: {
            on: 'Float Button',
            off: 'Context Menu'
        },
        extract: {
            start: 'Extracting manga source',
            done: 'A total of %n% image urls have been extracted',
            fail: 'Download function not available due to extraction failure',
            error: 'Can\'t be extracted image extension'
        }
    },
    'zh-CN': {
        save: {
            label: '下载图像',
            done: '已成功下载全部 %n% 图像',
            error: '无法下载部分图像',
        },
        copy: {
            label: '复制链接',
            done: '%n% 图像链接已复制到剪切板'
        },
        aria2: {
            label: '发送至 Aria2',
            done: '全部 %n% 图像链接已发送至Aria2 JSON-RPC',
            error: 'JSONRPC: 请求错误'
        },
        gotop: {
            label: '回到顶部',
        },
        float: {
            label: '悬浮菜单'
        },
        menu: {
            label: '右键菜单',
        },
        extract: {
            start: '正在解析图像来源',
            done: '已成功解析全部 %n% 图像来源',
            fail: '无法解析图像来源，下载功能无法使用',
            error: '无法解析图像后缀'
        }
    }
};
var i18n = message[navigator.language] ?? message['en-US'];

// Supported sites
var manga = {
    'klmanga.net': {
        image: 'img.chapter-img',
        lazyload: 'data-aload',
        title: {reg: /^(.+)\sChapter\s([^\s]+)/, sel: 'li.current > a', attr: 'title', tl: 1, ch: 2},
        shortcut: ['a.btn.btn-info.prev', 'a.btn.btn-info.next'],
        ads: ['center > a > img'],
        logo: [-1]
    },
    'rawdevart.com': {
        image: '#img-container > div > img',
        lazyload: 'data-src',
        title: {reg: /^Chapter\s([^\s]+)\s\|\s(.+)\sPage/, sel: '#img-container > div > img', attr: 'alt', tl: 2, ch: 1}
    },
    'weloma.art': {
        image: 'img.chapter-img',
        lazyload: 'data-srcset',
        title: {reg: /^(.+)(!?\s-\sRAW)?\sChapter\s([^\s]+)/, sel: 'img.chapter-img', attr: 'alt', tl: 1, ch: 3},
        shortcut: ['a.btn.btn-info.prev', 'a.btn.btn-info.next']
    },
    'mangaraw.ru': {
        image: 'div.card-wrap > img',
        lazyload: 'data-src',
        title: {reg: /^(.+)\s\u2013\s\u3010\u7b2c(.+)\u8a71\u3011/, sel: 'img[data-ll-status]', attr: 'alt', tl: 1, ch: 2},
        shortcut: 'div.chapter-select > div > a'
    },
    'mangahatachi.com': {
        image: 'div.page-break > img',
    }
};
watching = manga[location.host];

function longDecimalNumber(input, length = 3) {
    var number = isNaN(input) ? input : input.toString();
    var float = number.indexOf('.');
    return (10 ** length + number).slice(0 - length - (float === -1 ? 0 : number.length - float));
}

function extractMangaTitle(title = '') {
    try {
        var symbol = navigator.platform === 'Win32' ? '\\' : '/';
        if (Array.isArray(watching.title)) {
            watching.title.forEach(item => { title += symbol + watching.title[0].reg.exec(document.querySelector(watching.title[0].sel).getAttribute(watching.title[0].attr))[watching.title[0].nl]; });
        }
        else {
            var text = document.querySelector(watching.title.sel).getAttribute(watching.title.attr);
            var temp = watching.title.reg.exec(text);
            title += symbol + temp[watching.title.tl] + symbol + temp[watching.title.ch];
        }
        return title.replace(/[:\?\"\']/g, '_');
    }
    catch (error) {
        return;
    }
}

// Create UI
var css = document.createElement('style');
css.type = 'text/css';
css.innerText = '.jsui-menu-item {height: 36px; line-height: 26px; background-color: #fff; color: #000 !important;}\
.jsui-manager {top: ' + (iconTop) + 'px; left: ' + (iconLeft + 38) + 'px; display: none;}\
.jsui-manager {background-color: #fff; z-index: 999999999; position: fixed;}\
.jsui-drop-menu {border: 1px inset darkviolet; width: 120px;}\
.jsui-notify-popup {color: #000;}';

var float = jsMenu.item({
    text: '🖱️',
    onclick: event => {
        container.style.display = 'block';
    }
});
float.style.cssText = 'position: fixed; top: ' + iconTop + 'px; left: ' + iconLeft + 'px; width: 38px; height: 38px; z-index: 999999999; border: 1px inset darkviolet;';
document.addEventListener('click', event => {
    container.style.display = float.contains(event.target) ? 'block' : 'none';
});

var container = document.createElement('div');
container.className = 'jsui-manager';
document.body.append(float, container, css);

// Draggable button and menu
var dragdrop = new DragDrop(float);
dragdrop.ondragend = ({top, left}) => {
    container.style.top = top + 1 + 'px';
    container.style.left = left + 39 + 'px';
    iconTop = top;
    iconLeft = left;
    options = {...options, iconTop, iconLeft}
    GM_setValue('options', options);
};

var downMenu = jsMenu.menu({
    items: [
        {text: i18n.save.label, onclick: downloadAllUrls},
        {text: i18n.copy.label, onclick: copyAllUrls},
        {text: i18n.aria2.label, onclick: sendUrlsToAria2}
    ], dropdown: true
});
downMenu.style.display = 'none';
function downloadAllUrls() {
    urls.forEach((url, index) => {
        GM_xmlhttpRequest({
            url, headers, method: 'GET', responseType: 'blob',
            onload: (details) => {
                var blob = details.response;
                var a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = longDecimalNumber(index) + '.' + blob.type.slice(blob.type.indexOf('/') + 1);
                a.click();
                if (index === images.length - 1) {
                    notification('save', 'done');
                }
            }
        });
    });
}
function copyAllUrls() {
    navigator.clipboard.writeText(urls.join('\n'));
    notification('copy', 'done');
}
// Aria2 Menuitems
async function sendUrlsToAria2() {
    folder = folder ?? await aria2.message('aria2.getGlobalOption').then(({dir}) => dir + extractMangaTitle()).catch(error => {
        alert(i18n.aria2.error);
        jsonrpc = prompt('Aria2 JSONRPC URI', jsonrpc) ?? jsonrpc;
        secret = prompt('Aria2 Secret Token', secret ) ?? secret;
        aria2 = new Aria2(jsonrpc, secret);
        options = {...options, jsonrpc, secret};
        GM_setValue('options', options);
    });
    if (folder) {
        urls.forEach(async(url, index) => aria2.message('aria2.addUri', [[url], {out: longDecimalNumber(index) + '.' + url.match(/(png|jpg|jpeg|webp)/)[0], dir: folder, ...headers}]));
        notification('aria2', 'done');
    }
}

var modeMenu = jsMenu.menu({
    items: [
        {text: i18n.gotop.label, onclick: scrollToTop},
        {text: i18n.menu.on, onclick: contextMenuMode}
    ], dropdown: true
});
function scrollToTop() {
    document.documentElement.scrollTop = 0;
}
function contextMenuMode() {
    ctxMenu = ctxMenu === 0 ? 1 : 0;
    switchMenuMode();
    options = {...options, ctxMenu};
    GM_setValue('options', options);
}
function switchMenuMode() {
    if (ctxMenu === 1) {
        float.style.display = 'none';
        modeMenu.childNodes[1].innerText = i18n.menu.on;
        document.addEventListener('contextmenu', contextMenuHandler);
    }
    else {
        float.style.display = 'block';
        modeMenu.childNodes[1].innerText = i18n.menu.off;
        document.removeEventListener('contextmenu', contextMenuHandler);
        container.style.top = float.offsetTop + 'px';
        container.style.left = float.offsetLeft + float.offsetWidth + 'px';
    }
}
function contextMenuHandler(event) {
    if (event.shiftKey) {
        return;
    }
    event.preventDefault();
    container.style.top = event.clientY + 'px';
    container.style.left = event.clientX + 'px';
    container.style.display = 'block';
}
switchMenuMode();

container.append(downMenu, modeMenu);

// Extract images data
if (watching) {
    if (watching.ads) {
        removeAdsElement();
    }
    images = [...document.querySelectorAll(watching.image)];
    if (images.length > 0) {
        extractImage();
    }
    if (watching.shortcut) {
        appendShortcuts();
    }
}

function removeAdsElement() {
    Array.isArray(watching.ads) ? watching.ads.forEach(item => removeElement(item)) : removeElement(watching.ads);

    function removeElement(selector) {
        document.querySelectorAll(selector).forEach(item => item.remove());
    }
}

function extractImage() {
    warning = notification('extract', 'start');
    downMenu.style.display = 'block';
    observer = setInterval(() => {
        if (images.length === urls.length + fail.length) {
            warning.remove();
            clearInterval(observer);
            if (fail.length === 0) {
                notification('extract', 'done');
            }
            else {
                notification('extract', 'fail', '\n' + fail.map(item => { return 'page ' + (item + 1); } ));
            }
        }
    }, 250);
    if (watching.logo) {
        watching.logo.forEach(el => {
            var pos = el >= 0 ? el: images.length + el;
            images[pos].remove();
            images.splice(pos, 1);
        });
    }
    images.forEach((element, index) => {
        var src = element.getAttribute(watching.lazyload) ?? element.getAttribute('src');
        var url = src.trim().replace(/^\/\//, 'http://');
        if (watching.fallback && watching.fallback.includes(url)) {
            new MutationObserver(mutation => {
                mutation.forEach(event => {
                    if (event.attributeName === 'src') {
                        var url = event.target.src;
                        if (url === watching.fallback) {
                            fail.push(url);
                        }
                        else {
                            urls.push(url);
                        }
                    }
                });
            }).observe(element, {attributes: true});
        }
        else {
            urls.push(url);
        }
    });
}

// Add shortcut for chapter
function appendShortcuts() {
    var button = Array.isArray(watching.shortcut) ? watching.shortcut.map(item => document.querySelector(item)) : document.querySelectorAll(watching.shortcut);
    document.addEventListener('keydown', event => {
        var index = ['ArrowLeft', 'ArrowRight'].indexOf(event.key);
        var shortcut = button[index];
        if (shortcut) {
            shortcut.click();
        }
    });
}

// Notifications
function notification(action, status, url) {
    var warn = i18n[action][status] ?? i18n[action];
    var message = '⚠️ ' + warn.replace('%n%', images.length);
    var caution = document.createElement('div');
    return jsNotify.popup({message, timeout: 5000});
}
