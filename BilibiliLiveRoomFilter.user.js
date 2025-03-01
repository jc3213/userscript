// ==UserScript==
// @name            Bilibili Liveroom Filter
// @name:zh         哔哩哔哩直播间屏蔽工具
// @namespace       https://github.com/jc3213/userscript
// @version         1.7.5
// @description     Filtering Bilibili liveroom, batch management, export, import banlist...
// @description:zh  哔哩哔哩直播间屏蔽工具，支持管理列表，批量屏蔽，导出、导入列表等……
// @author          jc3213
// @match           *://live.bilibili.com/*
// @grant           GM_getValue
// @grant           GM_setValue
// @grant           GM_deleteValue
// @run-at          document-load
// @noframes
// ==/UserScript==

'use strict';
let storage = GM_getValue('storage', { every: [] });
let showRooms = { every: [] };
let firstRun = true;

(function hotfix() {
    let banned = GM_getValue('banned');
    if (banned) {
        banned.forEach(({id, liver}) => {
            storage[id] = liver;
            storage.every.push(id);
        });
        GM_setValue('storage');
        GM_deleteValue('banned');
    }
})();

let bilicss = document.createElement('style');
bilicss.textContent = '.bililive-button {background-color: #00ADEB; border-radius: 5px; color: #ffffff; cursor: pointer; font-size: 16px; padding: 3px 10px; user-select: none; text-align: center;} .bililive-button:hover {filter: contrast(75%);} .bililive-button:active {filter: contrast(45%);} ';

let area = location.pathname.slice(1);
if (isNaN(area)) {
    biliLiveSpecialArea();
}
else {
    PromiseDOMSelector('.header-info-ctnr > .rows-content').then((liver) => biliLiveShowRoom(liver, area)).catch((error) => biliLiveShowFrame(area));
}

async function biliLiveSpecialArea() {
    let area = await PromiseDOMSelector('#room-card-list');
    biliLiveManagerCSS()
    biliLiveManagerDeployed();
    area.append(bilicss);
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

async function biliLiveShowCover(node) {
    if (node.cover) {
        return;
    }

    let room = node.querySelector('#card').href;
    let id = room.slice(room.lastIndexOf('/') + 1, room.indexOf('?'));
    let liver = node.querySelector('.Item_nickName_KO2QE').textContent.trim();
    let title = node.querySelector('.Item_roomTitle_ax3eD').textContent.trim();
    let thumb = node.querySelector('.Item_cover_sT5RM').style['background-image'];
    let image = 'https' + thumb.slice(thumb.indexOf(':'), thumb.lastIndexOf('@'));

    let filter = document.createElement('div');
    filter.textContent = '屏蔽直播间';
    filter.className = 'bililive-button';
    filter.addEventListener('click', (event) => {
        event.preventDefault();
        if (confirm('确定要永久屏蔽【 ' + liver + ' 】的直播间吗？')) {
            blockLiveRoom(id, liver);
            GM_setValue('storage', storage);
        }
    });

    let preview = document.createElement('div');
    preview.textContent = '查看封面图';
    preview.className = 'bililive-button';
    preview.addEventListener('click', (event) => {
        event.preventDefault();
        if (confirm('确定要打开直播《 ' + title + ' 》的封面吗？')) {
            open(image, '_blank');
        }
    });

    let menu = document.createElement('div');
    menu.className = 'bililive-preview';
    menu.append(filter, preview);

    showRooms[id] = node;
    showRooms.every.push(node);

    node.querySelector('a > :last-child').appendChild(menu);
    node.cover = true;
    node.style.display = storage[id] ? 'none' : '';
    node.addEventListener('mouseover', (event) => { menu.style.display = 'flex'; });
    node.addEventListener('mouseout', (event) => { menu.style.display = ''; });
}

async function biliLiveShowRoom(xdom, id, xid) {
    let liver = await PromiseDOMSelector('a.room-owner-username', xdom).then((user) => user.textContent);
    let area = await PromiseDOMSelector('a.area-link', xdom).then((area) => area.href);

    if (storage[id] && !confirm('【 ' + liver + ' 】的直播间已被屏蔽，是否继续观看？')) {
        open(area, '_self');
    }

    let filter = document.createElement('div');
    filter.textContent = '屏蔽直播间';
    filter.className = 'bililive-button';
    filter.addEventListener('click', (event) => {
        if (confirm('确定要永久屏蔽【 ' + liver + ' 】的直播间吗？')) {
            blockLiveRoom(id, liver);
            if (xid) {
                blockLiveRoom(xid, liver);
            }
            GM_setValue('storage', storage);
            open(area, '_self');
        }
    });

    let menu = await PromiseDOMSelector('.upper-row > .left-ctnr', xdom);
    bilicss.textContent += '.bililive-button {margin-left: 10px;}';
    menu.append(filter, bilicss);
}

async function biliLiveShowFrame(id) {
    let iframe = await PromiseDOMSelector('iframe[src*="live.bilibili.com"]');
    let player = await PromiseDOMSelector('#player-ctnr', iframe.contentDocument);
    let xid = iframe.src.match(/\/(\d+)/)[1];
    biliLiveShowRoom(player, id, xid);
}

function addToFilterList(id, liver) {
    let show = document.createElement('div');
    show.textContent = id;
    show.addEventListener('click', (event) => {
        if (storage[id] && confirm('确定要解除对【 ' + liver + ' 】的屏蔽吗？')) {
            cell.remove();
            let index = storage.every.findIndex((i) => i === id);
            storage.every.splice(index, 1);
            delete storage[id];
            GM_setValue('storage', storage);
            unblockLiveRoom(id);
        }
    });

    let user = document.createElement('div');
    user.textContent = liver;

    let cell = document.createElement('div');
    cell.append(show, user);

    showRooms.filter.appendChild(cell);
}

function blockLiveRoom(id, liver) {
    if (!storage[id]) {
        storage.every.push(id);
        storage[id] = liver;
        let room = showRooms[id];
        if (room) {
            room.style.display = 'none';
        }
        if (!firstRun) {
            addToFilterList(id, liver);
        }
    }
}

function unblockLiveRoom(id) {
    let room = showRooms[id];
    if (room) {
        room.style.display = '';
    }
}

function biliLiveManagerCSS() {
    bilicss.textContent += '.bililive-button {flex: 1;}\
.bililive-preview {display: none; gap: 5px; margin: 8px 12px 0px 6px;}\
.bililive-container {position: relative;}\
.bililive-manager {background-color: #ffffff; border: 1px solid #000000; display: none; font-size: 16px; padding: 5px; margin-top: 3px; position: absolute; width: 520px; z-index: 3213;}\
.bililive-manager > textarea {font-size: 16px; margin: 3px 0px; padding: 5px; resize: none; width: 508px;}\
.bililive-manager > :first-child {display: flex; gap: 3px; width: 100%;}\
.bililive-popup {display: block;}\
.bililive-filters {border: 1px solid #000000; height: 480px; scroll-y: auto;}\
.bililive-filters > * > * {display: flex;}\
.bililive-filters > * > * > * {border: 1px solid #ffffff; flex: 1; padding: 5px; text-align: center; user-select: text !important;}\
.bililive-filters > :first-child > * > * {background-color: #000000; color: #ffffff;}\
.bililive-filters > :last-child > * > :first-child {background-color: #FF6699; color: #ffffff; cursor: pointer;}\
.bililive-filters > :last-child > * > :first-child:active {contrast(45%);}\
.bililive-filters > :last-child > :nth-child(2n) > :last-child {background-color: #E2E3E4;}\
.bililive-filters > :last-child > :nth-child(2n + 1) > :last-child {background-color: #F1F2F3;}';
}

function biliLiveManagerDeployed() {
    let saver = document.createElement('a');

    let upload = document.createElement('input');
    upload.type = 'file';
    upload.accept = '.json';
    upload.addEventListener('change', async (event) => {
        let file = event.target.files[0];
        if (confirm('确定要导入屏蔽列表【' + file.name.slice(0, -5) + '】吗？')) {
            let json = await PromiseFileReader(file);
            json.forEach(({id, liver}) => console.log(id, liver) || blockLiveRoom(id, liver));
            GM_setValue('storage', storage);
            upload.value = '';
        }
    });

    let batch = document.createElement('div');
    batch.textContent = '批量屏蔽';
    batch.addEventListener('click', (event) => {
        if (confirm('确定要屏蔽列表中的直播间吗？')) {
            entry.value.match(/[^\r\n]+/g)?.forEach((str) => {
                var rule = str.match(/(\d+)[\\/:*?"<>|[\](){}+\-*/`,.;!@#%^&]+(.+)/);
                if (rule?.length === 3) {
                    blockLiveRoom(rule[1], rule[2]);
                }
            });
            GM_setValue('storage', storage);
            entry.value = '';
        }
    });

    let _import = document.createElement('div');
    _import.textContent = '导入列表';
    _import.addEventListener('click', (event) => upload.click());

    let _export = document.createElement('div');
    _export.textContent = '导出列表';
    _export.addEventListener('click', (event) => {
        if (confirm('确定要导出当前屏蔽列表吗？')) {
            let output = [];
            storage.every.forEach((id) => output.push({id, liver: storage[id]}));
            let blob = new Blob([JSON.stringify(output, null, 4)], {type: 'application/json'});
            saver.href = URL.createObjectURL(blob);
            saver.download = 'bilibili直播间屏蔽列表';
            saver.click();
        }
    });

    let purge = document.createElement('div');
    purge.textContent = '清空列表';
    purge.addEventListener('click', (event) => {
        if (confirm('确定要清空当前屏蔽列表吗？')) {
            storage.every.forEach(unblockLiveRoom);
            storage = { every: [] };
            GM_setValue('storage', storage);
            tbody.innerHTML = '';
        }
    });

    let menu = document.createElement('div');
    batch.className = _import.className = _export.className = purge.className = 'bililive-button';
    menu.append(batch, _import, _export, purge);

    let entry = document.createElement('textarea');
    entry.rows = '6';

    let tbody = document.createElement('div');
    let table = document.createElement('div');
    table.className = 'bililive-filters';
    table.innerHTML = '<div><div><div>直播间ID</div><div>主播昵称</div></div></div>';
    table.appendChild(tbody);

    let manager = document.createElement('div');
    manager.className = 'bililive-manager';
    manager.append(menu, entry, table)

    let main = document.createElement('div');
    main.textContent = '管理列表';
    main.className = 'bililive-button';
    main.addEventListener('click', (event) => {
        if (firstRun) {
            storage.every.forEach((id) => addToFilterList(id, storage[id]));
            firstRun = false;
        }
        manager.classList.toggle('bililive-popup');
    });

    let container = document.createElement('div');
    container.append(main, manager);
    container.className = 'bililive-container';

    showRooms.filter = tbody;

    document.querySelector('.tabs').appendChild(container);
}

function PromiseFileReader(file) {
    return new Promise((resolve, reject) => {
        let reader = new FileReader();
        reader.readAsText(file);
        reader.onload = () => resolve(JSON.parse(reader.result));
    });
}

function PromiseDOMSelector(selector, anchor = document) {
    return new Promise((resolve, reject) => {
        let quota = 10;
        let timer = setInterval(() => {
            let node = anchor.querySelector(selector);
            if (node) {
                clearInterval(timer);
                resolve(node);
            }
            quota--;
            if (quota === 0) {
                clearInterval(timer);
                reject( new Error('Failed to find any HTML Element with "' + selector + '"') );
            }
        }, 250);
    });
}
