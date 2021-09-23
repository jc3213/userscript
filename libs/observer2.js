(function() {
    this.__mutation_observer = {
        node: (node, subtree = false, callback) => {
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
    };

    this.__node_observer = (selector, callback) => {
        nodeObserver(() => {
            try {
                if (typeof selector === 'object') {
                    return document.querySelector(selector.iframe).contentDocument.querySelector(selector.node);
                }
                else if (Array.isArray(selector)) {
                    var nodes = selector.filter(node => document.querySelector(node) !== undefined);
                    if (nodes.length === selector.length) {
                        return nodes;
                    }
                }
                else {
                    return document.querySelector(selector);
                }
            }
            catch(error) {
                return null;
            }
        }, callback);
    };

    function nodeObserver(callback1, callback2) {
        var observer = setInterval(() => {
            var node = callback1();
            if (node) {
                clearInterval(observer);
                callback2(node);
            }
        });
    }
})();
