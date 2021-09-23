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
        node: (selector, callback) => {
            var nodes;
            var observer = setInterval(() => {
                if (typeof selector === 'object') {
                    try {
                        nodes = document.querySelector(selector.iframe).contentDocument.querySelector(selector.node);
                    }
                    catch(error) { return; }
                }
                else if (Array.isArray(selector)) {
                    var nodes = selector.filter(node => document.querySelector(node) !== undefined);
                    if (nodes.length !== selector.length) {
                        return;
                    }
                }
                else {
                    nodes = document.querySelector(selector);
                }
                if (nodes) {
                    clearInterval(observer);
                    callback(nodes);
                }
            });
        }
    };
})();
