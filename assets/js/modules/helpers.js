// ฟังก์ชันช่วยเหลือต่างๆ ที่ใช้ในโปรแกรม

export function isLocalStorageAvailable() {
    try {
        const x = '__storage_test__';
        window.localStorage.setItem(x, x);
        window.localStorage.removeItem(x);
        return true;
    } catch (e) { return false; }
}

export function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

export function getYoutubeVideoId(url) {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

export function superParse(textData) {
    if (!textData) return null;
    const jsonStartIndex = textData.lastIndexOf('::');
    if (jsonStartIndex !== -1) {
        const potentialJson = textData.substring(jsonStartIndex + 2);
        try {
            return JSON.parse(potentialJson);
        } catch (e) {
            console.error("Failed to parse extracted JSON:", e, "Data:", potentialJson);
            return null;
        }
    }
    try {
        return JSON.parse(textData);
    } catch (e) {
        console.error("Failed to parse text as plain JSON:", e);
    }
    return null;
}

export function safeEvaluate(formula, value) {
    try {
        if (typeof value !== 'number' || !isFinite(value)) return value;
        // Basic security check for formula
        if (/[^x\d\s()+\-*/.]/.test(formula)) {
            console.error("Invalid characters in formula:", formula);
            return value;
        }
        const func = new Function('x', `return ${formula}`);
        const result = func(value);
        return typeof result === 'number' && isFinite(result) ? result : value;
    } catch (e) {
        console.error(`Error evaluating formula "${formula}":`, e);
        return value;
    }
}
