// ==UserScript==
// @name            Bilibili Liveroom Filter
// @name:zh         哔哩哔哩直播间屏蔽工具
// @namespace       https://github.com/jc3213/userscript
// @version         1.10.0
// @description     Filtering Bilibili liveroom, batch management, export, import banlist...
// @description:zh  哔哩哔哩直播间屏蔽工具，支持管理列表，批量屏蔽，导出、导入列表等……
// @author          jc3213
// @match           *://live.bilibili.com/*
// @grant           GM_getValue
// @grant           GM_setValue
// @noframes
// ==/UserScript==

'use strict';
let storage = new Map(GM_getValue('storage', []));
let caches = new Map();
let showTable;
let showRooms = new Map();
let firstRun = true;
let listItem = document.createElement('div');
listItem.innerHTML = '<div></div><div></div>';
let bilicss = document.createElement('style');
bilicss.textContent = `
.bililive-button {background-color: #00ADEB; border-radius: 5px; color: #ffffff; cursor: pointer; font-size: 16px; padding: 3px 10px; user-select: none; text-align: center;}
.bililive-button:hover {filter: contrast(75%);}
.bililive-button:active {filter: contrast(45%);} `;

let area = location.pathname.slice(1);
if (isNaN(area)) {
    biliLiveSpecialArea();
} else {
    PromiseSelector('.header-info-ctnr > .rows-content').then((liver) => biliLiveShowRoom(liver, area)).catch((error) => biliLiveShowFrame(area));
}

async function biliLiveSpecialArea() {
    let area = await PromiseSelector('#room-card-list');
    biliLiveManagerDeployed(area);
    document.querySelectorAll('.index_item_JSGkw').forEach(biliLiveShowCover);
    let observer = new MutationObserver((mutationsList) => {
        mutationsList.forEach((mutation) => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node) => {
                    if (node.tagName === 'DIV' && node.className === 'index_item_JSGkw') {
                        biliLiveShowCover(node);
                    }
                });
            }
        });
    });
    observer.observe(area, { childList: true, subtree: true });
}

let menuEvent = {
    'bililive-block': ({ liver, id }) => {
        if (confirm('确定要永久屏蔽【 ' + liver + ' 】的直播间吗？')) {
            blockLiveRoom(id, liver);
            SaveMapAsArray();
        }
    },
    'bililive-image': ({ title, image }) => {
        if (confirm('确定要打开直播《 ' + title + ' 》的封面吗？')) {
            open(image, '_blank');
        }
    }
};

async function biliLiveShowCover(node) {
    if (node.cover) {
        return;
    }

    let pane = node.children[0];
    let room = pane.href;
    let id = room.slice(room.lastIndexOf('/') + 1, room.indexOf('?'));
    let [top, center] = pane.children[1].children;
    let thumb = top.children[0].style['background-image'];
    let image = 'https' + thumb.slice(thumb.indexOf(':'), thumb.lastIndexOf('@'));
    let [name, user] = center.children[1].children;
    let title = name.textContent.trim();
    let liver = user.children[0].textContent.trim();

    let menu = document.createElement('div');
    menu.className = 'bililive-balloon bililive-hidden';
    menu.innerHTML = '<div id="bililive-block" class="bililive-button">屏蔽直播间</div><div id="bililive-image" class="bililive-button">查看封面图</div></div';
    menu.addEventListener('click', (event) => {
        let menu = menuEvent[event.target.id];
        if (menu) {
            event.preventDefault();
            menu({ liver, id, title, image });
        }
    });

    showRooms.set(id, node);

    center.after(menu);
    node.cover = true;
    storage.has(id) ? node.classList.add('bililive-hidden') : node.classList.remove('bililive-hidden');
    node.addEventListener('mouseover', () => menu.classList.remove('bililive-hidden'));
    node.addEventListener('mouseout', () => menu.classList.add('bililive-hidden'));
}

async function biliLiveShowRoom(menu, id, xid) {
    let [upper, lower] = menu.children;
    let left = upper.children[0];
    let liver = left.children[0].textContent.trim();
    let area = lower.children[0].children[1].children[0].href;

    if (storage.has(id)) {
        if (confirm('【 ' + liver + ' 】的直播间已被屏蔽，是否继续观看？')) {
            return;
        } else {
            open(area, '_self');
        }
    }

    let block = document.createElement('div');
    block.textContent = '屏蔽直播间';
    block.className = 'bililive-button';
    block.addEventListener('click', (event) => {
        if (confirm('确定要永久屏蔽【 ' + liver + ' 】的直播间吗？')) {
            blockLiveRoom(id, liver);
            if (xid) {
                blockLiveRoom(xid, liver);
            }
            SaveMapAsArray();
            open(area, '_self');
        }
    });

    bilicss.textContent += '.bililive-button {margin-left: 10px;}';
    left.append(block, bilicss);
}

async function biliLiveShowFrame(id) {
    let iframe = await PromiseSelector('iframe[src*="live.bilibili.com"]');
    let menu = await PromiseSelector('.rows-ctnr.rows-content', iframe.contentDocument);
    let xid = iframe.src.match(/\/(\d+)/)[1];
    biliLiveShowRoom(menu, id, xid);
}

function makeFilterItem(id, liver) {
    let cell = listItem.cloneNode(true);
    let [room, user] = cell.children;
    user.textContent = room.className = liver;
    room.textContent = room.id = id;
    return cell;
}

function addToFilterList(id, liver) {
    let cell = caches.get(id) ?? makeFilterItem(id, liver);
    showTable.appendChild(cell);
}

function blockLiveRoom(id, liver) {
    if (storage.has(id)) {
        return;
    }
    storage.set(id, liver);
    let room = showRooms.get(id);
    if (room) {
        room.classList.add('bililive-hidden');
    }
    if (!firstRun) {
        addToFilterList(id, liver);
    }
}

function unblockLiveRoom(id) {
    let room = showRooms.get(id);
    if (room) {
        room.classList.remove('bililive-hidden');
    }
}

let manageEvent = {
    'bililive-manage': ({ popup }) => {
        if (firstRun) {
            storage.forEach((liver, id) => addToFilterList(id, liver));
            firstRun = false;
        }
        popup.classList.toggle('bililive-hidden');
    },
    'bililive-block': ({ entry }) => {
        if (confirm('确定要屏蔽列表中的直播间吗？')) {
            entry.value.match(/[^\r\n]+/g)?.forEach((str) => {
                var rule = str.match(/(\d+)[,:= ]+(.+)/);
                if (rule?.length === 3) {
                    blockLiveRoom(rule[1], rule[2]);
                }
            });
            SaveMapAsArray();
            entry.value = '';
        }
    },
    'bililive-export': ({ save }) => {
        if (confirm('确定要导出当前屏蔽列表吗？')) {
            let output = [...storage].join('\n');
            let blob = new Blob([output], {type: 'plain/text'});
            save.href = URL.createObjectURL(blob);
            save.download = 'bilibili直播间屏蔽列表.conf';
            save.click();
        }
    },
    'bililive-clear': ({ tbody }) => {
        if (confirm('确定要清空当前屏蔽列表吗？')) {
            storage.keys().forEach(unblockLiveRoom);
            SaveMapAsArray();
            tbody.innerHTML = '';
        }
    }
};

function biliLiveManagerDeployed(area) {
    let pane = document.createElement('div');
    pane.className = 'bililive-container';
    pane.innerHTML = `
<div id="bililive-manage" class="bililive-button">管理列表</div>
<div class="bililive-manager bililive-hidden">
    <div id="bililive-block" class="bililive-button">批量屏蔽</div>
    <div class="bililive-button"><label for="bililive-import">导入列表</label></div>
    <div id="bililive-export" class="bililive-button">导出列表</div>
    <div id="bililive-clear" class="bililive-button">清空列表</div>
    <textarea rows="6"></textarea>
    <div class="bililive-table bililive-thead">
        <div>直播间ID</div>
        <div>主播昵称</div>
    </div>
    <div class="bililive-table bililive-tbody"></div>
</div>
<input id="bililive-import" type="file" accept=".conf">
<a></a>
`;

    let [menu, popup, upload, save] = pane.children;
    let [batch,,,, entry,, tbody] = popup.children;

    upload.addEventListener('change', async (event) => {
        let file = upload.files[0];
        entry.value = await PromiseFileReader(file);
        upload.value = '';
        batch.click();
    });

    pane.addEventListener('click', (event) => {
        let manage = manageEvent[event.target.id];
        manage?.({ popup, entry, save, tbody });
    });

    tbody.addEventListener('click', (event) => {
        let { id, className, parentNode } = event.target;
        if (id && confirm('确定要解除对【 ' + className + ' 】的屏蔽吗？') ) {
            parentNode.remove();
            storage.delete(id);
            SaveMapAsArray();
            unblockLiveRoom(id);
        }
    });

    showTable = tbody;

    document.getElementsByClassName('tabs')[0].appendChild(pane);

    bilicss.textContent += `#main { min-height: 1200px; }
.bililive-button { flex: 1; }
.bililive-balloon { display: flex; gap: 5px; margin: 8px 12px 0px 6px; }
.bililive-container {position: relative;}
.bililive-hidden, .bililive-container > input, .bililive-container > a { display: none !important; }
.bililive-manager { display: flex; gap: 3px; flex-wrap: wrap; background-color: #ffffff; border: 1px solid #000000; font-size: 16px; padding: 5px; margin-top: 3px; position: absolute; width: 520px; z-index: 9999; }
.bililive-manager > textarea, .bililive-manager > .bililive-table { flex-basis: 100%; }
.bililive-manager > textarea { font-size: 16px; margin: 3px 0px; padding: 5px; resize: none; }
.bililive-thead, .bililive-tbody > div { display: flex; }
.bililive-thead > *, .bililive-tbody > div > * { border: 1px solid #ffffff; flex: 1; padding: 5px; text-align: center; user-select: text !important; }
.bililive-thead > * { background-color: #000000; color: #ffffff; }
.bililive-tbody { height: 480px; overflow-y: auto; border: 1px solid #000000; }
.bililive-tbody > * > :first-child { background-color: #FF6699; color: #ffffff; cursor: pointer; }
.bililive-tbody > * > :first-child:active  { contrast(45%); }
.bililive-tbody > :nth-child(2n) > :last-child { background-color: #E2E3E4; }
.bililive-tbody > :nth-child(2n + 1) > :last-child { background-color: #F1F2F3; }
`;
    area.append(bilicss);
}

function SaveMapAsArray() {
    GM_setValue('storage', [...storage]);
}

function PromiseFileReader(file) {
    return new Promise((resolve, reject) => {
        let reader = new FileReader();
        reader.readAsText(file);
        reader.onload = () => resolve(reader.result);
    });
}

function PromiseSelector(selector, anchor = document) {
    return new Promise((resolve, reject) => {
        let quota = 15;
        let timer = setInterval(() => {
            let node = anchor.querySelector(selector);
            if (node) {
                clearInterval(timer);
                resolve(node);
            }
            if (--quota === 0) {
                clearInterval(timer);
                reject(new Error(`Timeout: Unable to locate element "${selector}" within 3 seconds.`));
            }
        }, 200);
    });
}
