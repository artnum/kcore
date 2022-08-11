function KDom(node) {
    this.domNode = node
    this.chain = Promise.resolve()
    return new Proxy(this, {
        get (object, symbol) {
            if (symbol in object) {
                return Reflect.get(object, symbol, object)
            }

            if (typeof object.domNode[symbol] === 'function') {
                return object.domNode[symbol].bind(object.domNode)
            }

            return Reflect.get(object.domNode, symbol, object.domNode)
        },
        set (object, symbol, value) {
            switch (symbol) {
                case 'innerHTML': return object.setInnerHtml(value)
                case 'textContent': return object.setTextContent(value)
            }
            if (symbol in object) {
                return Reflect.set(object,symbol, value)
            }
            
            return Reflect.set(object.domNode, symbol, value)
        }
    })
}

KDom.byId = function (id) {
    const node =document.getElementById(id)
    if (node) { return new KDom(node) }
    return null
}

KDom.create = function (name) {
    return new KDom(document.createElement(name))
}

KDom.prototype.expose = function () {
    return this.domNode
}

KDom.prototype.setInnerHtml = function (value) {
    return new Promise(resolve => {
        if (!this.domNode) { return resolve() }
        window.requestAnimationFrame(() => {
            this.domNode.innerHTML = value
            resolve()
        })
    })
}

KDom.prototype.setTextContent = function (value) {
    return new Promise(resolve => {
        if (!this.domNode) { return resolve() }
        window.requestAnimationFrame(() => {
            this.domNode.textContent = value
            resolve()
        })
    })
}

KDom.prototype.query = function (selector) {
    return new Promise((resolve, reject) => {
        if (!this.domNode) { return resolve() }
        const node = this.domNode.querySelector(selector)
        if (!node) { return reject() }
        return resolve(new KDom(node))
    })
}

KDom.prototype.append = function (child) {
    return new Promise(resolve => {
        if (!this.domNode) { return resolve() }
        if (child instanceof KDom) { child = child.domNode }
        window.requestAnimationFrame(() => {
            this.domNode.appendChild(child)
            resolve()
        })
    })
}
KDom.prototype.remove = function () {
    return new Promise(resolve => {
        if (!this.domNode) { return resolve() }
        const parent = this.domNode.parentNode
        if (!parent) { return resolve() }
        window.requestAnimationFrame(() => {
            parent.removeChild(this.domNode)
            resolve()
        })
    })
}

KDom.prototype.insert = function (node, before) {
    return new Promise (resolve => {
        if (!this.domNode) { return resolve() }
        const parent = this.domNode.parentNode
        if (node instanceof KDom) { node = node.domNode }
        if (before instanceof KDom) { before = before.domNode }
        if (!parent) { return resolve() }
        window.requestAnimationFrame(() => {
            parent.insertBefore(node, before)
            resolve()
        })
    })
}

KDom.prototype.replace = function (newNode, oldNode) {
    return new Promise(resolve => {
        if (!this.domNode) { return resolve() }
        if (newNode instanceof KDom) { newNode = newNode.domNode }
        if (oldNode instanceof KDom) { oldNode = oldNode.domNode }
        window.requestAnimationFrame(() => {
            this.domNode.replaceChild(newNode, oldNode)
            resolve()
        })
    })
}