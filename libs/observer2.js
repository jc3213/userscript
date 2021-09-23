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

    this.__node_observer = {
        init: 0,
        node: (selector, callback) => {
            this.__node_observer.init = setInterval(() => {
                var node = document.querySelector(selector);
                if (node) {
                    clearInterval(this.__node_observer.init);
                    callback(node);
                }
            })
        },
        iframe: (selector1, selector2, callback) => {
            this.__node_observer.node(selector1, iframe => {
                this.__node_observer.init = setInterval(() => {
                    var doc = iframe.contentDocument;
                    if (doc) {
                        var node = doc.querySelector(selector2);
                        if (node) {
                            clearInterval(this.__node_observer.init);
                            callback(node, iframe);
                        }
                    }
                });
            });
        }
    };
})();
