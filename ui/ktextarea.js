class KTextArea extends HTMLTextAreaElement {
    constructor() {
        super()
        console.log('is k-textarea')


    }

    dispatchEvent(event) {
        console.log(event)
        super.dispatchEvent(event)
    }
}

customElements.define('k-textarea', KTextArea, { extends: 'textarea' });