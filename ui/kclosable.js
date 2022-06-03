function KClosable () {
    if (KClosable.__instance) { return KClosable.__instance }
    this.index = 0
    this.stack = []
    this.mouseDown = false
    this.cancelMouseEvent = false
    window.addEventListener('mousedown', (event) => {
        if (event.button !== 0) { return }
        this.mouseDown = performance.now()
    })
    window.addEventListener('keyup', (event) => {
        if (event.key !== 'Escape') { return }
        if (this.mouseDown) { 
            this.cancelMouseEvent = true
            return
        }
        this.closeNext()
        return
    }, {capture: true})
    window.addEventListener('click', (event) => {
        if (this.cancelMouseEvent) { this.cancelMouseEvent = false; return }
        this.closeNextMouse(event.clientX + window.scrollX, event.clientY + window.scrollY)
        this.mouseDown = false
    }, {capture: true})
    KClosable.__instance = this
}

KClosable.new = function (domNode, options) {
    const kclosable = new KClosable()
    return kclosable.add(domNode, options)
}

KClosable.prototype.remove = function (index, nodispatch = false) {
    let i = 0;
    for (; i < this.stack.length; i++) {
        if (this.stack[i].index === parseInt(index)) {
            break
        }
    }
    if (i >= this.stack.length) { return }
    const closable = this.stack.splice(i, 1)
    if (!nodispatch) { this.dispatchStackChange() }
    return closable
}

KClosable.prototype.removeByFunction = function (fn) {
    let i = 0;
    for (; i < this.stack.length; i++) {
        if (this.stack[i].function === fn) {
            break
        }
    }
    if (i >= this.stack.length) { return }
    const closable = this.stack.splice(i, 1)
    this.dispatchStackChange()
    return closable
}

KClosable.prototype.putAtTop = function (index) {
    const closable = this.remove(index, true)
    if (!closable) { return }
    this.stack.unshift(closable[0])
    this.dispatchStackChange()
}

KClosable.prototype.dispatchStackChange = function () {
    this.dispatchEventToTop(new CustomEvent('klosable-top'))
    this.dispatchEventToBottom(new CustomEvent('klosable-bottom'))
}

KClosable.prototype.dispatchEventToTop = function (event) {
    if (this.stack.length < 1) { return }
    const closable = this.stack[0]
    if (closable.object && typeof closable.object.dispatchEvent === 'function') {
        closable.object.dispatchEvent(event)
    }
}

KClosable.prototype.dispatchEventToBottom = function (event) {
    for (let i = 1; i < this.stack.length; i++) {
        const closable = this.stack[i]
        if (closable.object && typeof closable.object.dispatchEvent === 'function') {
            closable.object.dispatchEvent(event)
        }
    }
}

KClosable.prototype.dispatchEventByIndex = function (index, event) {
    for (const closable of this.stack) {
        if (closable.index === parseInt(index)) {
            if (closable.object && typeof closable.object.dispatchEvent === 'function') {
                closable.object.dispatchEvent(event)
                return 
            }
        }
    }
}

KClosable.prototype.add = function (domNode, options = {}) {
    const index = ++this.index
    const closable = {
        index: index,
        time: performance.now(),
        domNode: domNode,
        before: null
    }
    if (options.mouse) {
        closable.mouse = true
    }
    if (options.function) {
        closable.function = options.function
    }
    if (options.object) {
        closable.object = options.object
    }
    if (options.parent) {
        closable.parent = options.parent
    }
    if (options.before) {
        closable.before = options.before
    }

    /* if we have domNode, we setup a focus event to put element at top of klosable */
    if (domNode) {
        if (!domNode.getAttribute('tabindex')) {
            domNode.setAttribute('tabindex', '-1')
        }
        domNode.addEventListener('focus', (event) => {
            const klosable = new KClosable()
            klosable.putAtTop(index)
        })
    }

    this.stack.unshift(closable)
    this.dispatchStackChange()
    return index
}

KClosable.prototype.closeNextMouse = function (x, y, origin = 0) {
    let i = origin
    for (; i < this.stack.length; i++) {
        if (this.stack[i].mouse && this.stack[i].domNode && this.stack[i].time < (this.mouseDown === false ? performance.now() : this.mouseDown)) {
            break
        }
    }

    if (i >= this.stack.length) { return }
    const closable = this.stack[i]
    
    let close = false

    if (!this.isClickInNode(x, y, closable.domNode)) {
        close = true
        if (closable.parent) {
            if (close && !this.isClickInNode(x, y, closable.parent)) { close = true}
            else { close = false }
        }
    }
    
    if (close) {
        this.stack.splice(i, 1)
        if (!this.closeClosable(closable)) {
            if (this.stack.length > 0) { this.closeNextMouse(x, y, ++i) }
        } else {
            this.dispatchStackChange()
        }
    } else {
        if (this.stack.length > 0) { this.closeNextMouse(x, y, ++i) }
    }
}

KClosable.prototype.isClickInNode = function (x, y, node) {
    const rect = node.getBoundingClientRect()
    const left = rect.left + window.scrollX
    const right = rect.right + window.scrollX
    const top = rect.top + window.scrollY
    const bottom = rect.bottom + window.scrollY
    return (left <= x && right >= x && top <= y && bottom >= y)
}

KClosable.prototype.closeClosable = function (closable) {
    if (!closable) { return false }
    if (closable.function) {
        if (!closable.function()) {
            return false
        }
        return true
    }
    if (closable.object) {
        if (!closable.dispatchEvent(new CustomEvent('close'))) {
            return false
        }
        return true
    }
    if (closable.domNode) {
        if (!closable.domNode.parentNode) {
            return false
        }
        window.requestAnimationFrame(() => {
            closable.domNode.parentNode.removeChild(closable.domNode)
        })
        return true
    }
    return false
}

KClosable.prototype.closeAll = function () {
    for (const closable of this.stack) {
        this.closeClosable(closable)
    }
}

KClosable.prototype.closeNext = function () {

    if (this.stack.length < 1) { return }

    /* look if there is any closable that want to be closed before 
     * useful for small dropdown that pop in pop up
     */
    for (let i = 1; i < this.stack.length; i++) {
        if (this.stack[0].index === this.stack[i].before) {
            const closable = this.stack.splice(i, 1)
            this.stack.unshift(closable[0])
            return this.closeNext()
        }
    }

    const closable = this.stack.shift()
    if (!this.closeClosable(closable)) {
        if (this.stack.length > 0) { this.closeNext() }
    } else {
        this.dispatchStackChange()
    }
}