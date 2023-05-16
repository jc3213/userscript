// ==UserScript==
// @name            Bilibili Users Tagging
// @name:zh         哔哩哔哩查户口
// @namespace       https://github.com/jc3213/userscript
// @version         1.4.0
// @description     Search users' profile, then tagging them for Bilibili
// @description:zh  查询哔哩哔哩动画用户成分并予以标记
// @author          jc3213
// @match           https://www.bilibili.com/video/*
// @match           https://www.bilibili.com/bangumi/*
// @match           https://space.bilibili.com/*/dynamic*
// @match           https://t.bilibili.com/*
// @require         https://cdn.jsdelivr.net/gh/jc3213/jslib@aa501e0a7942209aa96866c78683e886f126505e/ui/jsui.js#sha256-DZvmxgSalDn3+Q25oNGYfKsuqMXHQCRBGxciFNxmqQE=
// @require         https://cdn.jsdelivr.net/gh/jc3213/jslib@ceaca1a2060344909a408a1e157e3cd23e4dbfe0/js/nodeobserver.js#sha256-R3ptp1LZaBZu70+IAJ9KX1CJ7BN4wyrANtHb48wlROc=
// @grant           GM_getValue
// @grant           GM_setValue
// @run-at          document-idle
// @noframes
// ==/UserScript==

var badges = GM_getValue('badges', [
    {keyword: '原神', tag: '原批', color: '#4c4'},
    {keyword: '明日方舟', tag: '粥批', color: '#44c'},
    {keyword: '王者荣耀', tag: '农批', color: '#cc4'},
    {keyword: '虚拟主播', tag: '管人痴', color: '#4cc'},
    {keyword: '抽奖', tag: '乞丐', color: '#c4c'}
]);
var logging = {};
var shown = false;
var {hostname, pathname} = location;

var jsUI = new JSUI();

var stylesheet = ` .jsui-tag-manager {position: relative; font-size: 16px;}
.jsui-tag-manager .jsui-menu-item {background-color: #c26; color: #fff; width: fit-content; padding: 5px 10px; margin: 0px auto;}
.jsui-tag-window {position: absolute; top: 0px; left: 88px; background-color: #fff; z-index: 999; border-width: 1px; border-style: solid; height: 600px; width: 480px;}
.jsui-tag-head {display: flex; padding: 3px;}
.jsui-tag-head input {width: 80px; height: 29px; padding: 3px; margin: 0px auto; border-width: 1px;}
.jsui-tag-head span {padding: 3px 5px; text-align: center;}
.jsui-tag-head .jsui-menu-item {padding: 3px 10px;}
.jsui-badge {color: #fff; font-weight: bold; padding: 3px; margin-left: 3px;}
.jsui-menu-cell {color: #fff;}
.jsui-table > :nth-child(n+2) > :nth-child(2) {background-color: #eee}`;
var videocss = ` .jsui-tag-manager {left: 25px;}`;
var dynamiccss = ` .jsui-tag-manager {float: left;}
.jsui-tag-window {left: 88px;}
.jsui-tag-window input {height: 24px;}`;

function createManagerMenu() {
    var manager = jsUI.new().class('jsui-tag-manager');
    var button = jsUI.new().text('管理标签').class('jsui-menu-item').class('jsui-tag-menu').onclick(event => toggleManagerWindow(window, list));
    var window = jsUI.new().class('jsui-tag-window').hide();
    var menu = jsUI.new().class('jsui-tag-head').html('<span>颜色</span><input type="color" name="color"><span>标签</span><input name="tag"><span>关键词</span><input name="keyword">');
    var list = jsUI.new().class('jsui-table').html('<div class="jsui-table-title"><div>标签</div><div>关键词</div></div>');
    var submit = jsUI.new().text('添加').class('jsui-menu-item').onclick(event => submitNewBadge(menu, list));
    manager.append(button, window);
    window.append(menu, jsUI.new('hr'), list);
    menu.append(submit);
    return manager;
}

function toggleManagerWindow(window, list) {
    window.switch();
    if (!shown) {
        badges.forEach((tag, id) => addManageTag(list, id, tag));
        shown = true;
    }
}

function submitNewBadge(menu, list) {
    var result = {};
    menu.querySelectorAll('input').forEach(i => {
        var {name, value} = i;
        result[name] = value;
        i.value = '';
    });
    var {tag, keyword} = result;
    if (keyword === '' || tag === '') {
        return;
    }
    var find = badges.findIndex(tag => tag.keyword === keyword);
    if (find === -1) {
        var id = badges.length;
        badges.push(result);
        addManageTag(list, id, result);
        GM_setValue('badges', badges);
    }
}

function addManageTag(list, id, store) {
    var {tag, keyword, color} = store;
    var rule = jsUI.new();
    var menu = jsUI.new().text(tag).class('jsui-menu-cell').onclick(event => removeManageTag(rule, id, tag));
    menu.style.backgroundColor = color;
    var name = jsUI.new().text(keyword);
    rule.append(menu, name);
    list.append(rule);
}

function removeManageTag(rule, id, tag) {
    if (confirm(`确定要删除标签《${tag}》吗？`)) {
        badges.splice(id, 1);
        rule.remove();
        GM_setValue('badges', badges);
    }
}

if (pathname.startsWith('/video/')) {
    addBadgeToComment(document.querySelector('#comment'), 'data-user-id', 'reply-item', 'div.sub-reply-container', 'sub-reply-item', 'div.user-name', 'div.sub-user-name');
    addMenuToComment('div.user-name', 'ul.nav-bar');
}
else if (pathname.startsWith('/bangumi/')) {
    addBadgeToComment(document.querySelector('#comment-module'), 'data-user-id', 'reply-item', 'div.sub-reply-container', 'sub-reply-item', 'div.user-name', 'div.sub-user-name');
    addMenuToComment('div.user-name', 'ul.nav-bar');
}
else if (hostname === 'space.bilibili.com') {
    addBadgeToDynamic();
}
else if (pathname === '/') {
    addBadgeToDynamic();
}
else {
    newNodeTimeoutObserver('div.bb-comment').then(addBadgeMenuToTopic);
    jsUI.css.add(stylesheet + dynamiccss);
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
            badges.forEach(({keyword, tag, color}) => {
                if (!badge[tag] && text.includes(keyword)) {
                    badge[tag] = color;
                    debug = true;
                    logs += ' ' + tag;
                    createNewTag(user, tag, color);
                }
            });
        });
        logging[uid] = {badge, debug, logs};
    }
    else {
        Object.entries(badge).forEach(([tag, color]) => {
            createNewTag(user, tag, color);
        });
    }
    if (debug) {
        console.log(logs);
    }
}

function createNewTag(user, tag, color) {
    var badge = jsUI.new('span').text(tag).class('jsui-badge');
    badge.style.backgroundColor = color;
    user.appendChild(badge);
}

function addBadgeToComment(comment, mid, root_box, sub_box, sub_item, root_user, sub_user) {
    newNodeMutationObserver(comment, root_box, area => {
        area.querySelectorAll(root_user + ',' + sub_user).forEach(user => createUserTag(user, mid));
        newNodeMutationObserver(area.querySelector(sub_box), sub_item, reply => {
            var user = reply.querySelector(root_user) ?? reply.querySelector(sub_user);
            createUserTag(user, mid);
        });
    });
}

async function addMenuToComment(anchor, target) {
    await newNodeTimeoutObserver(anchor);
    var container = document.querySelector(target);
    var manager = createManagerMenu();
    jsUI.css.add(stylesheet + videocss);
    container.appendChild(manager);
}

async function addBadgeToDynamic() {
    var list = await newNodeTimeoutObserver('div.bili-dyn-list__items');
    newNodeMutationObserver(list, 'bili-dyn-list__item', item => {
        newNodeMutationObserver(item, 'bb-comment ', addBadgeMenuToTopic);
    });
    jsUI.css.add(stylesheet + dynamiccss);
}

function addBadgeMenuToTopic(comment) {
    addBadgeToComment(comment, 'data-usercard-mid', 'list-item reply-wrap ', 'div.reply-box', 'reply-item reply-wrap', 'a.name', 'a.name');
    var container = comment.querySelector('ul.clearfix');
    var manager = createManagerMenu();
    container.appendChild(manager);
}

function newNodeMutationObserver(node, style, callback) {
    new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.tagName === 'DIV' && node.className.startsWith(style)) {
                    callback(node);
                }
            });
        });
    }).observe(node, {childList: true, subtree: true});
}
