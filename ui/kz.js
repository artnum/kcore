function KZ() {
    if (!KZ._current) { KZ._current = 0}
    return ++KZ._current
}