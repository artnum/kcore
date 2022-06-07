function KZ() {
    if (!KZ._current) { KZ._current = 0}
    return ++KZ._current
}

KZ.init = function (value) {
    KZ._current = value
}

KZ.isInit = function () {
    return KZ._current
}