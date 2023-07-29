// ==UserScript==
// @name            Raw Manga Assistant
// @name:zh         漫画生肉网站助手
// @namespace       https://github.com/jc3213/userscript
// @version         1.11.0
// @description     Assistant for raw manga online website
// @description:zh  漫画生肉网站助手脚本
// @author          jc3213
// @match           https://klmanga.net/*
// @match           https://weloma.art/*
// @match           https://rawdevart.art/*
// @connect         *
// @require         https://cdn.jsdelivr.net/gh/jc3213/jslib@e7814b44512263b5e8125657aff4c1be5fe093a5/ui/jsui.pro.js#sha256-CkxQg/AW5bHyyhBzktXoHRWbB2QRYiui5BJeMl8Myw8=
// @require         https://cdn.jsdelivr.net/gh/jc3213/jslib@066a2c28442a9e191ea43dd6aaf334b2411026d3/aria2/aria2.js#sha256-OyKr9LrMvIwcFRsR7E+lcQwV0cAL1b405MbcczzThLA=
// @grant           GM_setValue
// @grant           GM_getValue
// @grant           GM_xmlhttpRequest
// ==/UserScript==

'use strict';
// Initial variables
var urls = [];
var fail = [];
var dir;
var options = GM_getValue('options', {});
var ctxmenu;
var {jsonrpc = 'http://localhost:6800/jsonrpc', secret = ''} = options;
var {host, pathname} = location;
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
        viewer: /-chapter-/,
        manga: 'img.chapter-img',
        attr: 'data-aload',
        title: {selector: 'li.current > a', attr: 'title', regexp: /^([\w\s\d:\(\)]+)(?:\s-\sRAW)?\sChapter\s(\d+(?:\.\d)?)/},
        shortcut: {prev: 'a.btn.btn-info.prev', next: 'a.btn.btn-info.next'},
        ads: '#list-imga > center, img[src$="knet_64ba650e3ad61.png"], img[src$="cr_649a4491439a0.jpg"]',
        logo: ['olimposcan2_64c3d567c09a6.png', 'knet_64ba650e3ad61.png', 'cr_649a4491439a0.jpg']
    },
    'weloma.art': {
        viewer: /^\/\d+\/\d+/,
        manga: 'img.chapter-img',
        attr: 'data-src',
        title: {selector: 'img.chapter-img', attr: 'alt', regexp: /^([\w\s\d:\(\)]+)(?:\s-\sRAW)?\sChapter\s(\d+(?:\.\d)?)/},
        shortcut: {prev: 'a.btn.btn-info.prev', next: 'a.btn.btn-info.next'}
    },
    'rawdevart.art': {
        viewer: /\/chapter-/,
        manga: 'canvas[data-srcset]',
        attr: 'data-srcset',
        title: {selector: 'canvas[data-srcset]', attr: 'alt', regexp: /^([\w\s\d]:\(\)+)\s(?:RAW)?\s-\sChapter\s(\d+(?:\.\d)?)/},
        shortcut: {prev: '#sub-app .chapter-btn.prev > a', next: '#sub-app .chapter-btn.next > a'},
        ads: '[data-srcset$="450x375.png"]',
        logo: ['450x375.png', '800x700.jpeg']
    },
};
var watch = sites[host];

// Extract images data
if (watch?.viewer?.test(pathname)) {
    var images = document.querySelectorAll(watch.manga);
    var allimages = images.length;
    contextMenu();
    extractImage();
}
if (watch?.ads) {
    jsUI.css.add(`\n${watch.ads} \{display: none !important;\}\n`);
}

document.addEventListener('keydown', (event) => {
    if (!watch.shortcut) {
        return;
    }
    var shortcut = {ArrowLeft: document.querySelector(watch.shortcut.prev), ArrowRight: document.querySelector(watch.shortcut.next)};
    var hotkey = shortcut[event.key];
    if (hotkey) {
        hotkey.href ? open(shortcut[event.key].href , '_self') : hotkey.click();
    }
});

function longDecimalNumber(sum, len = 3) {
    var [, num, flt] = (sum + '').match(/(\d+)(\.\d+)?/);
    return (10 ** len + num).slice(- len) + (flt ? flt : '');
}

function extractMangaTitle() {
    var symbol = navigator.platform === 'Win32' ? '\\' : '/';
    var {selector, attr, regexp, exclude = ''} = watch.title;
    var temp = document.querySelector(selector).getAttribute(attr).match(regexp);
    var title = symbol + temp[1] + symbol + longDecimalNumber(temp[2]);
    return title.replace(/[:\?\"\']/g, '_');
}

// Create UI
function contextMenu() {
    jsUI.css.add(` .jsui-menu-item {height: 36px; line-height: 28px; margin: 0px; width: 120px; font-size: 14px;}
.jsui-drop-menu, .jsui-notify-popup {color: #000; background-color: #fff; border: 1px solid darkviolet;}
.jsui-manager {position: fixed; z-index: 9999999;}`);

    ctxmenu = jsUI.new().class('jsui-manager').parent(document.body).hide();

    var downMenu = jsUI.menu(true).parent(ctxmenu);
    downMenu.add(i18n.save.label).onclick(downloadAllUrls);
    downMenu.add(i18n.copy.label).onclick(copyAllUrls);
    downMenu.add(i18n.aria2.label).onclick(sendUrlsToAria2);

    var modeMenu = jsUI.menu(true).parent(ctxmenu);
    modeMenu.add(i18n.gotop.label).onclick(scrollToTop);

    document.addEventListener('contextmenu', (event) => {
        var {shiftKey, ctrlKey, altKey, clientY, clientX} = event;
        if (shiftKey || ctrlKey || altKey) {
            return;
        }
        event.preventDefault();
        ctxmenu.css({top: `${clientY}px`, left: `${clientX}px`}).show();
    });

    document.addEventListener('click', (event) => {
        ctxmenu.hide();
    });
}

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
        var sessions = urls.map((url, index) => ['aria2.addUri', [url], {out: longDecimalNumber(index) + '.' + url.match(/(png|jpg|jpeg|webp|av1)/)[0], dir, ...headers}]);
        await aria2.batch(sessions);
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
    options = {jsonrpc, secret};
    GM_setValue('options', options);
}
function scrollToTop() {
    document.documentElement.scrollTop = 0;
}

function extractImage() {
    var warning = notification('extract', 'start');
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
        if (logo.some((l) => url.includes(l))) {
            element.remove();
            allimages --;
        }
        else {
            urls.push(url);
        }
    });
}

// Notifications
function notification(action, status, url) {
    var warn = i18n[action][status] ?? i18n[action];
    var message = '⚠️ ' + warn.replace('%n%', allimages);
    return jsUI.notification(message, 5000);
}
