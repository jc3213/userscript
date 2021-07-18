// ==UserScript==
// @name            NGA Emoji Manager (Prototype)
// @name:zh         NGA表情管理器（雏形）
// @namespace       https://github.com/jc3213
// @version         0.3
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

var emojiTab;
var emojiPanel;
var runOnce = {};
var package = {
    '神楽めあ(Asa)': [
        './mon_202107/18/-zue37Q2o-gauqKoT1kS9f-6y.jpg',
        './mon_202107/18/-zue37Q2o-4excKxToS6y-6y.jpg',
        './mon_202107/18/-zue37Q2o-dpesKxT1kSb4-6y.jpg',
        './mon_202107/18/-zue37Q2o-uuiKsT1kSd4-6y.jpg',
        './mon_202107/18/-zue37Q2o-9pkwKjT1kSab-6y.jpg',
        './mon_202107/18/-zue37Q2o-itqvKmToS77-6y.jpg',
        './mon_202107/18/-zue37Q2o-6ui5KtT1kSb4-6y.jpg',
        './mon_202107/18/-zue37Q2o-fz14KlToS8o-6y.jpg',
        './mon_202107/18/-zue37Q2o-6okkKvT1kS9w-6y.jpg',
        './mon_202107/18/-zue37Q2o-qorK14T1kSbs-6y.jpg',
        './mon_202107/18/-zue37Q2o-ar1vKxT1kSb3-6y.jpg',
        './mon_202107/18/-zue37Q2o-2emiKmToS80-6y.jpg',
        './mon_202107/18/-zue37Q2o-bqpwKqT1kSce-6y.jpg',
        './mon_202107/18/-zue37Q2o-kwpjKiToS7c-6y.jpg',
        './mon_202107/18/-zue37Q2o-8413K10T1kScd-6y.jpg',
        './mon_202107/18/-zue37Q2o-h791KoToS7u-6y.jpg',
        './mon_202107/18/-zue37Q2o-4ympK13T1kSc6-6y.jpg',
        './mon_202107/18/-zue37Q2o-dw3pKlToS7c-6y.jpg',
        './mon_202107/18/-zue37Q2o-lefKiToS6z-6y.jpg',
        './mon_202107/18/-zue37Q2o-amtaKgToS6f-6y.jpg',
        './mon_202107/18/-zue37Q2o-k9txKjToS6w-6y.jpg',
        './mon_202107/18/-zue37Q2o-8lljKlT1kS9w-6y.jpg',
        './mon_202107/18/-zue37Q2o-ie46K11T1kSb4-6y.jpg',
        './mon_202107/18/-zue37Q2o-9zldKnToS6k-6y.jpg',
        './mon_202107/18/-zue37Q2o-j8ywKjToS70-6y.jpg',
        './mon_202107/18/-zue37Q2o-6uppKwT1kSb4-6y.jpg',
        './mon_202107/18/-zue37Q2o-i2u7K1aT1kSb3-6y.jpg',
        './mon_202107/18/-zue37Q2o-6fbyKkToS6y-6y.jpg',
        './mon_202107/18/-zue37Q2o-g5meKjT1kSb4-6y.jpg',
        './mon_202107/18/-zue37Q2o-405rKwT1kSdk-6y.jpg',
        './mon_202107/18/-zue37Q2o-cgzaKlToS8u-6y.jpg',
        './mon_202107/18/-zue37Q2o-b71KrToS77-6y.jpg',
        './mon_202107/18/-zue37Q2o-9mpzK12T1kSb4-6y.jpg',
        './mon_202107/18/-zue37Q2o-ixnlKmToS7s-6y.jpg',
        './mon_202107/18/-zue37Q2o-6kmyKvT1kSbf-6y.jpg',
        './mon_202107/18/-zue37Q2o-2bgKwToS82-6y.jpg',
        './mon_202107/18/-zue37Q2o-enfcKlT1kS9k-6y.jpg',
        './mon_202107/18/-zue37Q2o-7zxwK1fT1kScp-6y.jpg',
        './mon_202107/18/-zue37Q2o-hr0dKpToS8a-6y.jpg',
        './mon_202107/18/-zue37Q2o-49wrKoToS77-6y.jpg',
        './mon_202107/18/-zue37Q2o-dje2KmToS7b-6y.jpg',
        './mon_202107/18/-zue37Q2o-26grKoT1kSa0-6y.jpg',
        './mon_202107/18/-zue37Q2o-bnxiKjToS79-6y.jpg',
        './mon_202107/18/-zue37Q2o-1bnK1bT1kSb4-6y.jpg'
    ]
};

function createEmojiUI() {
    Object.keys(package).forEach(name => {
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
                addEmoji(name, package[name], panel);
            }
        });
    });
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
    delete package[name];
    emojiTab.querySelectorAll('button').forEach((tab, index) => {
        if (tab.innerText === name) {
            tab.remove();
            emojiPanel.childNodes[index].remove();
        }
    });
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
