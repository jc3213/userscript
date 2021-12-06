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
        node: (selector, frame, callback) => {
            var resolve = typeof callback === 'function' ? callback : typeof frame === 'function' ? frame : null;
            var iframe = typeof frame === 'string' ? frame : null;
            var timeout = 0;
            var nodes;
            var observer = setInterval(() => {
                timeout ++;
                if (timeout === 50) {
                    clearInterval(observer);
                }
                if (iframe) {
                    try {
                        nodes = document.querySelector(iframe).contentDocument.querySelector(selector);
                    }
                    catch(error) { return; }
                }
                else if (Array.isArray(selector)) {
                    nodes = [];
                    selector.forEach(item => {
                        var node = document.querySelector(item);
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
                    Array.isArray(nodes) ? resolve(...nodes) : resolve(nodes);
                }
            }, 50);
        }
    };
})();
