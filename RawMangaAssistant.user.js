// ==UserScript==
// @name            Raw Manga Assistant
// @namespace       https://github.com/jc3213/userscript
// @name:zh         漫画生肉网站助手
// @version         6.5
// @description     Assistant for raw manga online (LMangaToro, HakaRaw and etc.)
// @description:zh  漫画生肉网站 (MangaToro, HakaRaw 等) 助手脚本
// @author          jc3213
// @match           *://ja.mangatoro.com/*
// @match           *://mikaraw.com/*
// @match           *://klmanga.com/*
// @match           *://rawdevart.com/*
// @match           *://manga1000.com/*
// @match           *://manga1001.com/*
// @match           *://weloma.art/*
// @match           *://weloma.net/*
// @match           *://mangameta.com/*
// @connect         *
// @require         https://raw.githubusercontent.com/jc3213/userscript/main/libs/aria2request.js#sha256-wzomqXdCxnFpRTaVKPS+BWGKaScbF+PhAjX+EMxOLBo=
// @require         https://raw.githubusercontent.com/jc3213/userscript/main/libs/dragndrop.js#sha256-bppXwb8qd91C8TSgkTTVB2f7bzRmRWPPPO1Sf1OpEb4=
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
//                  manga1000.com / manga1001.com / mikaraw.com
// @webRequest      {"selector": "*.realsrv.com/*", "action": "cancel"}
//                  mikaraw.com
// @webRequest      {"selector": "*puturebraving.com/*", "action": "cancel"}
// @webRequest      {"selector": "*.4dsply.com/*", "action": "cancel"}
//                  rawdevart.com
// @webRequest      {"selector": "*.vdo.ai/*", "action": "cancel"}
//                  manga1000.com / manga1001.com
// @webRequest      {"selector": "*static.manga10000.com/popup1001.js*", "action": "cancel"}
// @webRequest      {"selector": "*downysewersettle.com/*", "action": "cancel"}
// @webRequest      {"selector": "*.exosrv.com/*", "action": "cancel"}
// @webRequest      {"selector": "*.bidgear.com/*", "action": "cancel"}
//                  klmanga.com
// @webRequest      {"selector": "*.adtcdn.com/*", "action": "cancel"}
// @webRequest      {"selector": "*.greeter.me/*", "action": "cancel"}
// @webRequest      {"selector": "*.modoro360.com/*", "action": "cancel"}
//                  weloma.art / weloma.net
// @webRequest      {"selector": "*.pubfuture.com/*", "action": "cancel"}
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
aria2 = {...aria2, ...GM_getValue('aria2', {jsonrpc: 'http://localhost:6800/jsonrpc', secret: ''})};
var options = GM_getValue('options', {menu: 'on', top: 300, left: 150});
var offset;
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
            error: 'Aria2 RPC <b>failed to send request</b>'
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
            error: '<b>Can\'t be extracted</b> image extension'
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
            error: 'Aria2 RPC <b>请求发生错误</b>'
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
            error: '<b>无法解析</b>图像后缀'
        }
    }
};
var i18n = message[navigator.language] ?? message['en-US'];

// Supported sites
var manga = {
    'ja.mangatoro.com': {
        image: 'div.page-chapter > img',
        lazyload: 'data-original',
        title: {reg: /^(.+)\schap\s([^\s]+)/, sel: 'div.page-chapter > img', attr: 'alt', tl: 1, ch: 2}
    },
    'mikaraw.com': {
        image: 'div.chapter-c > img',
        lazyload: 'data-src',
        title: [{reg: /^([^(])+/, sel: '#header-bot li:nth-child(2) a', attr: 'title', nl: 0}, {reg: /([^\s]+)$/, sel: '#header-bot li:nth-child(3) a', attr: 'title', nl: 0}],
        shortcut: ['#prev_chap', '#next_chap'],
        ads: ['div[style*="z-index: 300000;"]', 'div[style*="float: left;"]']
    },
    'klmanga.com': {
        image: 'img.chapter-img',
        lazyload: 'data-aload',
        title: {reg: /^(.+)\sChapter\s([^\s]+)/, sel: 'li.current > a', attr: 'title', tl: 1, ch: 2},
        shortcut: ['a.btn.btn-info.prev', 'a.btn.btn-info.next'],
        ads: ['#id-custom_banner', 'div.float-ck']
    },
    'rawdevart.com': {
        image: '#img-container > div > img',
        lazyload: 'data-src',
        title: {reg: /^Chapter\s([^\s]+)\s\|\s(.+)\sPage/, sel: '#img-container > div > img', attr: 'alt', tl: 2, ch: 1}
    },
    'manga1000.com': {
        image: 'img.aligncenter',
        title: {reg: /^(.+)\s-\sRaw\s【第(.+)話】/, sel: 'img.aligncenter', attr: 'alt', tl: 1, ch: 2},
        shortcut: 'div.linkchap > a'
    },
    'weloma.art': {
        image: 'img.chapter-img',
        lazyload: 'data-srcset',
        title: {reg: /^(.+)(!?\s-\sRAW)?\sChapter\s([^\s]+)/, sel: 'img.chapter-img', attr: 'alt', tl: 1, ch: 3},
        shortcut: ['a.btn.btn-info.prev', 'a.btn.btn-info.next']
    },
    'mangameta.com': {
        image: 'div.chapter-c > img',
        title: {reg: /^(.+)(!?\s-\sRAW\s-)\sChapter\s([^\s]+)/, sel: 'a.chapter-title', attr: 'title', tl: 1, ch: 3},
        shortcut: 'div.linkchap > a'
    }
};
manga['manga1001.com'] = manga['manga1000.com'];
manga['weloma.net'] = manga['weloma.art'];
watching = manga[location.host];

function longDecimalNumber(number, length = 3) {
    number = number.toString();
    var float = number.length - number.split(/[\._-]/)[0].length;
    return (10 ** length + number).slice(0 - length - float);
}

function extractMangaTitle(title = '') {
    var symbol = navigator.platform === 'Win32' ? '\\' : '/';
    if (Array.isArray(watching.title)) {
        watching.title.forEach(item => { title += symbol + watching.title[0].reg.exec(document.querySelector(watching.title[0].sel).getAttribute(watching.title[0].attr))[watching.title[0].nl]; });
    }
    else {
        var result = watching.title.reg.exec(document.querySelector(watching.title.sel).getAttribute(watching.title.attr));
        title += symbol + result[watching.title.tl] + symbol + result[watching.title.ch];
    }
    return title;
}

// Create UI
var css = document.createElement('style');
css.innerHTML = '.menuOverlay {background-color: #fff; position: fixed; z-index: 999999999;}\
.menuContainer {background-color: #fff; min-width: fit-content; max-width: 330px; border: 1px ridge darkblue; font-size: 14px;}\
.assistantMenu {color: black; width: 190px; padding: 10px; height: 40px; display: block; user-select: none;}\
.assistantMenu:hover {background-color: darkviolet !important; color: white; cursor: default;}\
.assistantIcon {width: 30px; display: inline-block; text-align: center}';
document.body.appendChild(css);

var button = document.createElement('span');
button.id = 'assistant_button';
button.innerHTML = '🖱️';
button.className = 'menuOverlay assistantMenu';
button.style.cssText = 'top: ' + options.top + 'px; left: ' + options.left + 'px; text-align: center; vertical-align: middle; width: 42px; height: 42px; border: 1px solid darkviolet;';
button.addEventListener('click', event => {
    container.style.display = 'block';
});
var container = document.createElement('div');
container.id = 'assistant_container';
container.className = 'menuOverlay';
container.style.cssText = 'top: ' + options.top + 'px; left: ' + (options.left + button.offsetWidth) + 'px; display: none';
document.body.append(button, container);

// Draggable button and menu
dragndrop(button);
button.addEventListener('dragend', event => {
    options.top = button.offsetTop;
    options.left = button.offsetLeft;
    container.style.top = button.offsetTop + 'px';
    container.style.left = button.offsetLeft + button.offsetWidth + 'px';
    GM_setValue('options', options);
});
document.addEventListener('click', event => {
    container.style.display = button.contains(event.target) ? 'block' : 'none';
});

// Primary menus
var downMenu = document.createElement('div');
downMenu.innerHTML = '<div id="download" class="assistantMenu"><span class="assistantIcon">💾</span>' + i18n.save.label + '</span></div>\
<div id="clipboard" class="assistantMenu"><span class="assistantIcon">📄</span>' + i18n.copy.label + '</span></div>\
<div id="aria2download" class="assistantMenu"><span class="assistantIcon">🖅</span>' + i18n.aria2.label + '</span></div>\
<div id="aria2option" class="assistantMenu" id="aria2Option"><span class="assistantIcon">⚙️</span>' + i18n.aria2.option + '</div>';
downMenu.className = 'menuContainer';
downMenu.style.display = 'none';
container.appendChild(downMenu);
downMenu.querySelector('#download').addEventListener('click', event => {
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
})
downMenu.querySelector('#clipboard').addEventListener('click', event => {
    navigator.clipboard.writeText(urls.join('\n'));
    notification('copy', 'done');
});
// Aria2 Menuitems
downMenu.querySelector('#aria2download').addEventListener('click', event => {
    urls.forEach((url, index) => aria2.send('aria2.addUri', [[url], {out: longDecimalNumber(index) + '.' + url.match(/(png|jpg|jpeg|webp)/)[0], dir: folder, header: aria2Headers}]).then(result => {
        if (index === urls.length - 1) {
            notification('aria2', 'done');
        }
    }));
});
downMenu.querySelector('#aria2option').addEventListener('click', event => {
    aria2.jsonrpc = prompt('Aria2 JSONRPC URI', aria2.jsonrpc) ?? aria2.jsonrpc;
    aria2.secret = prompt('Aria2 Secret Token', aria2.secret) ?? aria2.secret;
    GM_setValue('aria2', aria2);
    checkAria2Availability();
});

function checkAria2Availability() {
    aria2.send('aria2.getGlobalOption').then(result => {
        folder = result.dir + extractMangaTitle();
        downMenu.querySelector('#aria2download').style.display = 'block';
    }).catch(error => {
        notification('aria2', 'error');
        downMenu.querySelector('#aria2download').style.display = 'none';
    });
}

// Secondary menus
var clickMenu = document.createElement('div');
clickMenu.className = 'menuContainer';
clickMenu.innerHTML = '<div id="scrolltop" class="assistantMenu"><span class="assistantIcon">⬆️</span>' + i18n.gotop.label + '</div>';
clickMenu.querySelector('#scrolltop').addEventListener('click', event => {
    document.documentElement.scrollTop = 0;
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
switchMenu.addEventListener('click', event => {
    var name = event.target.getAttribute('name');
    options[name] = options[name] === 'on' ? 'off' : 'on';
    switchHandler(event.target);
    GM_setValue('options', options);
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
    document.body.removeAttribute('id');
    if (watching.ads) {
        removeAdsElement();
    }
    images = document.querySelectorAll(watching.image);
    if (images.length > 0) {
        checkAria2Availability();
        extractImage();
        if (watching.shortcut) {
            appendShortcuts();
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
    document.addEventListener('keydown', event => {
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
        element.style.left = (document.documentElement.clientWidth - element.offsetWidth) / 2 + 'px';
    });
}
