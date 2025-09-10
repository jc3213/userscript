// ==UserScript==
// @name            Bilibili Video Downloader
// @name:zh         哔哩哔哩视频下载器
// @namespace       https://github.com/jc3213/userscript
// @version         1.9.2
// @description     Download videos from Bilibili (No Bangumi)
// @description:zh  下载哔哩哔哩视频（不支持番剧）
// @author          jc3213
// @match           *://www.bilibili.com/video/*
// @match           *://www.bilibili.com/v/*
// @grant           GM_download
// @run-at          document-idle
// ==/UserScript==

let { autowide = '0', videocodec = '0' } = localStorage;
let bvWatch;
let bvTitle;
let bvOpen = true;
let history = {};
let archive;
let format = {
    '30280': {text: '音频 高码率', ext: '.192k.m4a'},
    '30232': {text: '音频 中码率', ext: '.128k.m4a'},
    '30216': {text: '音频 低码率', ext: '.64k.m4a'},
    '127': {text: '8K 超高清', ext: '.8k.mp4'},
    '125': {text: '4K 超清+', ext: '.4k+.mp4'},
    '120': {text: '4K 超清', ext: '.4k.mp4'},
    '116': {text: '1080P 60帧', ext: '.1080f60.mp4'},
    '112': {text: '1080P 高码率', ext: '.1080+.mp4'},
    '80': {text: '1080P 高清', ext: '.1080.mp4'},
    '74': {text: '720P 60帧', ext: '.720f60.mp4'},
    '64': {text: '720P 高清', ext: '.720.mp4'},
    '32': {text: '480P 清晰', ext: '.480.mp4'},
    '16': {text: '360P 流畅', ext: '.360.mp4'},
    '15': {text: '360P 流畅', ext: '.360-.mp4'},
    'avc1': {title: '视频编码: H.264', alt: 'h264', type: 'video'},
    'hvc1': {title: '视频编码: HEVC 增强', alt: 'h265', type: 'video'},
    'hev1': {title: '视频编码: HEVC', alt: 'h265', type: 'video'},
    'av01': {title: '视频编码：AV1', alt: 'av1', type: 'video'},
    'mp4a': {title: '音频编码: AAC', alt: 'aac', type: 'audio'}
};

let bvHandler = {
    'video': { key: 'data', menu: 'div.video-toolbar-left', widebtn: 'div.bpx-player-ctrl-wide', widestat: 'bpx-state-entered', active: 'li.bpx-state-multi-active-item', fetch: () => {
        let _cid_ = document.querySelector('li.bpx-state-multi-active-item')?.getAttribute('data-cid');
        let { title, aid, cid, pic } = document.defaultView.__INITIAL_STATE__.videoData;
        biliVideoTitle(title);
        biliVideoThumb(pic);
        biliVideoGetter(cid, 'x/player/playurl?avid=' + aid + '&cid=' + (_cid_ ?? cid));
    } },
    'v': { key: 'data', offset: 'left: -300px;', menu: 'div.select-type > ul.type', widebtn: 'div.bilibili-player-video-btn-widescreen', widestat: 'closed', active: 'div.select-type > ul.type > li.active', fetch: () => {
        let { aid, cid } = document.defaultView;
        biliVideoTitle(document.querySelector('div.match-info-title').textContent);
        biliVideoGetter(cid, 'x/player/playurl?avid=' + aid + '&cid=' + cid);
    } },
    'default': { key: 'result', offset: 'left: -400px; top: -6px;', menu: 'div.toolbar > div.toolbar-left', widebtn: 'div.bpx-player-ctrl-wide', widestat: 'bpx-state-entered', active: '[class*="numberListItem_select"]', fetch: () => {
        let { name, thumbnailUrl } = JSON.parse(document.head.querySelector('script[type]').textContent).itemListElement[0];
        let id = document.defaultView.__playinfo__.result.play_view_business_info.episode_info.ep_id;
        biliVideoTitle(name);
        biliVideoThumb(thumbnailUrl[0]);
        biliVideoGetter(id, `pgc/player/web/playurl?ep_id=${id}`);
    } }
};
let bvCode = location.pathname.match(/^\/(v(?:ideo)?)\//)?.[1];
let bvMenu = bvHandler[bvCode] ?? bvHandler.default;

window.addEventListener('play', async function biliVideoToolbar() {
    let wide = await PromiseSelector(bvMenu.widebtn);
    let menu = await PromiseSelector(bvMenu.menu);
    if (!wide.classList.contains(bvMenu.widestat) && localStorage.autowide === '1' ) {
        wide.click();
    }
    menu.append(mainPane, cssPane);
    window.removeEventListener('play', biliVideoToolbar);
}, true);

let menuItem = document.createElement('div');
menuItem.className = 'bili_video_button';

let mainPane = document.createElement('div');
mainPane.id = 'bili_video_main';
mainPane.innerHTML = `
<div id="bili_video_menu">
    <div id="bili_video_optbtn" class="bili_video_button">设置</div>
    <div id="bili_video_anabtn" class="bili_video_button">解析</div>
</div>
<div id="bili_video_options" class="bili_video_pane bili_video_hidden">
    <h4>自动宽屏</h4>
    <select name="autowide">
        <option value="0">关闭</option>
        <option value="1">启用</option>
    </select>
    <h4>编码格式</h4>
    <select name="videocodec">
        <option value="0">H.264</option>
        <option value="1">HEVC</option>
        <option value="2">AV-1</option>
    </select>
</div>
<div id="bili_video_analyse" class="bili_video_pane bili_video_result bili_video_hidden"></div>
`;

let [menuPane, optionsPane, analysePane] = mainPane.children;
let codecHandlers = {
    '0': 'bili_video_l264',
    '1': 'bili_video_l265',
    '2': 'bili_video_lav1'
}

function biliVideoTitle(name) {
    let multi = document.querySelector(bvMenu.active)?.textContent?.trim();
    name = multi ? `${name}-${multi}` : name;
    bvTitle = name.trim().replace(/[\/\\:*?"<>|\s\r\n]/g, '_');
}

function biliVideoThumb(url) {
    let thumb = menuItem.cloneNode(true);
    thumb.classList.add('bili_video_thumb');
    thumb.textContent = '视频封面';
    thumb.url = url.replace(/^(https?:)?\/\//, 'https://').replace(/@.+/, '');
    thumb.file = bvTitle + url.slice(url.lastIndexOf('.'));
    analysePane.appendChild(thumb);
}

function biliVideoItems(json) {
    let { id, codecs, baseUrl } = json;
    let codec = codecs.slice(0, codecs.indexOf('.'));
    let { text, ext } = format[id];
    let { title, alt, type } = format[codec];
    let menu = menuItem.cloneNode(true);
    menu.classList.add('bili_video_' + type, 'bili_video_' + alt);
    menu.textContent = text;
    menu.title = title;
    menu.url = baseUrl;
    menu.file = bvTitle + ext;
    analysePane.appendChild(menu);
}

function biliVideoExtractor(json) {
    json?.video?.forEach(biliVideoItems);
    json?.audio?.forEach(biliVideoItems);
}

async function biliVideoGetter(vid, playurl) {
    if (history[vid]) {
        analysePane.innerHTML = '';
        analysePane.append(...history[vid]);
    } else {
        let response = await fetch('https://api.bilibili.com/' + playurl + '&fnval=4050', {credentials: 'include'});
        let json = await response.json();
        biliVideoExtractor(json[bvMenu.key]?.dash);
        history[vid] = analysePane.children;
    }
    analysePane.className = analysePane.className.replace(/\s?bili_video_l\w+/, '') + ' ' + codecHandlers[videocodec];
}

function biliVideoOptions() {
    optionsPane.classList.toggle('bili_video_hidden');
    analysePane.classList.add('bili_video_hidden');
}

function biliVideoAnalyze() {
    optionsPane.classList.add('bili_video_hidden');
    analysePane.classList.toggle('bili_video_hidden');
    if (bvOpen || videocodec !== localStorage.videocodec) {
        bvOpen = false;
        videocodec = localStorage.videocodec;
        analysePane.innerHTML = '';
        bvMenu.fetch();
    }
}

let menuEvent = {
    'bili_video_optbtn': biliVideoOptions,
    'bili_video_anabtn': biliVideoAnalyze
};

menuPane.addEventListener('click', (event) => {
    let menu = menuEvent[event.target.id];
    menu?.();
});

optionsPane.addEventListener('change', (event) => {
    localStorage[event.target.name] = event.target.value;
});

analysePane.addEventListener('click', (event) => {
    let {altKey, target: {url, file}} = event;
    if (url && file) {
        if (altKey) {
            var urls = [{url, options: {out: file, referer: location.href} }];
            window.postMessage({aria2c: 'aria2c_download', params: urls});
        }
        else {
            GM_download({url, responseType: 'blob', headers: {referer: location.href}, name: file});
        }
    }
});

let [, optionWide,, optionCodec] = optionsPane.children;
optionWide.value = autowide;
optionCodec.value = videocodec;

let cssPane = document.createElement('style');
cssPane.textContent = `
#bili_video_main {font-size: 16px; position: relative; text-align: center; padding-right: 5px; line-height: 28px; z-index: 9999999; ${bvMenu.offset ?? ''}}
#bili_video_menu {display: flex; gap: 5px;}
.bili_video_button {border: outset 1px #000; padding: 3px; background-color: #c26; color: #fff; cursor: pointer; width: 100px;}
.bili_video_button:hover {filter: contrast(80%);}
.bili_video_button:active {filter: contrast(60%); border-style: inset;}
.bili_video_pane {position: absolute; top: 0px; left: 100%; background-color: #fff; border: solid 1px #000; padding: 5px;}
.bili_video_pane > h4, .bili_video_pane > select {width: 110px !important; padding: 5px; text-align: center;}
.bili_video_pane > h4 {color: #c26; font-weight: bold; margin: auto;}
.bili_video_result {display: grid; grid-template-columns: 1fr 1fr 1fr; grid-auto-flow: dense; gap: 5px;}
.bili_video_thumb {grid-column: 1;}
.bili_video_video {grid-column: 2;}
.bili_video_audio {grid-column: 3;}
.bili_video_hidden {display: none;}
.bili_video_l264 > .bili_video_video:not(.bili_video_h264), .bili_video_l265 > .bili_video_video:not(.bili_video_h265), .bili_video_lav1 > .bili_video_video:not(.bili_video_av1) {display: none;}
`;

new MutationObserver(mutations => {
    if (bvWatch !== document.title) {
        bvWatch = document.title;
        bvOpen = true;
        optionsPane.classList.add('bili_video_hidden');
        analysePane.classList.add('bili_video_hidden');
    }
}).observe(document.head, {childList: true});

function PromiseSelector(text) {
    return new Promise((resolve, reject) => {
        let time = 15;
        let t = setInterval(() => {
            let node = document.querySelector(text);
            if (node) {
                clearInterval(t);
                resolve(node);
            } else if (--time === 0) {
                clearInterval(t);
                reject();
            }
        }, 200);
    });
}
