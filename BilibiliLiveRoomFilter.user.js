// ==UserScript==
// @name            Bilibili Liveroom Filter
// @name:zh         哔哩哔哩直播间屏蔽工具
// @namespace       https://github.com/jc3213/userscript
// @version         1.6.1
// @description     Filtering Bilibili liveroom, batch management, export, import rulelist...
// @description:zh  哔哩哔哩直播间屏蔽工具，支持管理列表，批量屏蔽，导出、导入列表等……
// @author          jc3213
// @match           *://live.bilibili.com/*
// @require         https://cdn.jsdelivr.net/gh/jc3213/jslib@e7814b44512263b5e8125657aff4c1be5fe093a5/ui/jsui.max.js#sha256-E/AFMg2Mf3pDPERaY7Zo1ZnDw1yGYkEWyWP15C3Gpd0=
// @require         https://cdn.jsdelivr.net/gh/jc3213/jslib@7609e22d5506c10182773660667136e9b96fe744/js/nodeobserver.js#sha256-xG7yfLlwtkpejTuRCKVeI7LJPUtx+SvAtnjMhsqnHbM=
// @grant           GM_getValue
// @grant           GM_setValue
// @noframes
// ==/UserScript==

'use strict';
var banned = GM_getValue('banned', []);
var show = false;
var jsUI = new JSUI();
var observer = new NodeObserver();

jsUI.css.add(` .jsui-manager {border: 2px outset #000; width: 500px; background-color: #fff; font-size: 14px; z-index: 999999; position: absolute;}
.jsui-manager > * {width: 100%; resize: none;}
.jsui-table {height: 400px; border: none;}
.jsui-menu-item, .jsui-menu-cell {font-size: 14px; border-width: 0px !important; border-radius: 3px; background-color: #23ade5; color: #fff;}
.Item_2A9JA1Uf > .jsui-basic-menu {margin: 10px 10px 0px 10px;}`);

var manager = jsUI.new().class('jsui-manager').parent(document.body).hide();

var menu = jsUI.menu().parent(manager);
menu.add('批量屏蔽').onclick(batchBlock);
menu.add('导入列表').onclick(importList);
menu.add('导出列表').onclick(exportList);
menu.add('清空列表').onclick(batchUnblock);

var entry = jsUI.new('textarea').attr('rows', 6).parent(manager);

var jsTable = jsUI.table(['直播间ID', '主播昵称']).parent(manager);

var opener = jsUI.new().body('管理列表').class('jsui-menu-item').css('width', '120px').onclick(event => {
    if (!show) {
        banned.forEach(({id, liver}) => makeBanlist(id, liver));
        show = true;
    }
    manager.switch();
});

var upload = jsUI.new('input').attr({type: 'file', accept: '.json'}).onchange(event => {
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
        entry.value.match(/[^\n]+/g)?.forEach(item => {
            var rule = item.match(/(\d+)[\\\/\|\s\n\(\)\[\]\{\},.:;'"!@#$%^&*]+(.+)/);
            if (rule.length === 3) {
                addBanlist(rule[1], rule[2]);
            }
        });
        saveBanlist();
        entry.value = '';
    }
}
function exportList(event) {
    if (confirm('确定要导出当前屏蔽列表吗？')) {
        blobToFile(new Blob([JSON.stringify(banned, null, 4)], {type: 'application/json'}), 'bilibili直播间屏蔽列表');
    }
}
function importList(event) {
    upload.click();
}
function batchUnblock(event) {
    if (confirm('确定要清空当前屏蔽列表吗？')) {
        jsTable.empty();
        banned = [];
        saveBanlist();
    }
}

var area = location.pathname.slice(1);
if (area === '') {
    return;
}
else if (area === 'p/eden/area-tags' || area === 'lol' || area.startsWith('area/')) {
    applyFilterToArea({menu: '#area-tag-list > div:nth-child(1) > div:nth-child(1)', tagName: 'DIV', className: 'index_3Uym8ODI', list: '#area-tag-list > div:nth-child(2)'});
}
else if (area === 'all') {
    applyFilterToArea({menu: '#all-area-card-list > div:nth-child(1) > div:nth-child(1)', tagName: 'DIV', className: 'index_3Uym8ODI', list: '#all-area-card-list > div:nth-child(2), #all-special-area-recommend > div:nth-child(2)'});
}
else if (!isNaN(area)) {
    var player = document.querySelector('section.player-and-aside-area');
    player ? banInsideLiveRoom(player, area) : livePlayerInFrame(area);
}
else {
    console.log('尚未支持的特殊区间，请到NGA原帖或Github反馈');
}

async function livePlayerInFrame(id) {
    var iframe = await observer.timeout('#player-ctnr iframe');
    iframe.addEventListener('load', async event => {
        var anchorNode = iframe.contentDocument;
        var player = await observer.timeout('#head-info-vm > div > div.rows-ctnr', {anchorNode});
        player.append(jsUI.css);
        banInsideLiveRoom(player, id);
    });
}

async function applyFilterToArea({menu, list, tagName, className}) {
    var where = await observer.timeout(menu);
    opener.parent(where);
    where.after(manager);
    manager.css('top', where.offsetTop + 30 + 'px');
    document.querySelectorAll(tagName + '.' + className).forEach(addMenuToLiveRoom);
    document.querySelectorAll(list).forEach(node => observer.mutation(node, {tagName, className}, addMenuToLiveRoom));
}

function banInsideLiveRoom(domPlayer, id) {
    var liver = domPlayer.querySelector('a.room-owner-username').innerText;
    var area = domPlayer.querySelector('a.area-link').href;
    var block = jsUI.new().body('屏蔽直播间').class('jsui-menu-item').onclick(event => {
        if (confirm('确定要永久屏蔽【 ' + liver + ' 】的直播间吗？')) {
            addBanlist(id, liver);
            saveBanlist();
            open(area, '_self');
        }
    });
    domPlayer.querySelector('div.upper-row > div.right-ctnr').prepend(block);
    if (banned.some(rule => rule.id === id) && !confirm('【 ' + liver + ' 】的直播间已被屏蔽，是否继续观看？')) {
        open(area, '_self');
    }
}

function makeBanlist(id, liver) {
    var rule = jsTable.add([{text: id, onclick: event => removeBanList(rule, id, liver)}, liver]);
}

function removeBanList(column, id, liver) {
    if (confirm('确定要解除对【 ' + liver + ' 】的屏蔽吗？')) {
        column.remove();
        var index = banned.findIndex(rule => rule.id === id);
        if (index !== -1) {
            banned.splice(index, 1);
        }
        saveBanlist();
    }
}

function addBanlist(id, liver) {
    if (!banned.some(rule => rule.id === id)) {
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
    var a = jsUI.new('a').attr({href: URL.createObjectURL(blob), download: name});
    a.click();
    a.remove();
}

function banLiveRoom(element) {
    var url = element.querySelector('a').href;
    var id = url.slice(url.lastIndexOf('/') + 1, url.indexOf('?'));
    element.style.display = banned.some(rule => rule.id === id) ? 'none' : 'inline-block';
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

    var menu = jsUI.menu().hide();
    menu.add('屏蔽直播间').onclick(event => floatBlockLiveRoom(event, id, liver));
    menu.add('打开封面').onclick(event => floatOpenThumbnail(event, url, name));

    element.querySelector('div.Item_2A9JA1Uf').appendChild(menu);
    element.addEventListener('mouseover', event => menu.show());
    element.addEventListener('mouseout', event => menu.hide())
}

function floatBlockLiveRoom(event, id, liver) {
    event.preventDefault();
    if (confirm('确定要永久屏蔽【 ' + liver + ' 】的直播间吗？')) {
        addBanlist(id, liver);
        saveBanlist();
    }
}

function floatOpenThumbnail(event, url, name) {
    event.preventDefault();
    if (confirm('确定要打开直播《 ' + name + ' 》的封面吗？')) {
        open(url, '_blank');
    }
}
