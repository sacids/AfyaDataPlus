import { View, Text } from 'react-native';
import MessagesScreen from './MessagesScreen';
import DiseaseKonwlegeScreen from './DiseaseKonwlegeScreen';
import useProjectStore from '../../../store/projectStore';

export default function DynamicScreen() {
    const { currentData } = useProjectStore();
    
    if (currentData) {
        return <MessagesScreen />;
    }
    
    return <DiseaseKonwlegeScreen />;
}