// ==UserScript==
// @name            NGA Emoji Manager (Prototype)
// @name:zh         NGA表情管理器（雏形）
// @namespace       https://github.com/jc3213
// @version         0.2
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
    'Hiiro_Vtuber': [
        './mon_202107/09/-zue37Q2o-3836KqT1kSb4-8c.png.thumb_s.jpg',
        './mon_202107/09/-zue37Q2o-l3i5K8T8S3f-3k.jpg',
        './mon_202107/09/-zue37Q2o-8w8mKbToS5c-50.jpg.thumb_s.jpg',
        './mon_202107/09/-zue37Q2o-in5oK2lT8S3k-3k.jpg',
        './mon_202107/09/-zue37Q2o-58sbKfToS6o-6s.jpg.thumb_s.jpg',
        './mon_202107/09/-zue37Q2o-4hq7KzToS8d-8i.jpg.thumb_s.jpg',
        './mon_202107/09/-zue37Q2o-gypyKrToS68-7w.jpg.thumb_s.jpg',
        './mon_202107/09/-zue37Q2o-8mzqZdT1kSgo-go.jpg.thumb_s.jpg',
        './mon_202107/09/-zue37Q2o-khskK1hT1kSdw-d9.jpg.thumb_s.jpg',
        './mon_202107/09/-zue37Q2o-fnu7KcToS8c-38.jpg.thumb_s.jpg',
        './mon_202107/09/-zue37Q2o-4fgzK2qT3cSp0-c8.jpg.thumb_s.jpg',
        './mon_202107/09/-zue37Q2o-ezt8K4T8S22-2r.jpg',
        './mon_202107/09/-zue37Q2o-l1sgZ1kT1kSft-k6.jpg.thumb_s.jpg',
        './mon_202107/09/-zue37Q2o-dz94K1kToS8o-e4.jpg.thumb_s.jpg',
        './mon_202107/09/-zue37Q2o-1mi3KeToS3z-3p.jpg.thumb_s.jpg',
        './mon_202107/09/-zue37Q2o-ewzgKhToS5k-5k.jpg.thumb_s.jpg',
        './mon_202107/09/-zue37Q2o-57hzK1hT1kScx-c0.jpg.thumb_s.jpg',
        './mon_202107/09/-zue37Q2o-js1lK23T1kShs-hs.jpg.thumb_s.jpg',
        './mon_202107/09/-zue37Q2o-aityK1qT3cSij-cr.jpg.thumb_s.jpg',
        './mon_202107/09/-zue37Q2o-bfl1K1fT1kSa0-e8.jpg.thumb_s.jpg',
        './mon_202107/09/-zue37Q2o-crrdKqT1kS9m-7w.jpg.thumb_s.jpg',
        './mon_202107/09/-zue37Q2o-1hopK11ToS8h-ap.jpg.thumb_s.jpg',
        './mon_202107/09/-zue37Q2o-421hKhT1kSb0-2v.jpg.thumb_s.jpg',
        './mon_202107/09/-zue37Q2o-dx16K1cT1kSb0-al.jpg.thumb_s.jpg',
        './mon_202107/09/-zue37Q2o-d6t0ZiT3cSu0-ta.jpg.thumb_s.jpg',
        './mon_202107/09/-zue37Q2o-8fejZdT1kSg4-g4.jpg.thumb_s.jpg',
        './mon_202107/09/-zue37Q2o-74w3K1gT1kSd8-dc.jpg.thumb_s.jpg',
        './mon_202107/09/-zue37Q2o-gobtK16T1kSbt-bs.jpg.thumb_s.jpg',
        './mon_202107/09/-zue37Q2o-8zn3KxToS7d-7i.jpg.thumb_s.jpg',
        './mon_202107/09/-zue37Q2o-iizwK18ToS3q-4s.jpg.thumb_s.jpg'
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
        tab.addEventListener('click', () => addEmoji(name, package[name], panel));
    });
}

function addEmoji(name, emojis, panel) {
    panel.style.display = 'block';
    if (!runOnce[name]) {
        emojis.forEach(emoji => {
            var img = document.createElement('img');
            img.src = 'https://img.nga.178.com/attachments/' + emoji;
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
}

new MutationObserver(mutationList => {
    mutationList.forEach(mutation => {
        var newNode = mutation.addedNodes[0];
        if (newNode && /commonwindow\d+/.test(newNode.id)) {
            emojiTab = newNode.querySelector('div > div.div2 > div > div');
            emojiPanel = newNode.querySelector('div > div.div2 > div > span');
            createEmojiUI();
        }
    });
}).observe(document.body, {childList: true});
