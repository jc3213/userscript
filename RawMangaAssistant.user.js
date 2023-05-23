// ==UserScript==
// @name            Raw Manga Assistant
// @name:zh         漫画生肉网站助手
// @namespace       https://github.com/jc3213/userscript
// @version         1.9.0
// @description     Assistant for raw manga online website
// @description:zh  漫画生肉网站助手脚本
// @author          jc3213
// @match           https://klmanga.net/*
// @match           https://weloma.art/*
// @match           https://rawdevart.art/*
// @connect         *
// @require         https://cdn.jsdelivr.net/gh/jc3213/jslib@ac5ad687e6a7b0f53cee615016d51451311e793c/ui/jsui.max.js#sha256-474rXwhePKEEabtRcybkQptUGi43VxfwUZ6kUsj169k=
// @require         https://cdn.jsdelivr.net/gh/jc3213/jslib@ac5ad687e6a7b0f53cee615016d51451311e793c/js/aria2.js#sha256-D59PF0HBvNaTfgK+nTUY+2nTQG12hp2f81MCaM5EHI8=
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
// @webRequest      {"selector": "*oralistnations.com/*", "action": "cancel"}
// @webRequest      {"selector": "*gumlahdeprint.com/*", "action": "cancel"}
// @webRequest      {"selector": "*.diclotrans.com/*", "action": "cancel"}
// @webRequest      {"selector": "*pavymoieter.com/*", "action": "cancel"}
// @webRequest      {"selector": "*.bidgear.com/*", "action": "cancel"}
// @                weloma.art
// @webRequest      {"selector": "*.pubfuture.com/*", "action": "cancel"}
// @webRequest      {"selector": "*.highcpmrevenuenetwork.com/*", "action": "cancel"}
// @webRequest      {"selector": "*.profitabledisplaynetwork.com/*", "action": "cancel"}
// @webRequest      {"selector": "*welovemanga.one/app/manga/themes/dark/ads/pop.js", "action": "cancel"}
// ==/UserScript==

'use strict';
// Initial variables
var urls = [];
var fail = [];
var dir;
var options = GM_getValue('options', {});
var {jsonrpc = 'http://localhost:6800/jsonrpc', secret = '', iconTop = 350, iconLeft = 200, ctxMenu = 1} = options;
var headers = {'cookie': document.cookie, 'referer': location.href, 'user-agent': navigator.userAgent};
var aria2 = new Aria2(jsonrpc, secret);
var jsUI = new JSUI();

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
            done: 'All urls of %n% images have been extracted',
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
var sites = {
    'klmanga.net': {
        manga: 'img.chapter-img',
        attr: 'data-aload',
        title: {selector: 'li.current > a', attr: 'title', regexp: /^([\w\s\d]+)(?:\s-\sRAW)?\sChapter\s(\d+(?:\.\d)?)/, name: 1, chapter: 2},
        shortcut: 'a.btn.btn-info.prev, a.btn.btn-info.next',
        ads: '#adLink1, .chapter-content > center'
    },
    'weloma.art': {
        manga: 'img.chapter-img',
        attr: 'data-src',
        title: {selector: 'img.chapter-img', attr: 'alt', regexp: /^([\w\s\d]+)(?:\s-\sRAW)?\sChapter\s(\d+(?:\.\d)?)/, name: 1, chapter: 2},
        shortcut: 'a.btn.btn-info.prev, a.btn.btn-info.next'
    },
    'rawdevart.art': {
        manga: 'div.chapter-img > canvas',
        attr: 'data-srcset',
        title: {selector: 'div.chapter-img > canvas', attr: 'alt', regexp: /^([\w\s\d]+)\s(?:RAW)?\s-\sChapter\s(\d+(?:\.\d)?)/, name: 1, chapter: 2},
        shortcut: 'div.chapter-btn.prev > a, div.chapter-btn.next > a'
    },
};
var watch = sites[location.host];

function longDecimalNumber(sum, len = 3) {
    var [, num, flt] = (sum + '').match(/(\d+)(\.\d+)?/);
    return (10 ** len + num).slice(- len) + (flt ? flt : '');
}

function extractMangaTitle() {
    var symbol = navigator.platform === 'Win32' ? '\\' : '/';
    var {selector, attr, regexp, name, chapter, exclude = ''} = watch.title;
    var temp = document.querySelector(selector).getAttribute(attr).match(regexp);
    var title = symbol + temp[name] + symbol + longDecimalNumber(temp[chapter]);
    return title.replace(/[:\?\"\']/g, '_');
}

// Create UI
jsUI.css.add(` .jsui-menu-item {height: 36px; line-height: 28px; margin: 0px; width: 120px; font-size: 14px;}
.jsui-drop-menu, .jsui-menu-float, .jsui-notify-popup {color: #000; background-color: #fff; border: 1px solid darkviolet;}
.jsui-menu-float, .jsui-manager {position: fixed; z-index: 9999999;}
.jsui-menu-float {top: ${iconTop}px; left: ${iconLeft}px; width: 38px; height: 38px;}
.jsui-manager {top: ${iconTop}'px; left: ${iconLeft + 39}px;}`);

var float = jsUI.new().body('🖱️').class('jsui-menu-float, jsui-menu-item').onclick(event => container.show());

var container = jsUI.new().class('jsui-manager').hide();
document.body.append(float, container);

document.addEventListener('click', event => {
    if (!float.contains(event.target)) {
        container.hide();
    }
});

// Draggable button and menu
jsUI.dragndrop(float, ({top, left}) => {
    container.css({top: `${top}px`, left: `${left + 38}px`});
    options = {...options, iconTop: top, iconLeft: left};
    GM_setValue('options', options);
});

var downMenu = jsUI.menu(true).parent(container).hide();
downMenu.add(i18n.save.label).onclick(downloadAllUrls);
downMenu.add(i18n.copy.label).onclick(copyAllUrls);
downMenu.add(i18n.aria2.label).onclick(sendUrlsToAria2);

async function downloadAllUrls() {
    await Promise.all(urls.map(promiseDownload));
    notification('save', 'done');
}
function promiseDownload(url, index) {
    return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({url, headers, method: 'GET', responseType: 'blob', onload: (details) => {
            var blob = details.response;
            var a = jsUI.new('a').attr({href: URL.createObjectURL(blob), download: `${longDecimalNumber(index)}.${blob.type.slice(blob.type.indexOf('/') + 1)}`});
            a.click();
            a.remove();
            resolve(true);
        }, onerror: reject});
    });
}
function copyAllUrls() {
    navigator.clipboard.writeText(urls.join('\n'));
    notification('copy', 'done');
}
// Aria2 Menuitems
async function sendUrlsToAria2() {
    if (dir) {
        var json = urls.map((url, index) => ({method: 'aria2.addUri', params: [[url], {out: longDecimalNumber(index) + '.' + url.match(/(png|jpg|jpeg|webp|av1)/)[0], dir, ...headers}]}));
        await aria2.batch(json);
        notification('aria2', 'done');
    }
    else {
        aria2.call('aria2.getGlobalOption').then((result) => {
            dir = result.dir + extractMangaTitle();
            sendUrlsToAria2();
        }).catch(sendAria2Error);
    }
}
function sendAria2Error() {
    alert(i18n.aria2.error);
    jsonrpc = prompt('Aria2 JSONRPC URI', jsonrpc) ?? jsonrpc;
    secret = prompt('Aria2 Secret Token', secret ) ?? secret;
    aria2 = new Aria2(jsonrpc, secret);
    options = {...options, jsonrpc, secret};
    GM_setValue('options', options);
}

var modeMenu = jsUI.menu(true).parent(container);
modeMenu.add(i18n.gotop.label).onclick(scrollToTop);
var ctxBtn = modeMenu.add(i18n.menu.on).onclick(contextMenuMode);

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
        float.hide();
        ctxBtn.body(i18n.menu.on);
        document.addEventListener('contextmenu', contextMenuHandler);
    }
    else {
        float.show();
        ctxBtn.body(i18n.menu.off);
        container.css({top: `${float.offsetTop}px`, left: `${float.offsetLeft + float.offsetWidth}px`});
        document.removeEventListener('contextmenu', contextMenuHandler);
    }
}
function contextMenuHandler(event) {
    if (event.shiftKey || event.target.tagName === 'IMG' || event.target.tagName === 'INPUT') {
        return;
    }
    event.preventDefault();
    container.css({top: `${event.clientY}px`, left: `${event.clientX}px`}).show();
}
switchMenuMode();

// Extract images data
if (watch) {
    if (watch.ads) {
        document.querySelectorAll(watch.ads).forEach(item => item.remove());
    }
    var images = document.querySelectorAll(watch.manga);
    var allimages = images.length;
    if (allimages > 0) {
        extractImage();
    }
    if (watch.shortcut) {
        var [prev, next] = document.querySelectorAll(watch.shortcut);
        var shortcut = {ArrowLeft: prev, ArrowRight: next};
        document.addEventListener('keydown', event => shortcut[event.key]?.click());
    }
}

function extractImage() {
    var warning = notification('extract', 'start');
    downMenu.show();
    var {logo, attr} = watch;
    var observer = setInterval(() => {
        if (allimages === urls.length + fail.length) {
            clearInterval(observer);
            warning.remove();
            fail.length === 0 ? notification('extract', 'done') : notification('extract', 'fail', '\n' + fail.map(item => 'page ' + (item + 1)));
        }
    }, 250);
    images.forEach((element, index) => {
        var src = element.getAttribute(attr) ?? element.getAttribute('src');
        var url = src.trim().replace(/^\/\//, 'http://');
        logo?.includes(url) ? allimages -- : urls.push(url);
    });
}

// Notifications
function notification(action, status, url) {
    var warn = i18n[action][status] ?? i18n[action];
    var message = '⚠️ ' + warn.replace('%n%', allimages);
    return jsUI.notification(message, 5000);
}
