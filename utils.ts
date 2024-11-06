export const findSentenceStart = (text: string, index: number) => {
    for (let i = index; i >= 0; i--) {
        if (
            text[i] === "." ||
            text[i] === "!" ||
            text[i] === "?" ||
            i === 0
        ) {
            return i === 0 ? 0 : i + 1;
        }
    }
    return 0;
};

export const findSentenceEnd = (text: string, index: number) => {
    for (let i = index; i < text.length; i++) {
        if (
            text[i] === "." ||
            text[i] === "!" ||
            text[i] === "?" ||
            i === text.length - 1
        ) {
            return i === text.length - 1 ? text.length : i + 1;
        }
    }
    return text.length;
};