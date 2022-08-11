/* a "calc sheet"-like selector */
function KCalcSelector (dataSource, headers) {
    this.dataSource = dataSource
    this.domNode = KDom.create('DIV')
    this.domNode.classList.add('k-calc-selector')
    this.inSelection = new Map()
    if (!(headers instanceof Map)) {
        headers = new Map(Object.entries(headers))
    }
    this.headers = headers
    this.fields = []
    this.currentSet = []
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

KCalcSelector.prototype.render = function () {
    return new Promise(resolve => {

        const searchInput = KDom.create('div')
        searchInput.classList.add('k-calc-input')
        searchInput.innerHTML = '<input type="text" value=""></input>'
        searchInput.addEventListener('input', kfwthrottle(event => {
            try {
                console.log(event.target.value)
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

KCalcSelector.prototype.addResult = function (value) {
    console.log(value)
}

KCalcSelector.prototype.showResults = function (results) {
    const idField = this.headers.get('_id')
    const added = []
    for (const result of results) {
        if (!result[idField]) { continue }
        added.push(result[idField])
        const values = ['☐']
        for (const fields of this.fields) {
            let value = ''
            for (const field of fields) {
                if (result[field] === undefined) { continue }
                if (result[field] === null) { continue }
                if (result[field] === '') { continue }
                if (Array.isArray(result[field])) {
                    value = result[field][0]
                    break
                }
                value = result[field]
            }
            values.push(value)
        }

        const node = KDom.create('DIV')
        node.id = result[idField]
        node.classList.add('k-calc-row')
        for (const value of values) {
            const field = KDom.create('DIV')
            field.innerHTML = value
            node.append(field)
        }

        node.addEventListener('click', event => {
            console.log(event)
            this.addResult(event.target.id)
        })

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