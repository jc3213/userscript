// ==UserScript==
// @name            NGA Emoji Manager
// @name:zh         NGA表情管理器
// @namespace       https://github.com/jc3213
// @version         1.3
// @description     Add/Remove New Emoji to NGA Forum
// @description:zh  为NGA论坛添加/删除新表情
// @author          jc3213
// @match           *://bbs.nga.cn/thread.php?*
// @match           *://bbs.nga.cn/read.php?*
// @match           *://bbs.nga.cn/post.php?*
// @match           *://ngabbs.com/thread.php?*
// @match           *://ngabbs.com/read.php?*
// @match           *://ngabbs.com/post.php?*
// @match           *://nga.178.com/thread.php?*
// @match           *://nga.178.com/read.php?*
// @match           *://nga.178.com/post.php?*
// @grant           GM_setValue
// @grant           GM_getValue
// ==/UserScript==

var emojiPackage = GM_getValue('emoji', {});
var emojiRunOnce = {};
var emojiTab;
var emojiPanel;

if (GM_info.script.version < 1.3) {
    Object.keys(emojiPackage).forEach(key => {
        emojiPackage[key] = {emoji: emojiPackage[key]};
    });
    GM_setValue('emoji', emojiPackage);
}
var subscribe = document.createElement('input');
subscribe.type = 'file';
subscribe.accept = 'application/json';
subscribe.addEventListener('change', (event) => {
    [...subscribe.files].forEach((file, index, files) => {
        var reader = new FileReader();
        reader.readAsText(file);
        reader.onload = () => {
            var {name, author, emoji} = JSON.parse(reader.result);
            emojiPackage[name] = {author, emoji};
            createEmojiUI(name, author);
            if (index === files.length - 1) {
                GM_setValue('emoji', emojiPackage);
            }
        };
    });
});
var manager = document.createElement('button');
manager.innerText = '添加新表情';
manager.className = 'block_txt_big';
manager.addEventListener('click', (event) => subscribe.click());

function createEmojiUI(name, author = 'https://ngabbs.com/read.php?tid=27660394&page=1#pid533428178Anchor') {
    var tab = document.createElement('button');
    tab.className = 'block_txt_big';
    tab.innerText = name;
    tab.title = '制作者： ' + author;
    manager.before(tab);
    var panel = document.createElement('div');
    emojiPanel.append(panel);
    tab.addEventListener('click', (event) => {
        if (event.ctrlKey && confirm('确定要删除【'+ name + '】表情包吗？')) {
            delete emojiPackage[name];
            delete emojiRunOnce[name];
            GM_setValue('emoji', emojiPackage);
            tab.remove();
            panel.remove();
        }
        else {
            addEmoji(name, panel);
        }
    });
}

function addEmoji(name, panel) {
    emojiPanel.childNodes.forEach(ePanel => {
        ePanel.style.display = ePanel === panel ? 'block' : 'none';
    });
    if (!emojiRunOnce[name]) {
        emojiPackage[name].emoji.forEach(emoji => {
            var img = document.createElement('img');
            img.src = 'https://img.nga.178.com/attachments/' + emoji;
            img.style.cssText = 'max-height: 150px; margin: 0px 5px 5px 0px;';
            img.addEventListener('click', (event) => {
                postfunc.addText('[img]' + emoji + '[/img]');
                postfunc.selectSmilesw._.hide();
            });
            panel.appendChild(img);
        });
        emojiRunOnce[name] = true;
    }
}

new MutationObserver(mutationList => {
    mutationList.forEach(mutation => {
        var newNode = mutation.addedNodes[0];
        if (newNode && newNode.id.indexOf('commonwindow') !== -1) {
            emojiTab = newNode.querySelector('div > div.div2 > div > div');
            emojiPanel = newNode.querySelector('div > div.div2 > div > span');
            emojiTab.appendChild(manager);
            Object.keys(emojiPackage).forEach(createEmojiUI);
        }
    });
}).observe(document.body, {childList: true});
