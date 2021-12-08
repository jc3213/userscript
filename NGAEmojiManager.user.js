// ==UserScript==
// @name            NGA Emoji Manager
// @name:zh         NGA表情管理器
// @namespace       https://github.com/jc3213
// @version         1.8
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

var emojiPackage = GM_getValue('emoji', []);
var emojiRunOnce = {};
var emojiTab;
var emojiPanel;
var emojiOrigin;

var subscribe = document.createElement('input');
subscribe.type = 'file';
subscribe.accept = 'application/json';
subscribe.addEventListener('change', event => {
    [...subscribe.files].forEach((file, index, files) => {
        var reader = new FileReader();
        reader.readAsText(file);
        reader.onload = () => {
            var json = JSON.parse(reader.result);
            var find = emojiPackage.findIndex(package => package.name === json.name);
            find = find === -1 ? emojiPackage.length : find;
            emojiPackage[find] = json;
            createEmojiUI(json, find);
            if (index === files.length - 1) {
                GM_setValue('emoji', emojiPackage);
            }
        };
    });
});

var manager = document.createElement('button');
manager.innerText = '添加新表情';
manager.className = 'block_txt_big';
manager.addEventListener('click', event => subscribe.click());

function createEmojiUI({name, author, emoji}, index) {
    var panel = emojiPanel.childNodes[index + emojiOrigin];
    if (panel) {
        panel.innerHTML = '';
        addEmoji(emoji, panel);
    }
    else {
        var tab = document.createElement('button');
        tab.className = 'block_txt_big';
        tab.innerText = name;
        tab.title = '制作者： ' + author;
        manager.before(tab);
        panel = document.createElement('div');
        emojiPanel.append(panel);
        tab.addEventListener('click', event => {
            if (event.ctrlKey && confirm('确定要删除表情包【'+ name + '】吗？')) {
                emojiPackage.splice(index, 1);
                delete emojiRunOnce[name];
                GM_setValue('emoji', emojiPackage);
                tab.remove();
                panel.remove();
            }
            else {
                emojiPanel.childNodes.forEach(ePanel => {
                    ePanel.style.display = ePanel === panel ? 'block' : 'none';
                });
                if (!emojiRunOnce[name]) {
                    addEmoji(emoji, panel);
                    emojiRunOnce[name] = true;
                }
            }
        });
    }
}

function addEmoji(package, panel) {
    package.forEach(emoji => {
        var img = document.createElement('img');
        img.src = 'https://img.nga.178.com/attachments/' + emoji;
        img.style.cssText = 'max-height: 100px; margin: 0px 5px 5px 0px;';
        img.addEventListener('click', event => {
            postfunc.addText('[img]' + emoji + '[/img]');
            postfunc.selectSmilesw._.hide();
        });
        panel.appendChild(img);
    });
}

new MutationObserver(mutationList => {
    mutationList.forEach(mutation => {
        var newNode = mutation.addedNodes[0];
        if (newNode && newNode.id.startsWith('commonwindow')) {
            emojiTab = newNode.querySelector('div > div.div2 > div > div');
            emojiPanel = newNode.querySelector('div > div.div2 > div > span');
            emojiOrigin = emojiPanel.childNodes.length;
            emojiTab.appendChild(manager);
            emojiPackage.forEach(createEmojiUI);
        }
    });
}).observe(document.body, {childList: true});
