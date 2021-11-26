(function() {
    this.__ob5erver2 = {
        mutation: {
            new: (node, subtree = false, callback) => {
                new MutationObserver(mutationList => {
                    mutationList.forEach(mutation => {
                        var newNode = mutation.addedNodes[0];
                        if (newNode) {
                            callback(newNode);
                        }
                    });
                }).observe(node, {childList: true, subtree});
            },
            attribute: (node, subtree = false, callback) => {
                new MutationObserver(mutationList => {
                    mutationList.forEach(mutation => {
                        callback(mutation);
                    });
                }).observe(node, {attributes: true, subtree});
            }
        },
        node: ({selector, multi, iframe}, callback) => {
            var timer = 0;
            var nodes;
            var observer = setInterval(() => {
                timer ++;
                if (timer === 50) {
                    clearInterval(observer);
                }
                if (iframe) {
                    try {
                        nodes = document.querySelector(iframe).contentDocument.querySelector(selector);
                    }
                    catch(error) { return; }
                }
                else if (multi) {
                    nodes = [];
                    selector.map(sel => {
                        var node = document.querySelector(sel);
                        if (node) {
                            nodes.push(node);
                        }
                    });
                    if (nodes.length !== selector.length) {
                        return;
                    }
                }
                else {
                    nodes = document.querySelector(selector);
                }
                if (nodes) {
                    clearInterval(observer);
                    Array.isArray(nodes) ? callback(...nodes) : callback(nodes);
                }
            }, 50);
        }
    };
})();