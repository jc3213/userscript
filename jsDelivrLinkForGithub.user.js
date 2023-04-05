// ==UserScript==
// @name         jsDelivr link for Github
// @namespace    https://github.com/jc3213/userscript
// @version      0.3.0
// @description  Add a button to copy jsdelivr link for github files
// @author       jc3213
// @match        https://github.com/*
// @require      https://cdn.jsdelivr.net/gh/jc3213/jslib@ceaca1a2060344909a408a1e157e3cd23e4dbfe0/js/nodeobserver.js#sha256-R3ptp1LZaBZu70+IAJ9KX1CJ7BN4wyrANtHb48wlROc=
// @run-at       document-idle
// ==/UserScript==

var where;
var whatis;
var components;
var stylecss;
var jsdelivr;

new MutationObserver(mutations => {
    if (where !== location.pathname) {
        where = location.pathname;
        components = where.split('/');
        whatis = components[3];
        jsdelivr = 'https://cdn.jsdelivr.net/gh/' + components[1] + '/' + components[2] + '@';
        components.splice(0, 4);
        if (whatis === 'blob') {
            stylecss = 'scale: 1.5;';
            newNodeTimeoutObserver('#spoof-warning + div + div > div > :nth-child(2) > :nth-child(2) > :nth-child(2)').then(createJSDelivrButton);
        }
        else if (whatis === 'commit') {
            stylecss = 'scale: 2; top: 10px;';
            newNodeTimeoutObserver('div.js-diff-progressive-container').then(async files => {
                files.querySelectorAll('span.Truncate').forEach(createJSDelivrButton);
            });
        }
    }
}).observe(document.head, {childList: true});

function createJSDelivrButton(menu) {
    var copy = document.createElement('div');
    if (whatis === 'blob') {
        copy.url = jsdelivr + components.join('/');
    }
    else if (whatis === 'commit') {
        copy.url = jsdelivr + [...components].pop() + '/' + menu.querySelector('a').title;
    }
    copy.className = 'd-inline-block btn-octicon';
    copy.innerText = '🖹';
    copy.title = 'Copy jsdelivr link'
    copy.style.cssText = 'position: relative; user-select: none; cursor: pointer; ' + stylecss;
    copy.addEventListener('mousedown', ({button}) => {
        if (button === 0) {
            navigator.clipboard.writeText(copy.url);
        }
        else if (button === 1) {
            open(copy.url);
        }
    });
    menu.appendChild(copy)
}
