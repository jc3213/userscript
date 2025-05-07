// ==UserScript==
// @name            NGA User Blocker
// @name:zh         NGA表情管理器
// @namespace       https://github.com/jc3213/userscript
// @version         0.2
// @description     Block user posts and quotes on NGA
// @description:zh  屏蔽用户的发言跟与之相关的引用
// @author          jc3213
// @match           *://bbs.nga.cn/thread.php?*
// @match           *://bbs.nga.cn/read.php?*
// @match           *://ngabbs.com/thread.php?*
// @match           *://ngabbs.com/read.php?*
// @match           *://nga.178.com/thread.php?*
// @match           *://nga.178.com/read.php?*
// @grant           GM_setValue
// @grant           GM_getValue
// ==/UserScript==

let storage = GM_getValue('block', []);
let blocker = new Set(storage);

function blockPosts(posts) {
    [...posts].forEach((post) => {
        if (post.localName !== 'table') {
            return;
        }

        let title = post.children[0].children[0].children[0].children[0].children[0];
        let body = title.children;
        let user = body[1].textContent;
        let id = body[body.length - 1].textContent;

        if (blocker.has(id)) {
            post.style.display = 'none';
        }

        let quote = post.children[0].children[0].children[1].children[4].children[2].children[0];
        if (quote.localName === 'div' && quote.className === 'quote') {
            let quser = quote.children[2];
            let qname = quser.textContent;
            let qid = quser.href.slice(quser.href.lastIndexOf('=') + 1);
            if (blocker.has(qid)) {
                quote.textContent = `${qname}已被屏蔽……`;
            }
        }

        let button = document.createElement('button');
        button.id = id;
        button.title = `屏蔽用户[${user}]`;
        button.textContent = '屏蔽此人';
        button.style.cssText = 'margin-left: 5px;';
        button.addEventListener('click', blockThisUser);
        button.post = post;
        title.appendChild(button);
    });
}

function blockThisUser(event) {
    let {id, title, post} = event.target;
    if (confirm(`确定要${title}吗？`)) {
        blocker.add(id);
        post.style.display = 'none';
        GM_setValue('block', [...blocker]);
    }
}

new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        let post = mutation.addedNodes[0];
        if (post && post.id === 'm_posts') {
            setTimeout(() => blockPosts(post.children[0].children), 100);
        }
    });

}).observe(document.getElementById('mc'), { childList: true, subtree: true });

blockPosts(document.getElementById('m_posts_c').children);
