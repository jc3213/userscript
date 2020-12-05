// ==UserScript==
// @name            Raw Manga Assistant
// @namespace       https://github.com/jc3213/userscript
// @name:zh         漫画生肉网站助手
// @version         55
// @description     Assistant for raw manga online (LoveHeaven, MangaSum, BatoScan, Komiraw and etc.)
// @description:zh  漫画生肉网站 (LoveHeaven, MangaSum, BatoScan, Komiraw等) 助手脚本
// @author          jc3213
// @match           *://loveheaven.net/*
// @match           *://loveha.net/*
// @match           *://mangasum.com/*
// @match           *://mangant.com/*
// @match           *://manga1000.com/*
// @match           *://manga1001.com/*
// @match           *://batoscan.net/*
// @match           *://manga11.com/*
// @match           *://komiraw.com/*
// @connect         *
// @grant           GM_getValue
// @grant           GM_setValue
// @grant           GM_addValueChangeListener
// @grant           GM_xmlhttpRequest
// @grant           GM_webRequest
// @webRequest      {"selector": "*.adtrue.com/*", "action": "cancel"}
// @webRequest      {"selector": "*.bidgear.com/*", "action": "cancel"}
// @webRequest      {"selector": "*.googlesyndication.com/*", "action": "cancel"}
// @webRequest      {"selector": "*.googletagservices.com/*", "action": "cancel"}
// @webRequest      {"selector": "*.cloudfront.net/*", "action": "cancel"}
// @webRequest      {"selector": "*.bidadx.com/*", "action": "cancel"}
// @webRequest      {"selector": "*.adxpub.com/*", "action": "cancel"}
// @webRequest      {"selector": "*.vdo.ai/*", "action": "cancel"}
// @webRequest      {"selector": "*.vidazoo.com/*", "action": "cancel"}
// @webRequest      {"selector": "*simrubwan.com/*", "action": "cancel"}
// @webRequest      {"selector": "*dyecowwhy.com/*", "action": "cancel"}
// @webRequest      {"selector": "*mehebborc.com/*", "action": "cancel"}
// @webRequest      {"selector": "*alignclamstram.com/*", "action": "cancel"}
// @webRequest      {"selector": "*wowjogsot.com/*", "action": "cancel"}
// @webRequest      {"selector": "*.optad360.io/*", "action": "cancel"}
// @webRequest      {"selector": "*cogleapad.com/*", "action": "cancel"}
// @webRequest      {"selector": "*.vlitag.com/*", "action": "cancel"}
// @webRequest      {"selector": "*.your-notice.com/*", "action": "cancel"}
// @webRequest      {"selector": "*beiven.pw/*", "action": "cancel"}
// @webRequest      {"selector": "*runative-syndicate.com/*", "action": "cancel"}
// @webRequest      {"selector": "*.mgid.com/*", "action": "cancel"}
// @webRequest      {"selector": "*.exdynsrv.com/*", "action": "cancel"}
// @webRequest      {"selector": "*.exosrv.com/*", "action": "cancel"}
// @webRequest      {"selector": "*.adsco.re/*", "action": "cancel"}
// @webRequest      {"selector": "*engine.4dsply.com/*", "action": "cancel"}
// @webRequest      {"selector": "*.spolecznosci.net/*", "action": "cancel"}
// @webRequest      {"selector": "*prosumsit.com/*", "action": "cancel"}
// @webRequest      {"selector": "*.lzrikate.com/*", "action": "cancel"}
// @webRequest      {"selector": "*jiltlargosirk.com/*", "action": "cancel"}
// @webRequest      {"selector": "*eyefuneve.com/*", "action": "cancel"}
// @webRequest      {"selector": "*.popcash.net/*", "action": "cancel"}
// @webRequest      {"selector": "*.betteradsystem.com/*", "action": "cancel"}
// @webRequest      {"selector": "*.popads.net/*", "action": "cancel"}
// @webRequest      {"selector": "*.leadzutw.com/*", "action": "cancel"}
// @webRequest      {"selector": "*.cacafly.net/*", "action": "cancel"}
// @webRequest      {"selector": "*.ycxtpbfcsl.com/*", "action": "cancel"}
// @webRequest      {"selector": "*.clfvfumqqok.com/*", "action": "cancel"}
// @webRequest      {"selector": "*.akhlkkdrxwav.com/*", "action": "cancel"}
// @webRequest      {"selector": "*.pgqpibyycasfvl.com/*", "action": "cancel"}
// @webRequest      {"selector": "*.ntkjbweenycfq.com/*", "action": "cancel"}
// @webRequest      {"selector": "*badskates.com/*", "action": "cancel"}
// ==/UserScript==

'use strict';
// Initial variables
var urls = [];
var save = [];
var aria2 = [];
var fail = [];
var download;
var observer;
var images;
var watching;
var mousedown;
var moving = false;
var position = GM_getValue('position', {top: screen.availHeight * 0.3, left: screen.availWidth * 0.15});
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
        btop: {
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
        btop: {
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
    'loveheaven.net': {
        chapter: /\/read-(.+)-raw-chapter-(.+)\.html/,
        folder: () => {return chapter[1].replace(/-manga/, '') + '\\' + chapter[2]},
        selector: 'img.chapter-img',
        ads: ['h3', 'br:nth-child(-n+3)', 'div.float-ck', 'div.chapter-content center'],
        shortcut: {prev: 'a[class="btn btn-info prev"]', next: 'a[class="btn btn-info next"]'}
    },
    'mangasum.com': {
        chapter: /\/manga\/(.+)-raw\/chapter-(.+)\//,
        folder: () => {return chapter[1].replace(/-manga/, '') + '\\' + chapter[2]},
        selector: 'div[id^="page_"] > img',
        lazyload: 'data-original'
    },
    'batoscan.net': {
        chapter: /\/read-(.+)-raw-chapter-(.+)\.html/,
        folder: () => {return chapter[1].replace(/-manga/, '') + '\\' + chapter[2]},
        selector: 'img[class="chapter-img"]',
        lazyload: 'data-original',
    },
    'manga1000.com': {
        chapter: /%E3%80%90%E7%AC%AC(.+)%E8%A9%B1%E3%80%91(.+)-raw/,
        folder: () => {return decodeURI(chapter[2]) + '\\' + chapter[1]},
        selector: 'figure[class="wp-block-image"] > img',
        shortcut: 'div[class="linkchap"] > a'
    },
    'komiraw.com': {
        chapter: /\/([^\/]+)-raw-chap-(.+)/,
        folder: () => {return chapter.slice(1).join('\\')},
        selector: 'img[class^="chapter-img"]',
        shortcut: {prev: 'a[id="prev_chap"]', next: 'a[id="next_chap"]'}
    }
};
mangas['loveha.net'] = mangas['loveheaven.net'];
mangas['mangant.com'] = mangas['mangasum.com'];
mangas['manga1001.com'] = mangas['manga1000.com'];
mangas['manga11.com'] = mangas['komiraw.com'];
watching = mangas[location.host];

var css = document.createElement('style');
css.innerHTML = '.menuOverlay {position: fixed; z-index: 999999999; background-color: white;}\
.menuContainer {min-width: fit-content; max-width: 330px; border: 1px ridge darkblue; font-size: 14px;}\
.assistantIcon {width: 30px; display: inline-block; text-align: center}\
.assistantMenu {color: black; width: 190px; padding: 10px; height: 40px; display: block; user-select: none;}\
.assistantMenu:hover {background-color: darkviolet; color: white; cursor: default;}\
.menuAria2Item {width: 300px; height: 42px; overflow: hidden;}\
.menuAria2Item:focus {background-color: darkblue; color: white;}'
document.head.appendChild(css);

var button = document.createElement('span');
button.id = 'assistant_button';
button.innerHTML = '🖱️';
button.className = 'menuOverlay menuContainer';
button.draggable = true;
button.style.cssText = 'top: ' + position.top + 'px; left: ' + position.left + 'px; text-align: center; padding-top: 10px; width: 42px; height: 42px;';
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
    GM_setValue('position', position);
});
GM_addValueChangeListener('position', (name, old_value, new_value, remote) => movingIconAndContainer(new_value));
function movingIconAndContainer(position) {
    button.style.top = position.top + 'px';
    button.style.left = position.left + 'px';
    container.style.top = button.offsetTop + 'px';
    container.style.left = button.offsetLeft + button.offsetWidth + 'px';
}
document.addEventListener('click', (event) => {
    if (event.target.id === 'assistant_aria2_server' || event.target.id === 'assistant_aria2_secret') {
        return;
    }
    if (event.target.id === 'assistant_button') {
        if (container.style.display === 'none') {
            container.style.display = 'block';
        }
        else {
            container.style.display = 'none';
        }
    }
    else {
        container.style.display = 'none';
    }
});

// Create menuitems
var downBox = document.createElement('div');
downBox.id = 'assistant_down';
downBox.className = 'menuContainer';
downBox.style.display = 'none';
container.appendChild(downBox);

var downMenu = {
    save: {
        icon: '💾',
        click: () => {
            download = [];
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
                        download.push(index);
                        if (download.length === images.length) {
                            notification('save', 'done');
                            download = [];
                        }
                    },
                    onerror: () => notification('save', 'error', item[0])
                });
            });
        }
    },
    copy: {
        icon: '📄',
        click: () => {
            navigator.clipboard.writeText(urls.join('\n'));
            notification('copy', 'done');
        }
    },
    aria2: {
        icon: '🖅',
        click: () => {
            downMenu.aria2.handler({
                method: 'aria2.getGlobalOption'
            }, (details) => {
                if (details.status === 200) {
                    if (details.response.includes('Unauthorized')) {
                        notification('aria2', 'nokey');
                    }
                    else {
                        var dir = details.response.match(/"dir":"([^"]+)"/)[1] + '\\' + watching.folder();
                        var aria2 = save.map((item, index) => downMenu.aria2.handler({
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
        },
        handler: (property, onload, onerror) => {
            GM_xmlhttpRequest({
                url: document.getElementById('assistant_aria2_server').value,
                method: 'POST',
                data: JSON.stringify({
                    id: '',
                    jsonrpc: '2.0',
                    method: property.method,
                    params: ['token:' + document.getElementById('assistant_aria2_secret').value].concat(property.options)
                }),
                onload: onload,
                onerror: onerror
            });
        },
        event: {
            contextmenu: (event) => {
                event.preventDefault();
                if (aria2Box.style.display === 'block') {
                    aria2Box.style.display = 'none';
                }
                else {
                    aria2Box.style.display = 'block';
                }
            }
        }
    }
};
Object.entries(downMenu).forEach((item) => downBox.appendChild(click_menu_item(...item)));

var clickBox = document.createElement('div');
clickBox.id = 'assistant_click';
clickBox.className = 'menuContainer';
container.appendChild(clickBox);

var clickMenu = {
    btop: {
        icon: '⬆️',
        click: () => {
            document.documentElement.scrollTop = 0;
        }
    }
};
Object.entries(clickMenu).forEach((item) => clickBox.appendChild(click_menu_item(...item)));

var switchBox = document.createElement('div');
switchBox.id = 'assistant_switch';
switchBox.className = 'menuContainer';
container.appendChild(switchBox);

var switchMenu = {
    lazy: {
        value: GM_getValue('lazy', false),
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
    },
    menu: {
        value: GM_getValue('menu', true),
        on: () => {
            button.style.display = 'none';
            document.addEventListener('contextmenu', switchMenu.menu.handler);
        },
        off: () => {
            document.removeEventListener('contextmenu', switchMenu.menu.handler);
            button.style.display = 'block';
            container.style.top = button.offsetTop + 'px';
            container.style.left = button.offsetLeft + button.offsetWidth + 'px';
        },
        handler: (event) => {
            if (event.target.id === 'assistant_menu_aria2' || event.shiftKey) {
                if (container.style.display = 'block') {
                    container.style.display = 'none';
                }
                return;
            }
            event.preventDefault();
            container.style.top = event.clientY + 'px';
            container.style.left = event.clientX + 'px';
            container.style.display = 'block';
        }
    },
}
Object.entries(switchMenu).forEach((item) => switchBox.appendChild(switch_menu_item(...item)));

var aria2Box = document.createElement('div');
aria2Box.id = 'assistant_aria2';
aria2Box.className = 'menuContainer';
aria2Box.style.cssText = 'position: absolute; display: none; top: ' + Object.keys(downMenu).indexOf('aria2') * 40 + 'px; left: 190px;';
container.appendChild(aria2Box);

var aria2Menu = {
    // Aria2 menu items
    server: {
        value: GM_getValue('server', 'http://localhost:6800/jsonrpc')
    },
    secret: {
        type: 'password',
        value: GM_getValue('secret', '')
    }
};
Object.entries(aria2Menu).forEach((item) => aria2Box.appendChild(input_menu_item(...item)));

// UI maker callback handler
function iconic_menu_item(name, props) {
    var menu = document.createElement('span');
    menu.id = 'assistant_menu_' + name;
    menu.className = 'assistantMenu';
    var icon = document.createElement('span');
    icon.className = 'assistantIcon';
    icon.innerHTML = props.icon || '';
    var label = document.createTextNode(i18n[name].label || name);
    menu.appendChild(icon);
    menu.appendChild(label);
    return menu;
}
function click_menu_item(name, props) {
    var menu = iconic_menu_item(name, props);
    menu.addEventListener('click', props.click);
    if (props.event) {
        Object.entries(props.event).forEach((item) => menu.addEventListener(...item));
    }
    return menu;
}
function switch_menu_item(name, props) {
    var menu = iconic_menu_item(name, props);
    menu.value = props.value;
    menu.addEventListener('click', () => GM_setValue(name, !menu.value));
    switch_item_handler(menu, props);
    GM_addValueChangeListener(name, (name, old_value, new_value, remote) => {
        menu.value = new_value;
        switch_item_handler(menu, props);
    });
    return menu;
}
function switch_item_handler(menu, props) {
    if (menu.value) {
        menu.firstElementChild.innerHTML = '✅';
        props.on();
    }
    else {
        menu.firstElementChild.innerHTML = '';
        props.off();
    }
}
function input_menu_item(name, props) {
    var menu = document.createElement('input');
    menu.id = 'assistant_aria2_' + name;
    menu.className = 'assistantMenu menuAria2Item';
    menu.value = props.value;
    menu.setAttribute('type', props.type);
    menu.addEventListener('change', (event) => GM_setValue(name, event.target.value));
    menu.addEventListener('focus', (event) => event.target.setAttribute('type', 'text'));
    menu.addEventListener('blur', (event) => event.target.setAttribute('type', props.type));
    GM_addValueChangeListener(name, (name, old_value, new_value, remote) => {
        menu.value = new_value;
    });
    return menu;
}

// Extract images data
if (watching) {
    var chapter = location.pathname.match(watching.chapter);
    if (chapter) {
        images = document.querySelectorAll(watching.selector);
        removeMultipleElement(watching.ads);
        extractImage(watching.lazyload);
        shortcuts(watching.shortcut);
    }
}

function removeMultipleElement(selector, node) {
    node = node || document;
    Array.isArray(selector) ? selector.forEach(item => removeElement(item)) : removeElement(selector);

    function removeElement(sel) {
        node.querySelectorAll(sel).forEach(item => item.remove());
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
                document.getElementById('assistant_down').style.display = 'block';
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
        storeImageInfo(index, url, name, ext);
    }
    else {
        GM_xmlhttpRequest({
            url, url,
            method: 'HEAD',
            onload: (details) => {
                ext = details.responseHeaders.match(/(png|jpg|jpeg|webp)/);
                storeImageInfo(index, url, name, ext);
            },
            onerror: () => {
                fail.push(url);
            }
        });
    }
}
function storeImageInfo(index, url, name, ext) {
    if (ext) {
        name += '.' + ext[0];
    }
    urls.push(url);
    save.push([url, name]);
}

// Append shortcut event
function shortcuts(shortcut) {
    if (typeof shortcut === 'string') {
        var prev = document.querySelectorAll(shortcut)[0];
        var next = document.querySelectorAll(shortcut)[1];
    }
    else if (Array.isArray(shortcut)) {
        prev = document.querySelector(shortcut[0]);
        next = document.querySelector(shortcut[1]);
    }
    else if (typeof shortcut === 'object') {
        prev = document.querySelector(shortcut.prev);
        next = document.querySelector(shortcut.next);
    }
    document.addEventListener('keydown', (event) => {
        shortcut_event_handler(event, 'ArrowLeft', prev);
        shortcut_event_handler(event, 'ArrowRight', next);
    });
}
function shortcut_event_handler(event, key, element) {
    if (!element || element.hasAttribute('disabled')) {
        return;
    }
    if (typeof key === 'string' && event.key === key ||
        typeof key === 'number' && event.keyCode === key) {
        element.click();
    }
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
        element.style.left = (screen.availWidth - element.offsetWidth) / 2 + 'px';
    });
}
