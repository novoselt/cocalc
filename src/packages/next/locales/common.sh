LANGS="en de fr es zh"

check_api_key() {
    if [ -z "${SIMPLELOCALIZE_KEY_NEXT}" ]; then
        echo "Error: SIMPLELOCALIZE_KEY_NEXT is not set or is empty. Please provide a valid API key for the CoCalc Pages project." >&2
        exit 1
    fi
}
