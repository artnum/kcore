function KInput (delay = 750, node = null) {
    if (node !== null) {
        this.input = node
        this.prevValue = this.input.value
    } else {
        this.input = document.createElement('INPUT')
        this.prevValue = ''
    }
    this.input.addEventListener('keyup', kdebounce(event => { this.press(event) }, delay))
    this.input.addEventListener('keydown', event => {
        if (this.prevValue === event.target.value) { return }
        window.requestAnimationFrame(() => {
            this.input.classList.add('kchanged')
        })
    })
    return this.input
}

KInput.fromNode = function (node, delay = 750) {
    return new KInput(delay, node)
}

KInput.prototype.press = function () {
    if (this.input.value === this.prevValue) {
        window.requestAnimationFrame(() => {
            this.input.classList.remove('kchanged')
        })
        return
    }
    this.input.dispatchEvent(new Event('live-pre-change', {bubbles: true, cancelable: false}))

    this.prevValue = this.input.value
    if(this.input.dispatchEvent(new Event('live-change', {bubbles: true, cancelable: true}))) {
        window.requestAnimationFrame(() => {
            this.input.classList.remove('kchanged')
        })
        return
    }
    window.requestAnimationFrame(() => {
        this.input.classList.remove('kerror')
    })
}