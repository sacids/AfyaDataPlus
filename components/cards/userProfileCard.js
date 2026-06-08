import { StyleSheet, Text, View } from 'react-native';

// Helper function to turn camelCase or snake_case keys into readable titles
// e.g., "globalUsername" or "global_username" -> "Global Username"
const formatLabel = (key, translationFn) => {
    // Optional: If you prefer using your i18n translation file for specific keys
    const translationKey = `auth:${key}`;
    const translated = translationFn(translationKey);
    if (translated !== translationKey) return translated;

    // Fallback to auto-formatting the raw key string cleanly
    return key
        .replace(/([A-Z])/g, ' $1') // Split camelCase
        .replace(/_/g, ' ')         // Split snake_case
        .trim()
        .replace(/^\w/, (c) => c.toUpperCase()); // Capitalize first letter
};



const UserProfileCard = ({ user, globalStyles, localStyles, t }) => {

    // Define keys you strictly want to exclude from the UI
    const excludedKeys = ['password', 'token', 'id', 'secret', 'deviceId', 'original_uuid'];

    // Safeguard to handle empty states gracefully
    if (!user || typeof user !== 'object') {
        return (
            <View style={globalStyles.card}>
                <Text style={globalStyles.sectionTitle}>{t('settings:userProfile')}</Text>
                <Text style={globalStyles.bodyText}>No profile details available</Text>
            </View>
        );
    }

    return (
        <View style={[globalStyles.card, styles.cardContainer]}>
            <Text style={[globalStyles.sectionTitle, styles.sectionTitleSpacing]}>
                {t('settings:userProfile')}
            </Text>

            {Object.entries(user)
                .filter(([key]) => !excludedKeys.includes(key.toLowerCase()))
                .map(([key, value]) => {
                    // Safe string conversion for rendering text nodes safely
                    let displayValue = 'N/A';

                    if (value !== null && value !== undefined) {
                        if (typeof value === 'object') {
                            displayValue = Array.isArray(value) ? value.join(', ') : JSON.stringify(value);
                        } else {
                            displayValue = String(value);
                        }
                    }

                    return (
                        <View key={key} style={[localStyles.rowItem, styles.profileRow]}>
                            <Text style={[globalStyles.label, styles.profileLabel]}>
                                {formatLabel(key, t)}
                            </Text>
                            <Text style={[globalStyles.bodyText, styles.profileValue]} numberOfLines={2}>
                                {displayValue}
                            </Text>
                        </View>
                    );
                })}
        </View>
    );
};

// Subtle, professional UI enhancements to overlay onto existing global/local styles
const styles = StyleSheet.create({

    sectionTitleSpacing: {
        marginBottom: 16,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    profileRow: {
        paddingVertical: 6,
    },
    profileLabel: {
        flex: 1,
        fontSize: 12,
    },
    profileValue: {
        flex: 2,
        fontSize: 14,
        fontWeight: 'bold',
    },
});

export default UserProfileCard;