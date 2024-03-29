/* a "calc sheet"-like selector */
function KCalcSelector (dataSource, headers, title = '') {
    this.dataSource = dataSource
    this.domNode = KDom.create('DIV')
    this.domNode.classList.add('k-calc-selector')
    this.domNode.setAttribute('tabindex', '0')
    this.inSelection = new Map()
    if (!(headers instanceof Map)) {
        headers = new Map(Object.entries(headers))
    }
    this.headers = headers
    this.fields = []
    this.currentSet = []
    this.selected = []
    this.evtTarget = new EventTarget()
    this.title = title
}

KCalcSelector.prototype.addEventListener = function (type, callback, options) {
    this.evtTarget.addEventListener(type, callback, options)
}

KCalcSelector.prototype.removeEventListener = function (type, callback, options) {
    this.evtTarget.removeEventListener(type, callback, options)
}

KCalcSelector.prototype.getNode = function () {
    return this.domNode.expose()
}

KCalcSelector.prototype.search = function (value) {
    return new Promise((resolve, reject) => {
        if (value === undefined) { return resolve([]) }
        if (value === null) { return resolve([]) }
        if (value === '') { return resolve([]) }
        this.dataSource.query(value)
        .then(results => {
            return resolve(results)
        })
        .catch(error => {
            throw new Error('Erreur recherche', {cause: error})
        })
    })
}

KCalcSelector.prototype.clearResults = function () {
    return new Promise((resolve) => {
        this.domNode.query('div.k-calc-body')
        .then(node => {
            window.requestAnimationFrame(() => node.innerHTML = '')
        })
        .catch(() => {})       
    })
}

KCalcSelector.prototype.render = function () {
    return new Promise(resolve => {
        const searchInput = KDom.create('div')
        searchInput.classList.add('k-calc-input')
        searchInput.innerHTML = `<input type="text" placeholder="${this.title}" value=""></input>`
        this.domNode.addEventListener('keyup', event => {
            const input = searchInput.querySelector('input')
            if (event.key === 'Escape') {
                this.clearResults()
                input.value = ''
            }
        }, {capture: true})
        searchInput.addEventListener('input', kfwthrottle(event => {
            try {
                this.search(event.target.value)
                .then(results => {
                    this.showResults(results)
                })
                .catch(error => {
                    throw new Error('Erreur', {cause: error})
                })
            } catch(error) {
                console.error(new Error('Un erreur a eu lieu', {cause: error}))
                this.showResults([])
            }
        }, 250), {passive: true})

        this.domNode.query('div.k-calc-input')
        .then(node => {
            this.domNode.replace(searchInput, node)
        })
        .catch(() => {
            this.domNode.append(searchInput)
        })

        const head = KDom.create('div')
        head.classList.add('k-calc-head')
        for (const [k, v] of this.headers) {
            if (k.startsWith('_') && k !== '_id') { continue } 

            if (k !== '_id') { this.fields.push(k.split('|').filter(e => e !== '')) }
            
            const field = KDom.create('div')
            field.dataset.name = k
            if (k === '_id') {
                field.innerHTML = ' '
            } else {
                field.innerHTML = v
            }
            field.classList.add('k-calc-head-field')
            head.append(field)
        }
        this.domNode.query('div.k-calc-head')
        .then(node => {
            this.domNode.replace(head, node)
        })
        .catch(() => {
            this.domNode.append(head)
        })

        this.domNode.style.setProperty('--columns', this.fields.length)

        const selected = KDom.create('div')
        selected.classList.add('k-calc-selected')
        this.domNode.query('div.k-calc-body')
        .then(node => {
            this.domNode.replace(selected, node)
        })
        .catch(() => {
            this.domNode.append(selected)
        })

        for (const x of this.selected ) {
            this.getResult(x)
            .then(node => {
                selected.append(node)
            })
        }

        const body = KDom.create('div')
        body.classList.add('k-calc-body')
        this.domNode.query('div.k-calc-body')
        .then(node => {
            this.domNode.replace(body, node)
        })
        .catch(() => {
            this.domNode.append(body)
        })
        
        return resolve(this.getNode())
    })
}

KCalcSelector.prototype.getResult = function (value) {
    return new Promise((resolve, reject) => {
        this.dataSource.get(value)
        .then(x => {
            const node = this.makeEntry(x)
            node.classList.add('k-selected')
            resolve(node)
        })
    })
}

KCalcSelector.prototype.hasResult = function (value) {
    return this.selected.indexOf(value) !== -1
}

KCalcSelector.prototype.removeResult = function (value) {
    const idx = this.selected.indexOf(value)
    if (idx === -1) { return }
    this.selected.splice(idx, 1)
}

KCalcSelector.prototype.addResult = function (value) {
    this.selected.push(value)
}

KCalcSelector.prototype.makeEntry = function (entry) {
    const idField = this.headers.get('_id')
    
    const values = ['']
    for (const fields of this.fields) {
        let value = ''
        for (const field of fields) {
            if (entry[field] === undefined) { continue }
            if (entry[field] === null) { continue }
            if (entry[field] === '') { continue }
            if (Array.isArray(entry[field])) {
                value = entry[field][0]
                break
            }
            value = entry[field]
        }
        values.push(value)
    }

    const node = KDom.create('DIV')
    node.id = entry[idField]
    node.classList.add('k-calc-row')
    for (const value of values) {
        const field = KDom.create('DIV')
        field.innerHTML = value
        node.append(field)
    }

    node.addEventListener('click', event => {
        const node = event.currentTarget
        if (this.hasResult(node.id)) {
            if (!this.evtTarget.dispatchEvent(new CustomEvent('remove-selection', {detail: node.id, cancelable: true}))) { return }
            this.domNode.query('div.k-calc-body')
            .then(newParent => {
                window.requestAnimationFrame(() => {
                    node.classList.remove('k-selected')
                    node.parentNode.removeChild(node)
                    newParent.insertBefore(node, newParent.firstChild)
                })
            }) 
            this.removeResult(node.id)
            return 
        }

        if (!this.evtTarget.dispatchEvent(new CustomEvent('add-selection', {detail: node.id, cancelable: true}))) { return }
        this.domNode.query('div.k-calc-selected')
        .then(newParent => {
            window.requestAnimationFrame(() => {
                node.classList.add('k-selected')
                node.parentNode.removeChild(node)
                newParent.insertBefore(node, newParent.firstChild)
            })
        })
        this.addResult(node.id)
    })
    return node
}

KCalcSelector.prototype.showResults = function (results) {
    const idField = this.headers.get('_id')
    const added = []
    for (const result of results) {
        if (!result[idField]) { continue }
        added.push(result[idField])
        
        const node = this.makeEntry(result)

        this.domNode.query('div.k-calc-body')
        .then(body => {
            const prev = KDom.byId(node.id)
            if (!prev) { body.append(node) }
        })
        .catch(error => {
            console.error(new Error('Body manquant', {cause: error}))
        })
    }
    this.domNode.query('div.k-calc-body')
    .then(body => {
        for (const actualNode of body.children) {
            if (added.indexOf(actualNode.id) !== -1) { continue }
            const n = new KDom(actualNode)
            n.remove()
        }
    })
    this.currentSet = [...added]
}

KCalcSelector.prototype.getSelection = function () {
    return this.selected
}

KCalcSelector.prototype.setSelection = function (selection) {
    if (!Array.isArray(selection)) { selection = [selection]}
    this.selected = selection
    
}