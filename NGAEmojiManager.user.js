// ==UserScript==
// @name            NGA Emoji Manager
// @name:zh         NGA表情管理器
// @namespace       https://github.com/jc3213
// @version         1.0
// @description     Add/Remove New Emoji to NGA Forum
// @description:zh  向NGA论坛添加/删除新的表情组合
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
var emojiTab;
var emojiPanel;
var runOnce = {};

var subscribe = document.createElement('input');
subscribe.type = 'file';
subscribe.accept = 'application/json';
subscribe.addEventListener('change', (event) => {
    [...subscribe.files].forEach((file, index, files) => {
        var reader = new FileReader();
        reader.readAsText(file);
        reader.onload = () => {
            var json = JSON.parse(reader.result);
            emojiPackage[json.name] = json.emoji;
            if (index === files.length - 1) {
                GM_setValue('emoji', emojiPackage);
                location.reload();
            }
        };
    });
});
var manager = document.createElement('button');
manager.innerText = '添加新表情';
manager.className = 'block_txt_big';
manager.addEventListener('click', (event) => subscribe.click());

function createEmojiUI() {
console.log(emojiPackage);
    Object.keys(emojiPackage).forEach(name => {
        var tab = document.createElement('button');
        tab.className = 'block_txt_big';
        tab.innerText = name;
        emojiTab.appendChild(tab);
        var panel = document.createElement('div');
        emojiPanel.append(panel);
        tab.addEventListener('click', (event) => {
            if (event.ctrlKey) {
                if (confirm('确定要删除【'+ name + '】表情包吗？')) {
                    removeEmoji(name);
                }
            }
            else {
                addEmoji(name, emojiPackage[name], panel);
            }
        });
    });
    emojiTab.appendChild(manager);
}

function addEmoji(name, emojis, panel) {
    emojiPanel.childNodes.forEach(ePanel => {
        ePanel.style.display = ePanel === panel ? 'block' : 'none';
    });
    if (!runOnce[name]) {
        emojis.forEach(emoji => {
            var img = document.createElement('img');
            img.src = 'https://img.nga.178.com/attachments/' + emoji;
            img.style.cssText = 'height: 150px; margin: 0px 5px 5px 0px;';
            img.addEventListener('click', (event) => {
                postfunc.addText('[img]' + emoji + '[/img]');
                postfunc.selectSmilesw._.hide();
            });
            panel.appendChild(img);
        });
        runOnce[name] = true;
    }
}

function removeEmoji(name) {
    emojiTab.querySelectorAll('button').forEach((tab, index) => {
        if (tab.innerText === name) {
            tab.remove();
            emojiPanel.childNodes[index].remove();
        }
    });
    delete emojiPackage[name];
    GM_setValue('emoji', emojiPackage);
}

new MutationObserver(mutationList => {
    mutationList.forEach(mutation => {
        var newNode = mutation.addedNodes[0];
        if (newNode && newNode.id.indexOf('commonwindow') !== -1) {
            emojiTab = newNode.querySelector('div > div.div2 > div > div');
            emojiPanel = newNode.querySelector('div > div.div2 > div > span');
            createEmojiUI();
        }
    });
}).observe(document.body, {childList: true});
