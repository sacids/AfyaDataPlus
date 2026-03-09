import {
    AntDesign,
    Entypo,
    EvilIcons,
    Feather,
    FontAwesome,
    FontAwesome5,
    FontAwesome6,
    Fontisto,
    Foundation,
    Ionicons,
    MaterialCommunityIcons,
    MaterialIcons,
    Octicons,
    SimpleLineIcons,
    Zocial
} from '@expo/vector-icons';

// Default fallback icon
const DEFAULT_ICON = {
    library: 'fontawesome5',
    name: 'user-alt'
};

// Map all possible icon libraries with case-insensitive keys
const iconLibraries = {
    antdesign: AntDesign,
    entypo: Entypo,
    evilicons: EvilIcons,
    feather: Feather,
    fontawesome: FontAwesome,
    fontawesome5: FontAwesome5,
    fontawesome6: FontAwesome6,
    fontisto: Fontisto,
    foundation: Foundation,
    ionicons: Ionicons,
    materialcommunityicons: MaterialCommunityIcons,
    materialicons: MaterialIcons,
    octicons: Octicons,
    simplelineicons: SimpleLineIcons,
    zocial: Zocial
};

export const FormIcons = ({
    iconName = 'fontawesome5:user-alt',
    color = '#000',
    isCompleted = false,
    size = 20
}) => {

    // If completed show check icon
    if (isCompleted) {
        return <AntDesign name="check" size={size} color="white" />;
    }

    let library;
    let name;

    // Validate iconName format
    if (typeof iconName === 'string' && iconName.includes(':')) {
        [library, name] = iconName.split(':');
    } else {
        library = DEFAULT_ICON.library;
        name = DEFAULT_ICON.name;
    }

    // Normalize library
    const normalizedLibrary = library?.toLowerCase();

    let IconComponent = iconLibraries[normalizedLibrary];

    // If library not found use default
    if (!IconComponent || !name) {
        const DefaultComponent = iconLibraries[DEFAULT_ICON.library];
        return (
            <DefaultComponent
                name={DEFAULT_ICON.name}
                size={size}
                color={color}
            />
        );
    }

    return (
        <IconComponent
            name={name}
            size={size}
            color={color}
        />
    );
};