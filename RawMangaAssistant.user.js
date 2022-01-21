// ==UserScript==
// @name            Raw Manga Assistant
// @namespace       https://github.com/jc3213/userscript
// @name:zh         漫画生肉网站助手
// @version         6.11
// @description     Assistant for raw manga online (LMangaToro, HakaRaw and etc.)
// @description:zh  漫画生肉网站 (MangaToro, HakaRaw 等) 助手脚本
// @author          jc3213
// @match           *://ja.mangatoro.com/*
// @match           *://mikaraw.com/*
// @match           *://klmag.net/*
// @match           *://rawdevart.com/*
// @match           *://manga1000.com/*
// @match           *://manga1001.com/*
// @match           *://weloma.art/*
// @match           *://weloma.net/*
// @match           *://mangameta.com/*
// @connect         *
// @require         https://raw.githubusercontent.com/jc3213/userscript/main/libs/aria2request.js#sha256-m8uu3xenbReyQ3OmOyoX5Nfsu/r5B4Vg4N2akZgd8Tk=
// @require         https://raw.githubusercontent.com/jc3213/userscript/main/libs/dragndrop.js#sha256-NkLbP8qGlQ6SEBaf0HeiUVT+5/kXjyJYaSwd28Dj9zA=
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
//                  klmag.net
// @webRequest      {"selector": "*.wpadmngr.com/*", "action": "cancel"}
// @webRequest      {"selector": "*cynicaugural.com/*", "action": "cancel"}
//                  weloma.art / weloma.net / klmag.net
// @webRequest      {"selector": "*.pubfuture.com/*", "action": "cancel"}
// ==/UserScript==

'use strict';
// Initial variables
var urls = [];
var fail = [];
var logo = [];
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
            done: 'All %n% image urls <b>have been sent to Aria2 RPC</b>',
            error: 'JSONRPC: Failed to send request'
        },
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
            done: 'A total of %n% image urls <b>have been extracted</b>',
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
            done: '全部 %n% 图像链接已发送至<b>Aria2 RPC</b>',
            error: 'JSONRPC: 请求错误'
        },
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
    'klmag.net': {
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

function longDecimalNumber(input, length = 3) {
    var number = isNaN(input) ? input : input.toString();
    var float = number.indexOf('.');
    return (10 ** length + number).slice(0 - length - (float === -1 ? 0 : number.length - float));
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
    return title.replace(/[:\?\"\']/g, '_');
}

// Create UI
var css = document.createElement('style');
css.innerHTML = '#assistant_button, #assistant_container, #assistant_caution {background-color: #fff; color: #000; position: fixed; z-index: 999999999;}\
#assistant_button {text-align: center; line-height: 42px; width: 42px !important; height: 42px !important; border: 1px solid darkviolet; top: ' + options.top + 'px; left: ' + options.left + 'px;}\
#assistant_container {top: ' + options.top + 'px; left: ' + (options.left + 42) + 'px; display: none;}\
#assistant_container > * {background-color: #fff; width: 220px; border: 1px ridge darkblue; font-size: 14px;}\
#assistant_container > *:nth-child(-n+2), #assistant_container data {display: none;}\
#assistant_container.extract > *:nth-child(-n+2), #assistant_container .checked data {display: block;}\
#assistant_container > * > *, #assistant_caution {line-height: 40px; height: 40px; user-select: none; display: grid; grid-template-columns: 40px auto;}\
#assistant_container > * > * > *:first-child {text-align: center;}\
#assistant_caution {font-size: 16px; border: 1px ridge darkviolet; border-radius: 5px; height: 60px; line-height: 60px; text-align: center;}\
#assistant_caution > *:last-child {text-align: left; width: fit-content; padding-right: 10px;}\
#assistant_button:hover, #assistant_container > * > *:hover {background-color: darkviolet !important; color: white !important;}';

var button = document.createElement('span');
button.id = 'assistant_button';
button.innerHTML = '🖱️';
button.addEventListener('click', event => {
    container.style.display = 'block';
});
document.addEventListener('click', event => {
    container.style.display = button.contains(event.target) ? 'block' : 'none';
});

var container = document.createElement('div');
container.id = 'assistant_container';
container.innerHTML = '<div><div id="download"><span>💾</span><span>' + i18n.save.label + '</span></div>\
<div id="clipboard"><span>📄</span><span>' + i18n.copy.label + '</span></div></div>\
<div><div id="aria2download"><span>🖅</span><span>' + i18n.aria2.label + '</span></div></div>\
<div><div id="scrolltop"><span>⬆️</span><span>' + i18n.gotop.label + '</div></div>';
document.body.append(button, container, css);

// Draggable button and menu
dragndrop({node: button}, (top, left) => {
    container.style.top = top + 'px';
    container.style.left = left + button.offsetWidth + 'px';
    GM_setValue('options', {...options, top, left});
});

container.querySelector('#download').addEventListener('click', event => {
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
container.querySelector('#clipboard').addEventListener('click', event => {
    navigator.clipboard.writeText(urls.join('\n'));
    notification('copy', 'done');
});
container.querySelector('#scrolltop').addEventListener('click', event => {
    document.documentElement.scrollTop = 0;
});

// Aria2 Menuitems
container.querySelector('#aria2download').addEventListener('click', event => {
    var json;
    var folder;
    var request = () => {
        aria2.send({method: 'aria2.getGlobalOption'}).then(({dir}) => {
            folder = folder ?? dir + extractMangaTitle();
            json = json ?? urls.map((url, index) => ({method: 'aria2.addUri', params: [[url], {out: longDecimalNumber(index) + '.' + url.match(/(png|jpg|jpeg|webp)/)[0], dir: folder, header: aria2Headers}]}));
            aria2.send(json).then(result => notification('aria2', 'done'));
        }).catch(error => {
            alert(i18n.aria2.error);
            aria2.jsonrpc = prompt('Aria2 JSONRPC URI', aria2.jsonrpc) ?? aria2.jsonrpc;
            aria2.secret = prompt('Aria2 Secret Token', aria2.secret) ?? aria2.secret;
            GM_setValue('aria2', aria2);
        });
    }
    request();
});

// Switchable Menus
var switchMenu = document.createElement('div');
[
    {
        name: 'menu',
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
].forEach(({name, on, off}) => {
    var menu = document.createElement('div');
    menu.setAttribute('name', name);
    menu.innerHTML = '<span><data>✅</data></span><span>' + i18n.menu.label + '</span></div>';
    menu.addEventListener('click', event => {
        options[name] = options[name] === 'on' ? 'off' : 'on';
        switchHandler(menu, name, on, off);
        GM_setValue('options', options);
    });
    switchHandler(menu, name, on, off);
    switchMenu.appendChild(menu);
});
container.appendChild(switchMenu);

function switchHandler(menu, name, on, off) {
    if (options[name] === 'on') {
        on();
        menu.classList.add('checked');
    }
    else {
        off();
        menu.classList.remove('checked');
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

// Extract images data
if (watching) {
    document.body.removeAttribute('id');
    if (watching.ads) {
        removeAdsElement();
    }
    images = document.querySelectorAll(watching.image);
    if (images.length > 0) {
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
            clearInterval(observer);
            if (fail.length === 0) {
                container.classList.add('extract');
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
        var index = ['ArrowLeft', 'ArrowRight'].indexOf(event.key);
        var shortcut = button[index];
        shortcut && shortcut.click();
    });
}

// Notifications
function notification(action, status, url) {
    var warn = i18n[action][status] ?? i18n[action];
    var html = '<span>⚠️</span><span>' + warn.replace('%n%', '<i><u>' + images.length + (url ? '<p>' + url + '</p>' : '') + '</u></i>') + '</span>';
    var caution = document.createElement('div');
    caution.id = 'assistant_caution';
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
