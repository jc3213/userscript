// ==UserScript==
// @name            Bilibili Users Tagging
// @name:zh         哔哩哔哩查户口
// @namespace       https://github.com/jc3213/userscript
// @version         1.5.0
// @description     Search users' profile, then tagging them for Bilibili
// @description:zh  查询哔哩哔哩动画用户成分并予以标记
// @author          jc3213
// @match           https://www.bilibili.com/video/*
// @match           https://www.bilibili.com/bangumi/*
// @match           https://space.bilibili.com/*/dynamic*
// @match           https://t.bilibili.com/*
// @require         https://cdn.jsdelivr.net/gh/jc3213/jslib@d3fc37c1acd3b546838a1eb841600357823a74f5/ui/jsui.css.js#sha256-5+Wmo2jiMGUSS0X/4QY799VJ/x12SsfVE2udGGb+pcU=
// @require         https://cdn.jsdelivr.net/gh/jc3213/jslib@7cb4fb4348574f426417490c20e0ea7d8f0b3187/js/nodeobserver.js#sha256-v48u9yZlthnR8qPvz1AEnK7WLtQmn56wKT1qX76Ic+w=
// @grant           GM_getValue
// @grant           GM_setValue
// @run-at          document-idle
// @noframes
// ==/UserScript==

var badges = GM_getValue('badges', [
    {color: '#4c4', keyword: '原神', name: '原批'},
    {color: '#44c', keyword: '明日方舟', name: '粥批'},
    {color: '#cc4', keyword: '王者荣耀', name: '农批'},
    {color: '#4cc', keyword: '虚拟主播', name: '管人痴'},
    {color: '#c4c', keyword: '抽奖', name: '乞丐'}
]);
var logging = {};
var shown = false;
var {hostname, pathname} = location;
var position = pathname.slice(1);

var jsUI = new JSUI();
var observer = new NodeObserver();

jsUI.css.add(` .jsui-tag-manager {position: relative; font-size: 16px; left: 25px;}
.jsui-tag-manager .jsui-menu-item {background-color: #c26; color: #fff; width: fit-content; padding: 5px 10px;}
.jsui-tag-window {position: absolute; top: 2px; left: 90px; background-color: #fff; z-index: 999; border-width: 1px; border-style: solid; height: 600px; width: 480px;}
.jsui-tag-head {display: flex; height: 36px;}
.jsui-tag-head > * {margin: auto;}
.jsui-tag-head input {width: 80px; height: 24px; padding: 3px; border-width: 1px;}
.jsui-badge {color: #fff; font-weight: bold; padding: 3px; margin-left: 3px;}
.jsui-menu-cell {color: #fff;}`);

var manager = jsUI.new().class('jsui-tag-manager');
var button = jsUI.new().text('管理标签').class('jsui-menu-item, jsui-tag-menu').parent(manager).onclick(event => toggleManagerWindow(win, list));
var win = jsUI.new().class('jsui-tag-window').parent(manager).hide();

var menu = jsUI.new().class('jsui-tag-head').parent(win);
var color_set = jsUI.new('input').attr('type', 'color');
var name_set = jsUI.new('input');
var keyword_set = jsUI.new('input');
var submit = jsUI.new().text('添加').class('jsui-menu-item').parent(menu).onclick(event => submitNewBadge(menu, list));
menu.append(jsUI.new().text('颜色'), color_set, jsUI.new().text('标签'), name_set, jsUI.new().text('关键词'), keyword_set, submit);
var list = jsUI.new().class('jsui-table').parent(win).html('<div class="jsui-table-title"><div>标签</div><div>关键词</div></div>');

function toggleManagerWindow() {
    win.switch();
    if (!shown) {
        badges.forEach(addManageTag);
        shown = true;
    }
}

function submitNewBadge() {
    var color = color_set.value;
    var keyword = keyword_set.value;
    var name = name_set.value;
    if (keyword === '' || name === '') {
        return;
    }
    var find = badges.findIndex(tag => tag.keyword === keyword);
    if (find === -1) {
        var idx = badges.length;
        var result = {color, keyword, name};
        badges.push(result);
        addManageTag(result, idx);
        GM_setValue('badges', badges);
    }
}

function addManageTag({color, keyword, name}, idx) {
    var rule = jsUI.new().parent(list);
    jsUI.new().text(name).class('jsui-menu-cell').parent(rule).css('background-color', color).onclick(event => removeManageTag(rule, idx, name));
    jsUI.new().text(keyword).parent(rule);
}

function removeManageTag(rule, idx, name) {
    if (confirm(`确定要删除标签《${name}》吗？`)) {
        badges.splice(idx, 1);
        rule.remove();
        GM_setValue('badges', badges);
    }
}

if (hostname === 'www.bilibili.com') {
    observer.timeout('div.comment-container').then(addBadgeMenuGeneral);
    submit.css('padding', '1px 10px');
}
else if (hostname === 'space.bilibili.com') {
    bilibiliSpaceAndDynamic('bb-comment ', addBadgeMenuToSpace);
    manager.css('float', 'left');
}
else if (hostname === 't.bilibili.com') {
    if (pathname === '/') {
        bilibiliSpaceAndDynamic('bili-dyn-item__panel', anchorNode => {
            observer.timeout('div.comment-container', {anchorNode}).then(addBadgeMenuGeneral);
        });
    }
    else if (!isNaN(position)) {
        observer.timeout('div.comment-container').then(addBadgeMenuGeneral);
    }
}

function addBadgeMenuGeneral(comment) {
    addBadgeToComment(comment, 'data-user-id', 'reply-item', 'div.sub-reply-container', 'sub-reply-item', 'div.user-name', 'div.sub-user-name');
    comment.querySelector('ul.nav-bar').append(manager);
}

async function addBadgeToComment(comment, mid, root_box, sub_box, sub_item, root_user, sub_user) {
    observer.mutation(comment, {className: root_box}, area => {
        area.querySelectorAll(root_user + ',' + sub_user).forEach(user => createUserTag(user, mid));
        observer.mutation(area.querySelector(sub_box), {className: sub_item}, reply => {
            var user = reply.querySelector(root_user) ?? reply.querySelector(sub_user);
            createUserTag(user, mid);
        });
    });
}

async function bilibiliSpaceAndDynamic(string, callback) {
    var list = await observer.timeout('div.bili-dyn-list__items');
    observer.mutation(list, {className: 'bili-dyn-list__item'}, item => {
        observer.mutation(item, {className: string}, callback);
    });
}

function addBadgeMenuToSpace(comment) {
    addBadgeToComment(comment, 'data-usercard-mid', 'list-item reply-wrap ', 'div.reply-box', 'reply-item reply-wrap', 'a.name', 'a.name');
    comment.querySelector('ul.clearfix').append(manager);
}

async function createUserTag(user, mid) {
    var uid = user.getAttribute(mid);
    var name = user.innerText;
    var {badge, debug, logs} = logging[uid] ?? {badge: {}, debug: false, logs: ''};
    if (logs === '') {
        logs = '昵称： ' + name + '\nUID： ' + uid + '\n标记：';
        var response = await fetch('https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/space?&host_mid=' + uid, {credentials: 'include'});
        var {data: {items}} = await response.json();
        items.forEach(({modules: {module_dynamic: {desc}}}) => {
            if (desc === null) {
                return;
            }
            var text = desc.text.toLowerCase();
            badges.forEach(({keyword, name, color}) => {
                if (!badge[name] && text.includes(keyword)) {
                    badge[name] = color;
                    debug = true;
                    logs += ' ' + name;
                    createNewTag(user, color, name);
                }
            });
        });
        logging[uid] = {badge, debug, logs};
    }
    else {
        Object.entries(badge).forEach(([name, color]) => {
            createNewTag(user, color, name);
        });
    }
    if (debug) {
        console.log(logs);
    }
}

function createNewTag(user, color, name) {
    jsUI.new('span').text(name).class('jsui-badge').css('background-color', color).parent(user);
}
