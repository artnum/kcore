function KMultiSelectUI (store, selected = [], newCallback = null) {
    this.domNode = document.createElement('DIV')
    this.domNode.classList.add('kmultiselect')
    this.store = store
    this.selected = selected.map(s => String(s))
    this.newCallback = newCallback
}

KMultiSelectUI.prototype.render = function () {
    this.store.query('*')
    .then(options => {
        options.sort((a, b) => String(a.name).localeCompare(String(b.name)))
        Promise.all(options.map(o => {
            return new Promise(resolve => {
                const node = document.createElement('DIV')
                node.dataset.value = o.value
                node.innerHTML = `<span class="check"><input type="checkbox" /></span><span name="name">${o.label}</span><span class="description">${o.description ?? ''}</span>`
                node.addEventListener('click', event => { this.selectItem(event.currentTarget) })

                window.requestAnimationFrame(() => {
                    const prev = this.domNode.querySelector(`div[data-value="${node.dataset.value}"]`)
                    if (prev) { this.domNode.replaceChild(node, prev); return resolve() }
                    this.domNode.appendChild(node)
                    return resolve()
                })
            })
        }))
        .then(_ => {
            if (!this.newCallback) { return Promise.resolve() }
            return new Promise(resolve => {
                const node = document.createElement('DIV')
                node.classList.add('add-new')
                node.innerHTML = `<span class="check">+</span><span name="name">Ajouter</span>`
                node.addEventListener('click', event => { this.selectItem(event.currentTarget) })
                window.requestAnimationFrame(() => {
                    const prev = this.domNode.querySelector('div.add-new')
                    if (prev) {
                        this.domNode.removeChild(prev)
                    }
                    this.domNode.appendChild(node)
                    return resolve()
                })
            })
        })
        .then(_ => {
            this.renderSelected()
        })
    })
}

KMultiSelectUI.prototype.renderSelected = function () {
    let order = 0
    for (let node = this.domNode.firstElementChild; node; node = node.nextElementSibling) {
        if (!node) { continue }
        if (!node.dataset.value) { continue }
        order++
        if (this.selected.indexOf(node.dataset.value) !== -1) {
            window.requestAnimationFrame(() => {
                node.firstElementChild.innerHTML = '<input type="checkbox" checked />'
                node.classList.add('selected')
                node.style.order = order
            })
        } else {
            window.requestAnimationFrame(() => {
                node.firstElementChild.innerHTML = '<input type="checkbox" />'
                node.classList.remove('selected')
                node.style.order = order * 100
            })
        }
    }
}

KMultiSelectUI.prototype.selectItem = function (item) {
    if (!item.dataset.value) {
        if (!this.newCallback) { return }
        this.newCallback()
        .then(_ => {
            this.render()
        })
        return
    }
    const value = item.dataset.value
    const idx = this.selected.indexOf(value)
    if (idx === -1) {
        this.selected.push(value)
    } else {
        this.selected.splice(idx, 1)
    }
    this.renderSelected()
}

KMultiSelectUI.prototype.getSelected = function () {
    return Promise.resolve(this.selected)
}