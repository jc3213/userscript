// ==UserScript==
// @name            Raw Manga Assistant
// @name:zh         漫画生肉网站助手
// @namespace       https://github.com/jc3213/userscript
// @version         1.11.5
// @description     Assistant for raw manga online website
// @description:zh  漫画生肉网站助手脚本
// @author          jc3213
// @match           https://klmanga.net/*
// @match           https://weloma.art/*
// @match           https://rawdevart.art/*
// @match           https://manga1000.top/*
// @connect         *
// @require         https://cdn.jsdelivr.net/gh/jc3213/jslib@e7814b44512263b5e8125657aff4c1be5fe093a5/ui/jsui.pro.js#sha256-CkxQg/AW5bHyyhBzktXoHRWbB2QRYiui5BJeMl8Myw8=
// @require         https://cdn.jsdelivr.net/gh/jc3213/jslib@066a2c28442a9e191ea43dd6aaf334b2411026d3/aria2/aria2.js#sha256-OyKr9LrMvIwcFRsR7E+lcQwV0cAL1b405MbcczzThLA=
// @grant           GM_setValue
// @grant           GM_getValue
// @grant           GM_xmlhttpRequest
// ==/UserScript==

'use strict';
// Initial variables
var manga;
var folder;
var urls = [];
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
            done: 'All %n% image urls have been sent to Aria2 JSON-RPC'
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
            done: '全部 %n% 图像链接已发送至Aria2 JSON-RPC'
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
        manga: {selector: 'img.chapter-img', attr: 'data-aload', except: ['olimposcan2', 'knet_64ba650e3ad61.png', 'cr_649a4491439a0.jpg']},
        title: {selector: 'ol.breadcrumb > :last-child > a', attr: 'title', regexp: /^(.+)(?:\s-\sRAW)?\sChapter\s(\d+(?:\.\d)?)/},
        shortcut: {prev: 'a.btn.btn-info.prev', next: 'a.btn.btn-info.next'},
        patch: () => {
            localStorage.setItem('shown_at', 3000000000000);
            document.querySelector('#list-imga').oncontextmenu = '';
        },
        ads: '#list-imga > center'
    },
    'weloma.art': {
        viewer: /^\/\d+\/\d+/,
        manga: {selector: 'img.chapter-img', attr: 'data-src', except: ['/uploads/']},
        title: {selector: 'img.chapter-img', attr: 'alt', regexp: /^(.+)(?:\s-\sRAW)?\sChapter\s(\d+(?:\.\d)?)/},
        shortcut: {prev: 'a.btn.btn-info.prev', next: 'a.btn.btn-info.next'}
    },
    'rawdevart.art': {
        viewer: /\/chapter-/,
        manga: {selector: 'canvas[data-srcset]', attr: 'data-srcset', except: ['450x375.png', '800x700.jpeg']},
        title: {selector: 'meta[property="og:title"]', attr: 'content', regexp: /^(.+)\s(?:RAW)?\s?\sChapter\s(\d+(?:\.\d)?)/},
        shortcut: {prev: '#sub-app .chapter-btn.prev > a', next: '#sub-app .chapter-btn.next > a'},
    },
    'manga1000.top': {
        viewer: /-chapter-/,
        manga: {selector: '#listImgs > img', attr: 'data-src'},
        title: {selector: 'meta[name="description"]', attr: 'content', regexp: /^Read\sraw\smanga\sjp\s(.+)\s-\s(?:RAW)?\schap\s(\d+(?:\.\d)?)/},
        shortcut: {prev: 'a.rd_top-left', next: 'a.rd_top-right'},
    },
};
var watch = sites[host];

// Extract images data
if (watch.viewer?.test(pathname)) {
    contextMenu();
    setTimeout(getAllMangaImages, 1000);
}
if (typeof watch.patch === 'function') {
    watch.patch();
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

// Create UI
function contextMenu() {
    jsUI.css.add(` .jsui-menu-item {height: 36px; line-height: 28px; margin: 0px; width: 120px; font-size: 14px;}
.jsui-drop-menu, .jsui-notify-popup {color: #000; background-color: #fff; border: 1px solid darkviolet;}
.jsui-manager {position: fixed; z-index: 9999999;}
${watch.ads} {display: none;}`);

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

function longDecimalNumber(sum, len = 3) {
    var [, num, flt] = (sum + '').match(/(\d+)(\.\d+)?/);
    return (10 ** len + num).slice(- len) + (flt ? flt : '');
}

function getAllMangaImages() {
    if (isNaN(manga)) {
        var warning = notification('extract', 'start');
        manga = 0;
        document.querySelectorAll(watch.manga.selector).forEach(i => {
            var src = i.getAttribute(watch.manga.attr) ?? i.getAttribute('src');
            var url = src.trim().replace(/^\/\//, 'http://');
            if (!watch.manga.except?.some((s) => url.includes(s))) {
                urls.push(url);
                manga ++;
            }
            else {
                i.remove();
            }
        });
        var symbol = navigator.platform === 'Win32' ? '\\' : '/';
        var title_string = document.querySelector(watch.title.selector).getAttribute(watch.title.attr);
        var temp = title_string.match(watch.title.regexp);
        console.log(title_string,watch.title.regexp);
        console.log(temp);
        var title = symbol + temp[1] + symbol + longDecimalNumber(temp[2]);
        folder = title.replace(/[:\?\"\']/g, '_');
        warning.remove();
        notification('extract', 'done');
    }
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
            dir = result.dir + folder;
            sendUrlsToAria2();
        }).catch(sendAria2Error);
    }
}
function sendAria2Error(error) {
    alert(error.message);
    jsonrpc = prompt('Aria2 JSONRPC URI', jsonrpc) ?? jsonrpc;
    secret = prompt('Aria2 Secret Token', secret ) ?? secret;
    aria2 = new Aria2(jsonrpc, secret);
    options = {jsonrpc, secret};
    GM_setValue('options', options);
}
function scrollToTop() {
    document.documentElement.scrollTop = 0;
}

// Notifications
function notification(action, status, url) {
    var warn = i18n[action][status] ?? i18n[action];
    var message = `⚠️ ${warn.replace('%n%', manga)}`;
    return jsUI.notification(message, 5000);
}
