// ==UserScript==
// @name            Raw Manga Assistant
// @namespace       https://github.com/jc3213/userscript
// @name:zh         漫画生肉网站助手
// @version         60
// @description     Assistant for raw manga online (LoveHug, MangaSum, Komiraw and etc.)
// @description:zh  漫画生肉网站 (LoveHug, MangaSum, Komiraw 等) 助手脚本
// @author          jc3213
// @match           *://lovehug.net/*
// @match           *://kissaway.net/*
// @match           *://mangasum.com/*
// @match           *://mangant.com/*
// @match           *://manga1000.com/*
// @match           *://manga1001.com/*
// @match           *://komiraw.com/*
// @match           *://manga11.com/*
// @match           *://rawdevart.com/*
// @match           *://lhscan.me/*
// @connect         *
// @grant           GM_getValue
// @grant           GM_setValue
// @grant           GM_xmlhttpRequest
// @grant           GM_webRequest
// @webRequest      {"selector": "*.googlesyndication.com/*", "action": "cancel"}
// @webRequest      {"selector": "*.googletagservices.com/*", "action": "cancel"}
// @webRequest      {"selector": "*.googletagmanager.com/*", "action": "cancel"}
// @webRequest      {"selector": "*.amazon-adsystem.com/*", "action": "cancel"}
// @webRequest      {"selector": "*.cloudfront.net/*", "action": "cancel"}
// @webRequest      {"selector": "*.disqus.com/*", "action": "cancel"}
// @webRequest      {"selector": "*.facebook.net/*", "action": "cancel"}
// @webRequest      {"selector": "*.sharethis.com/*", "action": "cancel"}
// komiraw.com / manga11.com / rawdevart.com / kissaway.net
// @webRequest      {"selector": "*.exdynsrv.com/*", "action": "cancel"}
// manga1000.com / manga1001.com
// @webRequest      {"selector": "*manga1000.com/atba.js", "action": "cancel"}
// @webRequest      {"selector": "*.exosrv.com/*", "action": "cancel"}
// @webRequest      {"selector": "*.4dsply.com/*", "action": "cancel"}
// @webRequest      {"selector": "*.realsrv.com/*", "action": "cancel"}
// @webRequest      {"selector": "*.bidgear.com/*", "action": "cancel"}
// rawdevart.com
// @webRequest      {"selector": "*.vdo.ai/*", "action": "cancel"}
// kissaway.net
// @webRequest      {"selector": "*.your-notice.com/*", "action": "cancel"}
// @webRequest      {"selector": "*eyefuneve.com/*", "action": "cancel"}
// @webRequest      {"selector": "*cogleapad.com/*", "action": "cancel"}
// ==/UserScript==

'use strict';
// Initial variables
var urls = [];
var save = [];
var aria2 = [];
var fail = [];
var observer;
var images;
var watching;
var mousedown;
var moving = false;
var position = GM_getValue('position', {top: innerHeight * 0.3, left: innerWidth * 0.15});
var offset = {};
var lazyload;
var warning;
var header = ['Cookie: ' + document.cookie, 'Referer: ' + location.href, 'User-Agent: ' + navigator.userAgent];

// i18n strings and labels
var messages = {
    'en-US': {
        save: {
            label: 'Download',
            done: 'All %n% images <b>have been successfully downloaded</b>',
            error: 'Some image <b>can\'t be downloaded</b>'
        },
        copy: {
            label: 'Copy Urls',
            done: 'All %n% urls have been <b>copied to clipboard</b>'
        },
        aria2: {
            label: 'Send to Aria2 RPC',
            done: 'All %n% image urls <b>have been sent to Aria2 RPC</b>',
            norpc: '<b>No response</b> from Aria2 RPC server',
            nokey: 'Aria2 RPC secret <b>token is invalid</b>'
        },
        secret: 'Secret token updated, reloading page in 5 seconds',
        gotop: {
            label: 'Back to Top',
        },
        lazy: {
            label: 'Preload All Images'
        },
        menu: {
            label: 'Context Menu Mode'
        },
        extract: {
            start: '<b>Extracting</b> manga source',
            done: 'A total of %n% image urls <b>has been extracted</b>',
            fail: '<b>Download function not available</b> due to extraction failure',
            error: '<b>Can\'t be extracted</b> image extension',
            fatal: '<b>No manga source</b> for extraction. Please send feedback'
        }
    },
    'zh-CN': {
        save: {
            label: '下载图像',
            done: '已<b>成功下载</b>全部 %n% 图像',
            error: '<b>无法下载>%部分图像',
        },
        copy: {
            label: '复制链接',
            done: '%n% 图像链接已<b>复制到剪切板</b>'
        },
        aria2: {
            label: '发送至 Aria2 RPC',
            icon: '🖅',
            done: '全部 %n% 图像链接已发送至<b>Aria2 RPC</b>',
            norpc: 'Aria2 RPC <b>服务器没有响应</b>',
            nokey: 'Aria2 RPC <b>密钥不正确</b>'
        },
        secret: '密钥已更新，５秒后自动刷新页面',
        gotop: {
            label: '回到顶部',
        },
        lazy: {
            label: '预加载所有图像',
        },
        menu: {
            label: '右键菜单模式',
        },
        extract: {
            start: '<b>正在解析</b>图像来源',
            done: '已<b>成功解析</b>全部 %n% 图像来源',
            fail: '无法解析图像来源，下载功能<b>无法使用</b>',
            error: '<b>无法解析</b>图像后缀',
            fatal: '<b>无法获取</b>图像来源，请反馈问题'
        }
    }
};
var i18n = messages[navigator.language] || messages['en-US'];

// Supported sites
var mangas = {
    'lovehug.net': {
        chapter: /\d+\/\d+/,
        folder: () => {var array = document.querySelectorAll('span[itemprop]'); return array[1].innerText.slice(0, -7) + '\\' + array[2].innerText.match(/\d+/)[0];},
        selector: 'img.chapter-img',
        shortcut: ['a.btn.btn-info.prev', 'a.btn.btn-info.next']
    },
    'mangasum.com': {
        chapter: /\/manga\/([^\/]+)\/chapter-([^\/]+)\//,
        folder: () => {return chapter[1].replace(/(-manga|-raw|-mang)/g, '') + '\\' + chapter[2]},
        selector: 'div[id^="page_"] > img',
        lazyload: 'data-original'
    },
    'komiraw.com': {
        chapter: /\/[^\/]+\/.+/,
        folder: () => {return document.querySelector('#boxtopchap > a').innerText.split('|')[0].trim() + '\\' + document.querySelector('#boxtopchap > h2 > a > span > span').innerText.match(/\d+/)[0];},
        ads: ['iframe'],
        selector: 'img.chapter-img ',
        shortcut: ['#prev_chap', '#next_chap']
    },
    'rawdevart.com': {
        chapter: /\/([^\/]+)\/chapter-([^\/]+)\//,
        folder: () => {return chapter[1] + '\\' + chapter[2]},
        selector: 'div.mb-3 > img',
        lazyload: 'data-src'
    },
    'manga1000.com': {
        chapter: /-raw/,
        folder: () => {var array = document.querySelector('h1.entry-title').innerText.split('–'); return array[0].trim() + '\\' + array[1].match(/\d+/)[0];},
        selector: 'img.aligncenter',
        shortcut: 'div.linkchap > a'
    },
    'lhscan.me': {
        chapter: /\/chapter-\d+/,
        folder: () => {var array = document.querySelector('#chapter-heading').innerText.split('-'); return array[0].trim() + '\\' + array[1].match(/\d+/)[0];},
        selector: 'img.wp-manga-chapter-img'
    },
    'kissaway.net': {
        chapter: /\d+\/\d+/,
        folder: () => {var array = document.querySelectorAll('span[itemprop]'); return array[1].innerText.slice(0, -7) + '\\' + array[2].innerText.match(/\d+/)[0];},
        selector: 'img.chapter-img',
        shortcut: ['a.btn.btn-info.prev', 'a.btn.btn-info.next'],
        lazyload: 'data-original'
    }
};
mangas['mangant.com'] = mangas['mangasum.com'];
mangas['manga1001.com'] = mangas['manga1000.com'];
mangas['manga11.com'] = mangas['komiraw.com'];
watching = mangas[location.host];

// Create UI
var css = document.createElement('style');
css.innerHTML = '.menuOverlay {background-color: #fff; position: fixed; z-index: 999999999;}\
.menuContainer {background-color: #fff; min-width: fit-content; max-width: 330px; border: 1px ridge darkblue; font-size: 14px;}\
.assistantIcon {width: 30px; display: inline-block; text-align: center}\
.assistantMenu {color: black; width: 190px; padding: 10px; height: 40px; display: block; user-select: none;}\
.assistantMenu:hover {background-color: darkviolet !important; color: white; cursor: default;}\
.menuAria2Item {width: 300px !important; height: 41px; border: 1px ridge darkblue; overflow: hidden;}\
.menuAria2Item:focus {background-color: darkblue !important; color: white;}';
document.head.appendChild(css);

var button = document.createElement('span');
button.id = 'assistant_button';
button.innerHTML = '🖱️';
button.className = 'menuOverlay assistantMenu';
button.draggable = true;
button.style.cssText = 'top: ' + position.top + 'px; left: ' + position.left + 'px; text-align: center; vertical-align: middle; width: 42px; height: 42px; border: 1px solid darkviolet;';
button.addEventListener('click', (event) => { container.style.display = 'block'; });
document.body.appendChild(button);

var container = document.createElement('div');
container.id = 'assistant_container';
container.className = 'menuOverlay';
container.style.cssText = 'top: ' + position.top + 'px; left: ' + (position.left + button.offsetWidth) + 'px; display: none';
document.body.appendChild(container);

// Draggable button and menu
document.addEventListener('dragstart', (event) => {
    offset.top = event.clientY;
    offset.left = event.clientX
});
document.addEventListener('dragend', (event) => {
    position.top += event.clientY - offset.top;
    position.left += event.clientX - offset.left;
    button.style.top = position.top + 'px';
    button.style.left = position.left + 'px';
    container.style.top = button.offsetTop + 'px';
    container.style.left = button.offsetLeft + button.offsetWidth + 'px';
    GM_setValue('position', position);
});
document.addEventListener('click', (event) => {
    if (aria2Menu.contains(event.target) || button.contains(event.target)) {
        return;
    }
    container.style.display = 'none';
    aria2Menu.style.display = 'none';
});

// Primary menus
var downMenu = document.createElement('div');
downMenu.innerHTML = '<div class="assistantMenu"><span class="assistantIcon">💾</span>' + i18n.save.label + '</span></div>\
<div class="assistantMenu"><span class="assistantIcon">📄</span>' + i18n.copy.label + '</span></div>\
<div class="assistantMenu"><span class="assistantIcon">🖅</span>' + i18n.aria2.label + '</span></div>';
downMenu.className = 'menuContainer';
downMenu.style.display = 'none';
container.appendChild(downMenu);
downMenu.querySelector('.assistantMenu:nth-child(1)').addEventListener('click', () => {
    save.forEach((item, index) => {
        GM_xmlhttpRequest({
            method: 'GET',
            url: item[0],
            responseType: 'blob',
            onload: (details) => {
                var a = document.createElement('a');
                a.href = URL.createObjectURL(details.response);
                a.download = item[1];
                a.click();
                if (index === images.length - 1) {
                    notification('save', 'done');
                }
            },
            onerror: () => notification('save', 'error', item[0])
        });
    });
});
downMenu.querySelector('.assistantMenu:nth-child(2)').addEventListener('click', () => {
    navigator.clipboard.writeText(urls.join('\n'));
    notification('copy', 'done');
});
downMenu.querySelector('.assistantMenu:nth-child(3)').addEventListener('click', () => {
    aria2RequestHandler({
        method: 'aria2.getGlobalOption'
    }, (details) => {
        if (details.status === 200) {
            if (details.response.includes('Unauthorized')) {
                notification('aria2', 'nokey');
            }
            else {
                var dir = details.response.match(/"dir":"([^"]+)"/)[1] + '\\' + watching.folder();
                var aria2 = save.map((item, index) => aria2RequestHandler({
                    method: 'aria2.addUri',
                    options: [[item[0]], {out: item[1], dir: dir, header: header}]
                }, () => {
                    if (index === images.length - 1) {
                        notification('aria2', 'done');
                    }
                }));
            }
        }
        else {
            notification('aria2', 'norpc');
        }
    }, (error) => {
        notification('aria2', 'norpc');
    });
    function aria2RequestHandler(request, onload, onerror) {
        GM_xmlhttpRequest({
            url: aria2Menu.querySelector('input[name="server"]').value,
            method: 'POST',
            data: JSON.stringify({
                id: '',
                jsonrpc: '2.0',
                method: request.method,
                params: ['token:' + aria2Menu.querySelector('input[name="secret"]').value].concat(request.options)
            }),
            onload: onload,
            onerror: onerror
        });
    }
});
downMenu.querySelector('.assistantMenu:nth-child(3)').addEventListener('contextmenu', (event) => {
    event.preventDefault();
    if (aria2Menu.style.display === 'block') {
        aria2Menu.style.display = 'none';
    }
    else {
        aria2Menu.style.display = 'block';
    }
});

// Aria2 Sub Menu
var aria2Menu = document.createElement('form');
aria2Menu.innerHTML = '<input class="assistantMenu menuAria2Item" name="server" value="' + GM_getValue('server', 'http://localhost:6800/jsonrpc') + '">\
<input class="assistantMenu menuAria2Item" type="password" name="secret" value="' + GM_getValue('secret', '') + '">';
aria2Menu.className = 'menuContainer';
aria2Menu.style.cssText = 'position: absolute; display: none; top: 80px; left: 190px;';
aria2Menu.addEventListener('change', (event) => GM_setValue(event.target.name, event.target.value));
container.appendChild(aria2Menu);

// Secondary menus
var clickMenu = document.createElement('div');
clickMenu.innerHTML = '<div id="assistant_gotop" class="assistantMenu"><span class="assistantIcon">⬆️</span>' + i18n.gotop.label + '</div>';
clickMenu.className = 'menuContainer';
clickMenu.querySelector('.assistantMenu:nth-child(1)').addEventListener('click', () => {
        document.documentElement.scrollTop = 0;
});
container.appendChild(clickMenu);

// Switchable Menus
var switchWorker = [{
    on: () => {
        if (!images || !watching.lazyload) {
            return;
        }
        lazyload = setInterval(() => {
            if (images.length === urls.length) {
                images.forEach((element) => element.setAttribute('src', element.getAttribute(watching.lazyload)));
                clearInterval(lazyload);
            }
        }, 100);
    },
    off: () => {
        clearInterval(lazyload);
    }
},{
    on: () => {
        button.style.display = 'none';
        document.addEventListener('contextmenu', contextMenuHandler);
    },
    off: () => {
        document.removeEventListener('contextmenu', contextMenuHandler);
        button.style.display = 'block';
        container.style.top = button.offsetTop + 'px';
        container.style.left = button.offsetLeft + button.offsetWidth + 'px';
    }
}];
var switchMenu = document.createElement('div');
switchMenu.innerHTML = '<div class="assistantMenu"><span class="assistantIcon"></span>' + i18n.lazy.label + '<input type="hidden" name="lazy" value="' + GM_getValue('lazy', 'off') + '"></div>\
<div class="assistantMenu"><span class="assistantIcon"></span>' + i18n.menu.label + '<input type="hidden" name="menu" value="' + GM_getValue('menu', 'on') + '"></div>';
switchMenu.className = 'menuContainer';
switchMenu.querySelectorAll('.assistantMenu').forEach((item, index) => {
    var input = item.querySelector('input');
    switchHandler(item, input.value, switchWorker[index][input.value]);
    item.addEventListener('click', (event) => {
        input.value = input.value === 'on' ? 'off' : 'on';
        GM_setValue(input.name, input.value);
        switchHandler(item, input.value, switchWorker[index][input.value]);
    });
});
container.appendChild(switchMenu);

function switchHandler(item, value, worker) {
    item.firstElementChild.innerHTML = value === 'on' ? '✅' : '';
    if (typeof worker === 'function') { worker(); }
}
function contextMenuHandler(event) {
    if (event.target.id === 'assistant_aria2' || event.shiftKey) {
        return;
    }
    event.preventDefault();
    container.style.top = event.clientY + 'px';
    container.style.left = event.clientX + 'px';
    container.style.display = 'block';
}

// Extract images data
if (watching) {
    var chapter = location.pathname.match(watching.chapter);
    if (chapter) {
        images = document.querySelectorAll(watching.selector);
        removeAdsElement(watching.ads);
        extractImage(watching.lazyload);
        appendShortcuts(watching.shortcut);
    }
}

function removeAdsElement(selector) {
    Array.isArray(selector) ? selector.forEach(item => removeElement(item)) : removeElement(selector);

    function removeElement(sel) {
        document.querySelectorAll(sel).forEach(item => item.remove());
    }
}

function extractImage(lazyload) {
    if (images.length === 0) {
        return notification('extract', 'fatal');
    }
    warning = notification('extract', 'start');
    images.forEach((element, index) => {
        var source = element.getAttribute(lazyload || 'src');
        var url = source.trim().replace(/^\/\//, 'http://');
        var name = ('000' + index).substr(index.toString().length);
        getExtension(index, url, name);
    });
    observer = setInterval(() => {
        if (images.length === urls.length + fail.length) {
            warning.remove();
            clearInterval(observer);
            if (fail.length === 0) {
                downMenu.style.display = 'block';
                notification('extract', 'done');
            }
            else {
                notification('extract', 'fail', '\n' + fail.join('\n'));
            }
        }
    }, 100);
}
function getExtension(index, url, name) {
    var ext = url.match(/(png|jpg|jpeg|webp)/);
    if (ext) {
        storeImageInfo(index, url, name, ext[0]);
    }
    else {
        GM_xmlhttpRequest({
            url, url,
            method: 'HEAD',
            onload: (details) => {
                ext = details.responseHeaders.match(/(png|jpg|jpeg|webp)/);
                if (ext) {
                    storeImageInfo(index, url, name, ext[0]);
                }
            },
            onerror: () => {
                fail.push(url);
            }
        });
    }
}
function storeImageInfo(index, url, name, ext) {
    name += '.' + ext;
    urls.push(url);
    save.push([url, name]);
}

// Add shortcut for chapter
function appendShortcuts(shortcut) {
    if (Array.isArray(shortcut)) {
        var button = shortcut.map(item => document.querySelector(item));
    }
    else {
        button = document.querySelectorAll(shortcut);
    }
    document.addEventListener('keydown', (event) => {
        var index = ['ArrowLeft', 'ArrowRight'].indexOf(event.key);
        if (index !== -1) {
            button[index].click();
        }
    });
}

// Notifications
function notification(action, status, url) {
    var warn = i18n[action][status] || i18n[action];
    var html = '⚠️' + warn.replace('%n%', '<i><u>' + images.length + '</u></i>');
    if (url) {
        html += '<p>' + url + '</p>';
    }
    var caution = document.createElement('div');
    caution.id = 'assistant_caution';
    caution.className = 'menuOverlay assistantMenu';
    caution.style.cssText = 'width: fit-content; height: 50px; text-align: center; font-size: 16px; padding: 12px; border: 1px ridge darkviolet; border-radius: 10px;';
    caution.innerHTML = html;
    document.body.appendChild(caution);
    align_notification();
    if (action === 'extract' && ['start', 'fail'].includes(status)) {
        return caution;
    }
    setTimeout(() => {
        caution.remove();
        align_notification();
    }, 3000);
}
function align_notification() {
    document.querySelectorAll('#assistant_caution').forEach((element, index) => {
        element.style.top = index * (element.offsetHeight + 5) + 10 + 'px';
        element.style.left = (innerWidth - element.offsetWidth) / 2 + 'px';
    });
}
