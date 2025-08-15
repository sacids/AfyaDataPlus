export function getLabel(element, type, language, langList) {
    // Return empty string if element is not an object or language is not a string
    if (!element || typeof element !== 'object' || typeof language !== 'string') {
        return '';
    }

    // Check primary label
    const primaryLabel = element[type + language];
    if (primaryLabel) {
        return primaryLabel;
    }

    // Check default label
    const defaultLabel = element[type + '::Default'];
    if (defaultLabel) {
        return defaultLabel;
    }

    // Check labels in langList order
    for (const lang of langList) {
        if (lang) {
            const label = element[type + '::' + lang];
            if (label) {

                console.log('lang label')
                return label;
            }
        }
    }

    // Fallback to empty string
    return '';
}