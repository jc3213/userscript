// ==UserScript==
// @name            Bilibili Liveroom Filter
// @name:zh         哔哩哔哩直播间屏蔽工具
// @namespace       https://github.com/jc3213/userscript
// @version         1.5.12
// @description     Filtering Bilibili liveroom, batch management, export, import rulelist...
// @description:zh  哔哩哔哩直播间屏蔽工具，支持管理列表，批量屏蔽，导出、导入列表等……
// @author          jc3213
// @match           *://live.bilibili.com/*
// @require         https://raw.githubusercontent.com/jc3213/jslib/7d4380aa6dfc2fcc830791497fb3dc959cf3e49d/ui/menu.js#sha256-/1vgY/GegKrXhrdVf0ttWNavDrD5WyqgbAMMt7MK4SM=
// @require         https://raw.githubusercontent.com/jc3213/jslib/4221499b1b97992c9bce74122a4fe54435dbab59/ui/table.js#sha256-NEbVclWSJYQHpTp+wA8ANAq3YfaWrKyMXeySqFctiTU=
// @grant           GM_getValue
// @grant           GM_setValue
// @noframes
// ==/UserScript==

'use strict';
var banned = GM_getValue('banned', []);
var show = false;

var css = document.createElement('style');
css.type = 'text/css';
css.innerText = '.jsui-manager {border: 2px outset #000; width: 500px; background-color: #fff; font-size: 14px; z-index: 999999; position: absolute;}\
.jsui-manager > * {width: 100%; resize: none;}\
.jsui-table {height: 400px; border: none;}\
.jsui-menu-item, .jsui-click-cell {font-size: 14px; border-width: 0px !important; border-radius: 3px; background-color: #23ade5; color: #fff;}\
.Item_2A9JA1Uf > .jsui-basic-menu {margin: 10px 10px 0px 10px;}';
document.body.appendChild(css);

var jsMenu = new FlexMenu();
var menu = jsMenu.menu({
    items: [
        {text: '批量屏蔽', onclick: batchBlock},
        {text: '导入列表', onclick: importList},
        {text: '导出列表', onclick: exportList},
        {text: '清空列表', onclick: batchUnblock}
    ]
});

var entry = document.createElement('textarea');
entry.rows = '6';

var jsTable = new FlexTable();
jsTable.head = ['直播间ID', '主播昵称'];

var manager = document.createElement('div');
manager.className = 'jsui-manager';
manager.style.display = 'none';
manager.append(menu, entry, jsTable.table);
document.body.appendChild(manager);

var opener = jsMenu.item({
    text: '管理列表',
    onclick: event => {
        if (!show) {
            banned.forEach(({id, liver}) => makeBanlist(id, liver));
            show = true;
        }
        manager.style.display = manager.style.display === 'none' ? 'block' : 'none';
    }
});
opener.style.width = '120px';

var upload = document.createElement('input');
upload.type = 'file';
upload.accept = '.json';
upload.addEventListener('change', event => {
    if (confirm('确定要导入屏蔽列表【' + event.target.files[0].name.slice(0, -5) + '】吗？')) {
        var reader = new FileReader();
        reader.readAsText(event.target.files[0]);
        reader.onload = () => {
            var list = JSON.parse(reader.result);
            list.forEach(({id, liver}) => addBanlist(id, liver));
            saveBanlist();
        }
        upload.value = '';
    }
});

function batchBlock(event) {
    if (confirm('确定要屏蔽列表中的直播间吗？')) {
        var list = entry.value.match(/[^\n]+/g);
        if (list) {
            list.forEach(item => {
                var rule = item.match(/(\d+)[\\\/\|\s\n\(\)\[\]\{\},.:;'"!@#$%^&*]+(.+)/);
                if (rule.length === 3) {
                    addBanlist(rule[1], rule[2]);
                }
            });
            saveBanlist();
        }
        entry.value = '';
    }
}
function exportList(event) {
    if (confirm('确定要导出当前屏蔽列表吗？')) {
        blobToFile(new Blob([JSON.stringify(banned)], {type: 'application/json'}), 'bilibili直播间屏蔽列表');
    }
}
function importList(event) {
    upload.querySelector('input').click();
}
function batchUnblock(event) {
    if (confirm('确定要清空当前屏蔽列表吗？')) {
        jsTable.clear();
        banned = [];
        saveBanlist();
    }
}

var area = location.pathname.slice(1);
if (area === '') {
    return;
}
else if (area === 'p/eden/area-tags' || area === 'lol' || area.startsWith('area/')) {
    applyFilterToArea({menu: '#area-tag-list > div:nth-child(1) > div:nth-child(1)', room: 'div.index_3Uym8ODI', list: ['#area-tag-list > div:nth-child(2)']});
}
else if (area === 'all') {
    applyFilterToArea({menu: '#all-area-card-list > div:nth-child(1) > div:nth-child(1)', room: 'div.index_3Uym8ODI', list: ['#all-area-card-list > div:nth-child(2)']});
}
else if (!isNaN(area)) {
    var player = document.querySelector('section.player-and-aside-area');
    player ? banInsideLiveRoom(player, area) : livePlayerInFrame(area);
}
else {
    console.log('尚未支持的特殊区间，请到NGA原帖或Github反馈');
}

function livePlayerInFrame(id) {
    var observer = setInterval(() => {
        try {
            var player = document.querySelector('#player-ctnr iframe').contentDocument.querySelector('#head-info-vm > div > div.rows-ctnr');
            player.append(jsMenu.css, css);
            banInsideLiveRoom(player, id);
            clearInterval(observer);
        }
        catch(error) {}
    }, 100);
}

function applyFilterToArea({menu, room, list}) {
    setTimeout(() => {
        var where = document.querySelector(menu);
        where.appendChild(opener);
        where.after(manager);
        manager.style.top = where.offsetTop + 30 + 'px';
        document.querySelectorAll(room).forEach(addMenuToLiveRoom);
        list.forEach(item => {
            new MutationObserver(mutationList => {
                mutationList.forEach(mutation => {
                    var newNode = mutation.addedNodes[0];
                    if (newNode) {
                        addMenuToLiveRoom(newNode);
                    }
                });
            }).observe(document.querySelector(item), {childList: true, subtree: false});
        });
    }, 1000);
}

function banInsideLiveRoom(domPlayer, id) {
    var liver = domPlayer.querySelector('a.room-owner-username').innerText;
    var area = domPlayer.querySelector('a.area-link').href;
    var block = jsMenu.item({
        text: '屏蔽直播间',
        onclick: event => {
            if (confirm('确定要永久屏蔽【 ' + liver + ' 】的直播间吗？')) {
                addBanlist(id, liver);
                saveBanlist();
                open(area, '_self');
            }
        }
    });
    domPlayer.querySelector('div.upper-row > div.right-ctnr').prepend(block);
    if (banned.find(rule => rule.id === id) && !confirm('【 ' + liver + ' 】的直播间已被屏蔽，是否继续观看？')) {
        open(area, '_self');
    }
}

function makeBanlist(id, liver) {
    jsTable.add([id, liver], [event => removeBanList(event.target.parentNode, id, liver)]);
}

function removeBanList(cell, id, liver) {
    if (confirm('确定要解除对【 ' + liver + ' 】的屏蔽吗？')) {
        cell.remove();
        var index = banned.findIndex(rule => rule.id === id);
        if (index !== -1) {
            banned.splice(index, 1);
        }
        saveBanlist();
    }
}

function addBanlist(id, liver) {
    if (!banned.find(rule => rule.id === id)) {
        banned.push({id, liver});
        if (show) {
            makeBanlist(id, liver);
        }
    }
}

function saveBanlist() {
    GM_setValue('banned', banned);
    document.querySelectorAll('div.index_3Uym8ODI').forEach(banLiveRoom);
}

function blobToFile(blob, name) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
}

function banLiveRoom(element) {
    var url = element.querySelector('a').href;
    var id = url.slice(url.lastIndexOf('/') + 1, url.indexOf('?'));
    element.style.display = banned.find(rule => rule.id === id) ? 'none' : 'inline-block';
    return id;
}

function addMenuToLiveRoom(element) {
    if (element.querySelector('.jsui_basic_menu')) {
        return;
    }
    var id = banLiveRoom(element);
    var liver = element.querySelector('div.Item_QAOnosoB').innerText.trim();
    var name = element.querySelector('div.Item_2GEmdhg6').innerText.trim();
    var preview = element.querySelector('div.Item_2n7ef9LN').style['background-image'];
    var url = 'https' + preview.slice(preview.indexOf(':'), preview.lastIndexOf('"'));

    var menu = jsMenu.menu({
        items: [
            {text: '屏蔽直播间', onclick: event => floatBlockLiveRoom(event, id, liver)},
            {text: '打开封面', onclick: event => floatOpenThumbnail(event, url)}
        ]
    });
    menu.style.display = 'none';

    element.querySelector('div.Item_2A9JA1Uf').appendChild(menu);
    element.addEventListener('mouseover', event => {menu.style.display = 'flex';});
    element.addEventListener('mouseout', event => {menu.style.display = 'none';})
}

function floatBlockLiveRoom(event, id, liver) {
    event.preventDefault();
    if (confirm('确定要永久屏蔽【 ' + liver + ' 】的直播间吗？')) {
        addBanlist(id, liver);
        saveBanlist();
    }
}

function floatOpenThumbnail(event, url) {
    event.preventDefault();
    if (confirm('确定要打开直播《' + name + '》的封面吗？')) {
        open(url, '_blank');
    }
}
