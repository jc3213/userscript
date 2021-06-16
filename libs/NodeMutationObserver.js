function newNodeObserver(node, callback) {
    new MutationObserver((list) => {
        list.forEach(mutation => {
            var newNode = mutation.addedNodes[0];
            if (newNode) {
                callback(newNode);
            }
        });
    }).observe(node, {childList: true, subtree: true});
}
