// ==UserScript==
// @name            Raw Manga Assistant
// @namespace       https://github.com/jc3213/userscript
// @name:zh         漫画生肉网站助手
// @version         5.29
// @description     Assistant for raw manga online (LMangaToro, HakaRaw and etc.)
// @description:zh  漫画生肉网站 (MangaToro, HakaRaw 等) 助手脚本
// @author          jc3213
// @match           *://ja.mangatoro.com/*
// @match           *://hakaraw.com/*
// @match           *://klmanga.com/*
// @match           *://rawdevart.com/*
// @match           *://manga1000.com/*
// @match           *://manga1001.com/*
// @match           *://www.rawscan.net/*
// @connect         *
// @grant           GM_getValue
// @grant           GM_setValue
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
//                  hakaraw.com / rawdevart.com
// @webRequest      {"selector": "*.exdynsrv.com/*", "action": "cancel"}
//                  manga1000.com / manga1001.com / hakaraw.com
// @webRequest      {"selector": "*.bidgear.com/*", "action": "cancel"}
//                  hakaraw.com
// @webRequest      {"selector": "*.samariaalipeds.com/*", "action": "cancel"}
// @webRequest      {"selector": "cherishexpertise.com/*", "action": "cancel"}
// @webRequest      {"selector": ".wpadmngr.com/*", "action": "cancel"}
//                  rawdevart.com
// @webRequest      {"selector": "*.vdo.ai/*", "action": "cancel"}
//                  manga1000.com / manga1001.com
// @webRequest      {"selector": "https://static.manga10000.com/popup1000.js", "action": "cancel"}
// @webRequest      {"selector": "*.exosrv.com/*", "action": "cancel"}
// @webRequest      {"selector": "*.kahiliwintun.com/*", "action": "cancel"}
// @webRequest      {"selector": "*.realsrv.com/*", "action": "cancel"}
// @webRequest      {"selector": "*livezombymil.com/*", "action": "cancel"}
//                  klmanga.com
// @webRequest      {"selector": "*.your-notice.com/*", "action": "cancel"}
//                  www.rawscan.net
// @webRequest      {"selector": "*.cstwpush.com/*", "action": "cancel"}
// @webRequest      {"selector": "*cobwebcomprehension.com/*", "action": "cancel"}
// ==/UserScript==

'use strict';
// Initial variables
var urls = [];
var fail = [];
var logo = [];
var folder;
var observer;
var images;
var watching;
var options = {
    server: GM_getValue('server', 'http://localhost:6800/jsonrpc'),
    secret: GM_getValue('secret', ''),
    menu: GM_getValue('menu', 'on')
};
var visual = {height: document.documentElement.clientHeight, width: document.documentElement.clientWidth};
var offset = {};
var position = GM_getValue('position', {top: visual.height * 0.3, left: visual.width * 0.15});
var warning;
var headers = {'Cookie': document.cookie, 'Referer': location.href, 'User-Agent': navigator.userAgent};
var aria2Headers = ['Cookie: ' + document.cookie, 'Referer: ' + location.href, 'User-Agent:' + navigator.userAgent];

// i18n strings and labels
var message = {
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
            option: 'Options Aria2 RPC',
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
        submit: 'Submit',
        cancel: 'Cancel',
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
            option: '设置 Aria2 RPC',
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
        submit: '确定',
        cancel: '取消',
        extract: {
            start: '<b>正在解析</b>图像来源',
            done: '已<b>成功解析</b>全部 %n% 图像来源',
            fail: '无法解析图像来源，下载功能<b>无法使用</b>',
            error: '<b>无法解析</b>图像后缀',
            fatal: '<b>无法获取</b>图像来源，请反馈问题'
        }
    }
};
var i18n = message[navigator.language] ?? message['en-US'];

// Supported sites
var manga = {
    'ja.mangatoro.com': {
        chapter: /\/chapter-\d+/,
        title: () => {
            var result = /^(.+)\sChapter\s([^\s]+)\sNext/.exec(document.title);
            return {title: result[1], chapter: result[2]};
        },
        selector: 'div.page-chapter > img',
        lazyload: 'data-original'
    },
    'hakaraw.com': {
        chapter: /\/chapter-\d+/,
        title: () => {
            var result = /^(.+)\sRAW.+Chapter\s([^\s]+)/.exec(document.querySelector('a.chapter-title').title);
            return {title: result[1], chapter: result[2]};
        },
        shortcut: ['#prev_chap', '#next_chap'],
        ads: ['iframe'],
        selector: 'div.chapter-c > img',
        lazyload: 'data-src'
    },
    'klmanga.com': {
        chapter: /chapter-\d+/,
        title: () => {
            var result = /^(.+)\s-\s(Raw\s)?Chapter\s([^\s]+)\s-\s/.exec(document.title);
            return {title: result[1], chapter: result[3]};
        },
        shortcut: ['a.btn.btn-info.prev', 'a.btn.btn-info.next'],
        ads: ['div.float-ck'],
        selector: 'img.chapter-img',
        lazyload: 'data-aload'
    },
    'rawdevart.com': {
        chapter: /\/chapter-\d+/,
        title: () => {
            var result = /^Chapter\s(.+)\s\|\s([^\s]+)\sRaw\s\|/.exec(document.title);
            return {title: result[2], chapter: result[1]};
        },
        selector: '#img-container > div > img',
        lazyload: 'data-src'
    },
    'manga1000.com': {
        chapter: /【第(\S+)話】/,
        title: () => {
            var result = /^(.+)\s-\s(Raw\s)?Chapter\s([^\s]+)/.exec(document.title);
            return {title: result[1], chapter: result[3]};
        },
        shortcut: 'div.linkchap > a',
        selector: 'img.aligncenter'
    },
    'www.rawscan.net': {
        chapter: /read\/[^\/]+\/[^\/]+\.html$/,
        title: () => {
            var result = /^(.+)\s(Raw\s)?Chapter\s([^\s]+)\s/.exec(document.title);
            return {title: result[1], chapter: result[3]};
        },
        shortcut: ['a.prev', 'a.next'],
        selector: 'img.chapter-img',
        lazyload: 'data-src'
    }
};
manga['manga1001.com'] = manga['manga1000.com'];
watching = manga[location.host];

function longDecimalNumber(number, length = 3) {
    number = number.toString();
    var float = number.length - number.split(/[\._-]/)[0].length;
    return (10 ** length + number).slice(0 - length - float);
}

// Create UI
var css = document.createElement('style');
css.innerHTML = '.menuOverlay {background-color: #fff; position: fixed; z-index: 999999999;}\
.menuContainer {background-color: #fff; min-width: fit-content; max-width: 330px; border: 1px ridge darkblue; font-size: 14px;}\
.assistantIcon {width: 30px; display: inline-block; text-align: center}\
.assistantMenu {color: black; width: 190px; padding: 10px; height: 40px; display: block; user-select: none;}\
.assistantMenu:hover {background-color: darkviolet !important; color: white; cursor: default;}\
.aria2Container {position: fixed; background-color: #fff; font-size: 14px;}\
.aria2Container div {display: inline-block;}\
.aria2Container span.assistantMenu {border: 1px outset darkviolet; width: fit-content; display: block; height: 38px; margin: 1px; padding: 8px 10px;}\
.menuAria2Item {width: 240px !important; height: 38px; border: 1px ridge darkblue; overflow: hidden; word-break: break-word; user-select: none; margin: 1px;}\
.menuAria2Item:focus {background-color: darkblue !important; color: white;}';
document.head.appendChild(css);

var button = document.createElement('span');
button.id = 'assistant_button';
button.innerHTML = '🖱️';
button.className = 'menuOverlay assistantMenu';
button.draggable = true;
button.style.cssText = 'top: ' + position.top + 'px; left: ' + position.left + 'px; text-align: center; vertical-align: middle; width: 42px; height: 42px; border: 1px solid darkviolet;';
button.addEventListener('click', (event) => {
    container.style.display = 'block';
});
document.body.appendChild(button);

var container = document.createElement('div');
container.id = 'assistant_container';
container.className = 'menuOverlay';
container.style.cssText = 'top: ' + position.top + 'px; left: ' + (position.left + button.offsetWidth) + 'px; display: none';
document.body.appendChild(container);

// Draggable button and menu
button.addEventListener('dragstart', (event) => {
    offset.top = event.clientY;
    offset.left = event.clientX
});
button.addEventListener('dragend', (event) => {
    var maxHeight = visual.height - button.offsetHeight;
    var maxWidth = visual.width - button.offsetWidth;
    position.top += event.clientY - offset.top;
    position.left += event.clientX - offset.left;
    position.top = position.top < 0 ? 0 : position.top;
    position.top = position.top > maxHeight ? maxHeight : position.top;
    position.left = position.left < 0 ? 0 : position.left;
    position.left = position.left > maxWidth ? maxWidth : position.left;
    button.style.top = position.top + 'px';
    button.style.left = position.left + 'px';
    container.style.top = button.offsetTop + 'px';
    container.style.left = button.offsetLeft + button.offsetWidth + 'px';
    GM_setValue('position', position);
});
document.addEventListener('click', (event) => {
    if (button.contains(event.target) || aria2Menu.contains(event.target) || event.target.id === 'raw_assistant_aria2option') {
        return;
    }
    container.style.display = 'none';
});

// Primary menus
var downMenu = document.createElement('div');
downMenu.innerHTML = '<div id="raw_assistant_download" class="assistantMenu"><span class="assistantIcon">💾</span>' + i18n.save.label + '</span></div>\
<div id="raw_assistant_clipboard" class="assistantMenu"><span class="assistantIcon">📄</span>' + i18n.copy.label + '</span></div>\
<div id="raw_assistant_aria2download" class="assistantMenu" style="display: none;"><span class="assistantIcon">🖅</span>' + i18n.aria2.label + '</span></div>\
<div id="raw_assistant_aria2option" class="assistantMenu" id="aria2Option"><span class="assistantIcon">⚙️</span>' + i18n.aria2.option + '</div>';
downMenu.className = 'menuContainer';
downMenu.style.display = 'none';
container.appendChild(downMenu);
downMenu.addEventListener('click', (event) => {
    if (event.target.id === 'raw_assistant_download') {
        urls.forEach((url, index) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                responseType: 'blob',
                headers: headers,
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
    if (event.target.id === 'raw_assistant_clipboard') {
        navigator.clipboard.writeText(urls.join('\n'));
        notification('copy', 'done');
    }
    // Aria2 Menuitems
    if (event.target.id === 'raw_assistant_aria2download') {
        urls.forEach((url, index) => aria2RequestHandler({
            method: 'aria2.addUri',
            params: [[url], {out: longDecimalNumber(index) + '.' + url.match(/(png|jpg|jpeg|webp)/)[0], dir: folder, header: aria2Headers}]
        }).then(result => {
            if (index === urls.length - 1) {
                notification('aria2', 'done');
            }
        }));
    }
    if (event.target.id === 'raw_assistant_aria2option') {
        aria2Menu.style.cssText = 'display: block; left: ' + (position.left + 234) + 'px; top: ' + (position.top + 82) + 'px;';
    }
});

function checkAria2Availability() {
    var {title, chapter} = watching.title();
    aria2RequestHandler({method: 'aria2.getGlobalOption'})
    .then(result => {
        folder = result['dir'] + '\\' + title.replace(/[:\/\\\?\>\<]/g, '_') + '\\' + longDecimalNumber(chapter);
        downMenu.querySelector('#raw_assistant_aria2download').style.display = 'block';
    }).catch(error => notification('aria2', 'norpc'));
}
function aria2RequestHandler({method, params = []}) {
    return fetch(options.server, {method: 'POST', body: JSON.stringify({id: '', jsonrpc: '2.0', method, params: ['token:' + options.secret, ...params]})})
    .then(response => {
        if (response.ok) {
            return response.json();
        }
        else {
            throw response.statusText;
        }
    }).then(json => {
        if (json.result) {
            return json.result;
        }
        if (json.error) {
            throw json.error.message;
        }
    });
}

// Aria2 Sub Menus
var aria2Menu = document.createElement('form');
aria2Menu.innerHTML = '<div><input id="raw_assistant_aria2uri" class="assistantMenu menuAria2Item" name="server" value="' + options.server + '">\
<input id="raw_assistant_aria2token" class="assistantMenu menuAria2Item" type="password" name="secret" value="' + options.secret + '"></div>\
<div><span id="raw_assistant_aria2submit" class="assistantMenu">' + i18n.submit +'</span>\
<span id="raw_assistant_aria2cancel" class="assistantMenu">' + i18n.cancel +'</span></div>';
aria2Menu.className = 'aria2Container';
aria2Menu.style.cssText = 'display: none;';
container.appendChild(aria2Menu);
aria2Menu.addEventListener('click', (event) => {
    if (event.target.id === 'raw_assistant_aria2submit') {
        options.server = aria2Menu.querySelector('#raw_assistant_aria2uri').value;
        options.secret = aria2Menu.querySelector('#raw_assistant_aria2token').value;
        GM_setValue('server', options.server);
        GM_setValue('secret', options.secret);
        checkAria2Availability();
    }
    if (event.target.id === 'raw_assistant_aria2cancel') {
        aria2Menu.style.display = 'none';
    }
});

// Secondary menus
var clickMenu = document.createElement('div');
clickMenu.innerHTML = '<div class="assistantMenu"><span id="raw_assistant_scrolltop" class="assistantIcon">⬆️</span>' + i18n.gotop.label + '</div>';
clickMenu.className = 'menuContainer';
clickMenu.addEventListener('click', (event) => {
    if (event.target.id === 'raw_assistant_scrolltop') {
        document.documentElement.scrollTop = 0;
    }
});
container.appendChild(clickMenu);

// Switchable Menus
var switchWorker = {
    menu: {
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
    }
};
var switchMenu = document.createElement('div');
switchMenu.innerHTML = '<div class="assistantMenu" name="menu"><span class="assistantIcon"></span>' + i18n.menu.label + '</div>';
switchMenu.className = 'menuContainer';
switchMenu.querySelectorAll('.assistantMenu').forEach(switchHandler);
switchMenu.addEventListener('click', (event) => {
    var name = event.target.getAttribute('name');
    options[name] = options[name] === 'on' ? 'off' : 'on';
    switchHandler(event.target);
    GM_setValue(name, options[name]);
});
container.appendChild(switchMenu);

function switchHandler(item) {
    var name = item.getAttribute('name');
    if (options[name] === 'on') {
        switchWorker[name].on();
        item.querySelector('.assistantIcon').innerHTML = '✅';
    }
    else {
        switchWorker[name].off();
        item.querySelector('.assistantIcon').innerHTML = '';
    }
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
    if (watching.ads) {
        removeAdsElement();
    }
    if (watching.chapter.test(location.pathname)) {
        checkAria2Availability();
        if (watching.shortcut) {
            appendShortcuts();
        }
        images = document.querySelectorAll(watching.selector);
        if (images.length > 0) {
            extractImage();
        }
        else {
            notification('extract', 'fatal');
        }
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
    observer = setInterval(() => {
        if (images.length === urls.length + fail.length + logo.length) {
            warning.remove();
            downMenu.style.display = 'block';
            clearInterval(observer);
            if (fail.length === 0) {
                downMenu.style.display = 'block';
                notification('extract', 'done');
            }
            else {
                notification('extract', 'fail', '\n' + fail.map(item => { return 'page ' + (item + 1); } ));
            }
        }
    }, 250);
    images.forEach((element, index) => {
        var src = element.getAttribute(watching.lazyload) ?? element.getAttribute('src');
        var url = src.trim().replace(/^\/\//, 'http://');
        if (watching.logo && watching.logo.includes(url)) {
            logo.push(url);
            element.remove();
        }
        else if (watching.fallback && watching.fallback.includes(url)) {
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
    document.addEventListener('keydown', (event) => {
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            return;
        }
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
        element.style.left = (visual.width - element.offsetWidth) / 2 + 'px';
    });
}
