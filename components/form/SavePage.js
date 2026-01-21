import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { getStyles } from '../../constants/styles';
import { useTheme } from '../../context/ThemeContext';
import { evaluateCustomFunctions, replaceVariables } from '../../lib/form/validation';
import { useAuthStore } from '../../store/authStore';
import { useFormStore } from '../../store/FormStore';
import { insert } from '../../utils/database';


const SavePage = () => {


    const theme = useTheme();
    const styles = getStyles(theme);

    const [title, setTitle] = useState(null);
    const { user } = useAuthStore();

    const {
        schema,
        formData,
        formUUID,
    } = useFormStore();

    const saveForm = async (status) => {
        //console.log("Saving form");
        try {
            await insert("form_data", {
                form: schema.form,
                project: schema.project,
                uuid: formUUID,
                original_uuid: formUUID,
                title: title,
                created_by: user?.id,
                created_by_name: user?.fullName ?? user?.id,
                created_on: new Date().toISOString(),
                status: status,
                status_date: new Date().toISOString(),
                deleted: 0,
                synced: 0,
                form_data: JSON.stringify(formData),
            })
            router.dismissTo('/Main')
        } catch (e) {
            console.log(e)
        }
    }

    useEffect(() => {
        const instance_name = schema.meta.instance_name
        const tt1 = replaceVariables(instance_name, formData)
        const tt = evaluateCustomFunctions(tt1, formData)
        setTitle(tt)
    }, []);


    return (
        <KeyboardAvoidingView style={styles.pageContainer}>
            <View style={{ flex: 1, padding: 10, justifyContent: 'center', paddingVertical: 20, }}>

                <View style={{}}>
                    <Text style={{ fontWeight: "bold", fontSize: 20, paddingBottom: 20, color: theme.colors.text }}>
                        You are at the end of
                    </Text>
                    <TextInput
                        multiline={false}
                        style={[styles.inputBase, styles.textInput]}
                        value={title ? title : "Untitled Form"}
                        onChangeText={(e) => { setTitle(e) }}
                    />
                    <View style={{ flexDirection: "row", backgroundColor: "#bde1f2", borderRadius: 10, padding: 15, fontSize: 16 }}>
                        <MaterialCommunityIcons name="information-outline" size={24} color="black" />
                        <Text style={{ paddingHorizontal: 10 }}>Once the message is sent, you will not have the option to make edits. To make changes, `Save as Draft` until you are prepared to send it.</Text>
                    </View>
                </View>
                <View style={{ flexDirection: "row", marginTop: 30, justifyContent: "space-around" }}>
                    <TouchableOpacity onPress={() => saveForm('draft')} style={[styles.button, { backgroundColor: "white" }]} >
                        <Text style={{ color: "black", fontSize: 18 }}>Save as Draft</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => saveForm('finalized')} style={[styles.button, { backgroundColor: "maroon" }]} >
                        <Text style={{ color: "white", fontSize: 18 }}>Finalize Form</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    )
}

export default SavePage
