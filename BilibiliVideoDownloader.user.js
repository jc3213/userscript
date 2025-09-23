// ==UserScript==
// @name            Bilibili Video Downloader
// @name:zh         哔哩哔哩视频下载器
// @namespace       https://github.com/jc3213/userscript
// @version         1.11.0
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
let bvCodec;
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
    'video': { key: 'data', menu: 'div.video-toolbar-left', widebtn: 'div.bpx-player-ctrl-wide', widestat: 'bpx-state-entered', fetch: () => {
        let { videoData } = document.defaultView.__INITIAL_STATE__;
        let { title, aid, pic } = videoData;
        let cid = document.querySelector('li.bpx-state-multi-active-item')?.getAttribute('data-cid') ?? videoData.cid;
        bVideoTitle(title);
        bVideoThumb(pic);
        bVideoGetter(cid, 'x/player/playurl?avid=' + aid + '&cid=' + cid);
    } },
    'v': { key: 'data', offset: 'left: -300px;', menu: 'div.select-type > ul.type', widebtn: 'div.bilibili-player-video-btn-widescreen', widestat: 'closed', fetch: () => {
        let { aid, cid } = document.defaultView;
        bVideoTitle(document.querySelector('div.match-info-title').textContent);
        bVideoGetter(cid, 'x/player/playurl?avid=' + aid + '&cid=' + cid);
    } },
    'default': { key: 'result', offset: 'display: inline-block; top: -12px;', menu: 'div.toolbar > div.toolbar-left', widebtn: 'div.bpx-player-ctrl-wide', widestat: 'bpx-state-entered', fetch: () => {
        let active = document.querySelector('li.bpx-player-ctrl-eplist-menu-item.bpx-state-active');
        let id = active.getAttribute('data-episodeid');
        let name = active.textContent;
        let thumb = document.querySelector('img.image_ogv_weslie_common_image__Rg7Xm').src;
        bVideoTitle(name);
        bVideoThumb(thumb);
        bVideoGetter(id, `pgc/player/web/playurl?ep_id=${id}`);
    } }
};
let bvCode = location.pathname.match(/^\/(v(?:ideo)?)\//)?.[1];
let bvMenu = bvHandler[bvCode] ?? bvHandler.default;

window.addEventListener('play', async function bVideoToolbar() {
    let wide = await PromiseSelector(bvMenu.widebtn);
    let menu = await PromiseSelector(bvMenu.menu);
    if (!wide.classList.contains(bvMenu.widestat) && localStorage.autowide === '1' ) {
        wide.click();
    }
    menu.append(mainPane, cssPane);
    window.removeEventListener('play', bVideoToolbar);
}, true);

let menuItem = document.createElement('div');
menuItem.className = 'bilivideo_button';

let mainPane = document.createElement('div');
mainPane.id = 'bilivideo_main';
mainPane.innerHTML = `
<div id="bilivideo_menu">
    <div id="bilivideo_optbtn" class="bilivideo_button">设置</div>
    <div id="bilivideo_anabtn" class="bilivideo_button">解析</div>
</div>
<div id="bilivideo_options" class="bilivideo_pane bilivideo_hidden">
    <h4>自动宽屏</h4>
    <select name="autowide">
        <option value="0">关闭</option>
        <option value="1">启用</option>
    </select>
    <h4>编码格式</h4>
    <select name="videocodec">
        <option value="bilivideo_vc264">H.264</option>
        <option value="bilivideo_vc265">HEVC</option>
        <option value="bilivideo_vcav1">AV-1</option>
    </select>
</div>
<div id="bilivideo_analyse" class="bilivideo_pane bilivideo_result bilivideo_hidden"></div>
`;

let [menuPane, optionsPane, analysePane] = mainPane.children;

function bVideoTitle(name) {
    bvTitle = name.trim().replace(/[\/\\:*?"<>|\s\r\n]/g, '_');
}

function bVideoThumb(url) {
    let thumb = menuItem.cloneNode(true);
    thumb.classList.add('bilivideo_thumb');
    thumb.textContent = '视频封面';
    thumb.url = url.replace(/^(https?:)?\/\//, 'https://').replace(/@.+/, '');
    thumb.file = bvTitle + thumb.url.slice(url.lastIndexOf('.'));
    analysePane.appendChild(thumb);
}

function bVideoItems(json) {
    let { id, codecs, baseUrl } = json;
    let codec = codecs.slice(0, codecs.indexOf('.'));
    let { text, ext } = format[id];
    let { title, alt, type } = format[codec];
    let menu = menuItem.cloneNode(true);
    menu.classList.add('bilivideo_' + type, 'bilivideo_' + alt);
    menu.textContent = text;
    menu.title = title;
    menu.url = baseUrl;
    menu.file = bvTitle + ext;
    analysePane.appendChild(menu);
}

function bVideoExtractor(json) {
    json?.video?.forEach(bVideoItems);
    json?.audio?.forEach(bVideoItems);
}

async function bVideoGetter(vid, playurl) {
    if (bvOpen && history[vid]) {
        analysePane.innerHTML = '';
        analysePane.append(...history[vid]);
    } else {
        let response = await fetch('https://api.bilibili.com/' + playurl + '&fnval=4050', {credentials: 'include'});
        let json = await response.json();
        bVideoExtractor(json[bvMenu.key]?.dash);
        history[vid] = [...analysePane.children];
    }
}

function bVideoOptions() {
    optionsPane.classList.toggle('bilivideo_hidden');
    analysePane.classList.add('bilivideo_hidden');
}

function bVideoAnalyze() {
    bvCodec = optionCodec.value;
    optionsPane.classList.add('bilivideo_hidden');
    analysePane.classList.add(bvCodec);
    analysePane.classList.toggle('bilivideo_hidden');
    if (bvOpen || videocodec !== localStorage.videocodec) {
        bvOpen = false;
        videocodec = localStorage.videocodec;
        analysePane.innerHTML = '';
        bvMenu.fetch();
    }
}

const menuEvent = {
    'bilivideo_optbtn': bVideoOptions,
    'bilivideo_anabtn': bVideoAnalyze
};

menuPane.addEventListener('click', (event) => {
    let menu = menuEvent[event.target.id];
    menu?.();
});

const optEvent = {
    'autowide': () => document.querySelector(bvMenu.widebtn).click(),
    'videocodec': (value) => {
        analysePane.classList.replace(bvCodec, value);
        bvCodec = value;
    }
};

optionsPane.addEventListener('change', (event) => {
    let { name, value } = event.target;
    localStorage[name] = value;
    optEvent[name]?.(value);
});

analysePane.addEventListener('click', (event) => {
    let {altKey, target: {url, file}} = event;
    if (url && file) {
        if (altKey) {
            var urls = [{ url, options: { out: file, referer: location.href } }];
            window.postMessage({ aria2c: 'aria2c_download', params: urls });
        }
        else {
            GM_download({ url, responseType: 'blob', headers: { referer: location.href }, name: file });
        }
    }
});

let [, optionWide,, optionCodec] = optionsPane.children;
optionWide.value = autowide;
optionCodec.value = videocodec;

let cssPane = document.createElement('style');
cssPane.textContent = `
#bilivideo_main { font-size: 16px; position: relative; text-align: center; padding-right: 5px; line-height: 28px; z-index: 9999999; ${bvMenu.offset ?? ''} }
#bilivideo_menu { display: flex; gap: 5px;}
.bilivideo_button { border: outset 1px #000; padding: 3px; background-color: #c26; color: #fff; cursor: pointer; width: 100px; }
.bilivideo_button:hover { filter: contrast(80%); }
.bilivideo_button:active { filter: contrast(60%); border-style: inset; }
.bilivideo_pane { position: absolute; top: 0px; left: 100%; background-color: #fff; border: solid 1px #000; padding: 5px; }
.bilivideo_pane > h4, .bilivideo_pane > select { width: 110px !important; padding: 5px; text-align: center; }
.bilivideo_pane > h4 { color: #c26; font-weight: bold; margin: auto; }
.bilivideo_result { display: grid; grid-template-columns: 1fr 1fr 1fr; grid-auto-flow: dense; gap: 5px; }
.bilivideo_thumb { grid-column: 1 ;}
.bilivideo_video { grid-column: 2; }
.bilivideo_audio { grid-column: 3; }
.bilivideo_hidden { display: none; }
.bilivideo_vc264 > .bilivideo_video:not(.bilivideo_h264), .bilivideo_vc265 > .bilivideo_video:not(.bilivideo_h265), .bilivideo_vcav1 > .bilivideo_video:not(.bilivideo_av1) { display: none ;}
`;

new MutationObserver(() => {
    if (bvWatch !== location.href) {
        bvWatch = location.href;
        bvOpen = true;
        optionsPane.classList.add('bilivideo_hidden');
        analysePane.classList.add('bilivideo_hidden');
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
