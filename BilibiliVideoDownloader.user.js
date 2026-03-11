// ==UserScript==
// @name            Bilibili Video Downloader
// @name:zh         哔哩哔哩视频下载器
// @namespace       https://github.com/jc3213/userscript
// @version         2.0.0
// @description     Download videos from Bilibili (No Bangumi)
// @description:zh  下载哔哩哔哩视频（不支持番剧）
// @author          jc3213
// @match           https://www.bilibili.com/video/*
// @match           https://www.bilibili.com/v/*
// @match           https://www.bilibili.com/festival/*
// @grant           GM_download
// ==/UserScript==

let { autowide = '1', videocodec = 'bilivideo_vc265' } = localStorage;
let { pathname } = location;
let bvTitle;
let bvOpen = true;
let history = {};
let archive;
let format = {
    '30280': { text: '音频 高码率', ext: '.192k.m4a' },
    '30232': { text: '音频 中码率', ext: '.128k.m4a' },
    '30216': { text: '音频 低码率', ext: '.64k.m4a' },
    '127': { text: '8K 超高清', ext: '.8k.mp4' },
    '125': { text: '4K 超清+', ext: '.4k+.mp4' },
    '120': { text: '4K 超清', ext: '.4k.mp4' },
    '116': { text: '1080P 60帧', ext: '.1080f60.mp4' },
    '112': { text: '1080P 高码率', ext: '.1080+.mp4' },
    '80': { text: '1080P 高清', ext: '.1080.mp4' },
    '74': { text: '720P 60帧', ext: '.720f60.mp4' },
    '64': { text: '720P 高清', ext: '.720.mp4' },
    '32': { text: '480P 清晰', ext: '.480.mp4' },
    '16': { text: '360P 流畅', ext: '.360.mp4' },
    '15': { text: '360P 流畅', ext: '.360-.mp4' },
    'avc1': { title: '视频编码: H.264', alt: 'h264', type: 'video' },
    'hvc1': { title: '视频编码: HEVC 增强', alt: 'h265', type: 'video' },
    'hev1': { title: '视频编码: HEVC', alt: 'h265', type: 'video' },
    'av01': { title: '视频编码：AV1', alt: 'av1', type: 'video' },
    'mp4a': { title: '音频编码: AAC', alt: 'aac', type: 'audio' }
};

const bvCode = pathname.substring(1, pathname.indexOf('/', 2));
const bvMenu = {
    dash: 'result',
    offset: 'display: inline-block; top: -12px;',
    menu: 'div.toolbar > div.toolbar-left',
    widebtn: 'div.bpx-player-ctrl-wide',
    widestat: 'bpx-state-entered',
    fetch: () => {
        let active = document.querySelector('li.bpx-player-ctrl-eplist-menu-item.bpx-state-active');
        let id = active.getAttribute('data-episodeid');
        let name = active.textContent;
        let thumb = document.querySelector('img.image_ogv_weslie_common_image__Rg7Xm').src;
        bVideoTitle(name);
        bVideoThumb(thumb);
        bVideoGetter(id, `pgc/player/web/playurl?ep_id=${id}`);
    }
};

if (bvCode === 'video') {
    bvMenu.menu = 'div.video-toolbar-left';
    bvMenu.offset = '10px';
    bvMenu.dash = 'data';
    bvMenu.fetch = () => {
        let { videoData } = document.defaultView.__INITIAL_STATE__;
        let { title, aid, cid, pic } = videoData;
        cid ??= document.querySelector('li.bpx-state-multi-active-item')?.getAttribute('data-cid');
        bVideoTitle(title);
        bVideoThumb(pic);
        bVideoGetter(cid, 'x/player/playurl?avid=' + aid + '&cid=' + cid);
    };
} else if (bvCode === 'v') {
    bvMenu.offset = 'left: -300px;';
    bvMenu.menu = 'div.select-type > ul.type';
    bvMenu.widebtn = 'div.bilibili-player-video-btn-widescreen';
    bvMenu.widestat = 'closed';
    bvMenu.dash = 'data';
    bvMenu.fetch = () => {
        let { aid, cid } = document.defaultView;
        bVideoTitle(document.querySelector('div.match-info-title').textContent);
        bVideoGetter(cid, 'x/player/playurl?avid=' + aid + '&cid=' + cid);
    };
} else if (bvCode === 'festival') {
    bvMenu.offset = 'top: 86%; right: 0%;';
    bvMenu.menu = 'div.page-bg-logo';
    bvMenu.dash = 'data';
    bvMenu.fetch = () => {
        let { videoInfo } = document.defaultView.__INITIAL_STATE__;
        let { title, aid, cid} = videoInfo;
        let active = document.querySelector('li.bpx-player-ctrl-eplist-menu-item.bpx-state-active');
        let name = `${title} - ${active.textContent}`;
        cid ??= active.getAttribute('data-cid');
        bVideoTitle(title);
        //bVideoThumb(pic);
        bVideoGetter(cid, 'x/player/playurl?avid=' + aid + '&cid=' + cid);
    }
}

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
    if (json?.video) {
        for (let i of json.video) {
            bVideoItems(i);
        }
    }
    if (json?.audio) {
        for (let i of json.audio) {
            bVideoItems(i);
        }
    }
}

async function bVideoGetter(vid, playurl) {
    if (bvOpen && history[vid]) {
        analysePane.innerHTML = '';
        analysePane.append(...history[vid]);
    } else {
        let response = await fetch('https://api.bilibili.com/' + playurl + '&fnval=4050', {credentials: 'include'});
        let json = await response.json();
        let videos = json[bvMenu.dash].dash;
        bVideoExtractor(videos);
        history[vid] = [...analysePane.children];
    }
}

menuPane.addEventListener('click', (event) => {
    let { id } = event.target;
    if (id === 'bilivideo_optbtn') {
        optionsPane.classList.toggle('bilivideo_hidden');
        analysePane.classList.add('bilivideo_hidden');
    } else if (id === 'bilivideo_anabtn') {
        optionsPane.classList.add('bilivideo_hidden');
        analysePane.classList.toggle('bilivideo_hidden');
        if (!bvOpen) return;
        analysePane.classList.add(videocodec);
        bvOpen = false;
        analysePane.innerHTML = '';
        bvMenu.fetch();
    }
});

optionsPane.addEventListener('change', (event) => {
    let { name, value } = event.target;
    self[name] = localStorage[name] = value;
    if (name === 'autowide') {
        document.querySelector(bvMenu.widebtn).click();
    } else if (name === 'videocodec') {
        analysePane.classList.replace(videocodec, value);
    }
});

analysePane.addEventListener('click', (event) => {
    let { altKey, target: { url, file } } = event;
    if (!url || !file) return;
    altKey
        ? window.postMessage({ aria2c: 'aria2c_download', params: [{ url, options: { out: file, referer: location.href } }] })
        : GM_download({ url, responseType: 'blob', headers: { referer: location.href }, name: file });
});

let [, optionWide,, optionCodec] = optionsPane.children;
optionWide.value = autowide;
optionCodec.value = videocodec;

let cssPane = document.createElement('style');
cssPane.textContent = `
#bilivideo_main { font-size: 16px; position: relative; text-align: center; padding-right: 5px; line-height: 28px; z-index: 9999999; width: fit-content; ${bvMenu.offset ?? ''} }
#bilivideo_menu { display: flex; gap: 5px;}
.bilivideo_button { border: outset 1px #000; padding: 3px; background-color: #c26; color: #fff; cursor: pointer; width: 100px; }
.bilivideo_button:hover { filter: contrast(80%); }
.bilivideo_button:active { filter: contrast(60%); border-style: inset; }
.bilivideo_pane { position: absolute; top: 0px; left: 100%; background-color: #fff; border: solid 1px #000; padding: 5px; }
.bilivideo_pane > h4, .bilivideo_pane > select { width: 110px !important; padding: 5px; text-align: center; }
.bilivideo_pane > h4 { color: #c26; font-weight: bold; margin: auto; }
.bilivideo_pane > select { cursor: pointer; border: 1px solid #000; }
.bilivideo_result { display: grid; grid-template-columns: 1fr 1fr 1fr; grid-auto-flow: dense; gap: 5px; }
.bilivideo_thumb { grid-column: 1; }
.bilivideo_video { grid-column: 2; }
.bilivideo_audio { grid-column: 3; }
.bilivideo_hidden { display: none; }
.bilivideo_vc264 > .bilivideo_video:not(.bilivideo_h264), .bilivideo_vc265 > .bilivideo_video:not(.bilivideo_h265), .bilivideo_vcav1 > .bilivideo_video:not(.bilivideo_av1) { display: none ;}
`;

const proto = HTMLMediaElement.prototype;
const descriptor = Object.getOwnPropertyDescriptor(proto, 'src');
const bvplay = proto.play;

Object.defineProperty(proto, 'src', {
    configurable: true,
    enumerable: true,
    get() {
        return descriptor.get.call(this);
    },
    set(value) {
        descriptor.set.call(this, value);
        bvOpen = true;
        optionsPane.classList.add('bilivideo_hidden');
        analysePane.classList.add('bilivideo_hidden');
    }
});

proto.play = async function (...args) {
    proto.play = bvplay;
    setTimeout(() => {
        let wide = document.querySelector(bvMenu.widebtn);
        let menu = document.querySelector(bvMenu.menu);
        if (!wide.classList.contains(bvMenu.widestat) && autowide === '1' ) {
            wide.click();
        }
        menu.append(mainPane, cssPane);
    }, 1000);
    return bvplay.apply(this, args);
};
