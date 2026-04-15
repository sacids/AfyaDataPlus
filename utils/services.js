import { Alert } from "react-native";
import api from "../api/axiosInstance";
import { insert, insert_into_messages, remove, select, update } from "./database";


import { Directory, Paths } from "expo-file-system";
import * as ImageManipulator from 'expo-image-manipulator';


// Helper function to manage status updates
const updateStatus = (setStatus, newMessage) => {
    setStatus(prevStatus => {
        const currentStatus = prevStatus || ''; // Handle undefined/null case
        // If previous status ends with an activity indicator, remove it first
        const cleanPrevStatus = currentStatus.endsWith('...')
            ? currentStatus.slice(0, -3)
            : currentStatus;
        return `${cleanPrevStatus}\n${newMessage}`;
    });
};

// Activity indicators for visual feedback
const ACTIVITY_INDICATORS = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
let activityInterval;

export const getForms = async (project_id, setStatus) => {
    let activityCounter = 0;

    try {
        // Initialize status if empty
        setStatus(prev => prev || 'Starting sync...');

        // Start activity indicator
        activityInterval = setInterval(() => {
            activityCounter = (activityCounter + 1) % ACTIVITY_INDICATORS.length;
            setStatus(prevStatus => {
                if (!prevStatus) return ''; // Handle undefined/null case
                // Only update if last line ends with dots (indicating in-progress)
                const lines = prevStatus.split('\n');
                if (lines[lines.length - 1].endsWith('...')) {
                    lines[lines.length - 1] = lines[lines.length - 1].replace(/\.\.\.$/, '') +
                        ACTIVITY_INDICATORS[activityCounter];
                    return lines.join('\n');
                }
                return prevStatus;
            });
        }, 100);

        // Retrieve local forms
        updateStatus(setStatus, 'Retrieving local forms...');
        const localForms = {};
        const sql = await select('form_defn', 'project = ?', [project_id]);
        for (const form of sql) {
            localForms[form.form_id] = form.version;
        }

        // Get all forms meta data
        updateStatus(setStatus, 'Retrieving metadata...');
        const metaResponse = await api.post(`api/v1/form-defn-meta/${project_id}`);
        const metaForms = metaResponse.data;

        if (!Array.isArray(metaForms)) {
            updateStatus(setStatus, 'Invalid metadata response');
            console.warn('Invalid metadata response');
            return;
        }

        // Check for updates
        updateStatus(setStatus, 'Checking for updates...');
        for (const remoteForm of metaForms) {
            const { id, version, short_title } = remoteForm;

            if (!localForms[id] || localForms[id] !== version) {
                // Download form
                updateStatus(setStatus, `Downloading form: ${short_title}...`);

                try {
                    const formResponse = await api.get(`api/v1/form-definition/detail/${id}`);
                    const form = formResponse.data;

                    if (!form || typeof form !== 'object') {
                        updateStatus(setStatus, `Invalid form data for: ${short_title}`);
                        console.warn(`Invalid form data for ID ${id}:`, form);
                        continue;
                    }

                    // Save form to database
                    await insert('form_defn', { ...form, project: project_id, form_id: id });
                    updateStatus(setStatus, `Downloaded: ${short_title} (v${version})`);
                } catch (error) {
                    updateStatus(setStatus, `Failed to download: ${short_title}`);
                    console.error(`Error downloading form ${id}:`, error);
                }
            } else {
                updateStatus(setStatus, `Up to date: ${short_title} (v${version})`);
            }
        }

        updateStatus(setStatus, 'Sync completed successfully!');
    } catch (error) {
        updateStatus(setStatus, 'Sync failed - see console for details');
        console.error('Error getting forms:', error);
    } finally {
        // Clear activity indicator
        clearInterval(activityInterval);
    }
};

export const getProjfectForms = async (project_id, setStatus) => {

    try {
        // Initialize status if empty
        setStatus('Starting sync...');

        // Retrieve local forms
        setStatus('Retrieving local forms...');
        const localForms = {};
        const sql = await select('form_defn', 'project = ?', [project_id]);
        for (const form of sql) {
            localForms[form.form_id] = form.version;
        }

        // Get all forms meta data
        setStatus('Retrieving metadata...');
        //console.log('project forms', `api/v1/form-defn-meta/${project_id}`)
        const metaResponse = await api.post(`api/v1/form-defn-meta/${project_id}`);
        const metaForms = metaResponse.data;

        if (!Array.isArray(metaForms)) {
            setStatus('Invalid metadata response');
            console.warn('Invalid metadata response');
            return;
        }

        // Check for updates
        setStatus('Checking for updates...');
        for (const remoteForm of metaForms) {
            const { id, version, short_title } = remoteForm;

            if (!localForms[id] || localForms[id] !== version) {
                // Download form
                setStatus(`Downloading form: ${short_title}...`);

                try {
                    const formResponse = await api.get(`api/v1/form-definition/detail/${id}`);
                    const form = formResponse.data;

                    if (!form || typeof form !== 'object') {
                        setStatus(`Invalid form data for: ${short_title}`);
                        console.warn(`Invalid form data for ID ${id}:`, form);
                        continue;
                    }

                    //console.log('returned form', JSON.stringify(form, null, 5))

                    // Save form to database
                    await insert('form_defn', { ...form, project: project_id, form_id: id });
                    setStatus(`Downloaded: ${short_title} (v${version})`);
                } catch (error) {
                    setStatus(`Failed to download: ${short_title}`);
                    console.error(`Error downloading form ${id}:`, error);
                }
            } else {
                setStatus(`Up to date: ${short_title} (v${version})`);
            }
        }

        setStatus('Sync completed successfully!');
    } catch (error) {
        setStatus('Sync failed - ' + error);
        console.error('Error getting forms:', error);
    } finally {
        // Clear activity indicator
        clearInterval(activityInterval);
    }
};



export const syncProjectReactions = async (project_id, setStatus) => {
    try {
        // Initialize status if empty
        setStatus('Starting sync...');

        // Retrieve local forms
        setStatus('Retrieving local forms...');
        const sql = await select('form_defn', 'project = ?', [project_id], 'form_id');
        for (const form of sql) {
            await syncFormReactions(form.form_id, setStatus)
        }
        setStatus('Form Reactions sync complete')

    } catch (error) {
        setStatus('Sync failed - ' + error);
        console.error('Error getting forms:', error);
    } finally {
        // Clear activity indicator
        clearInterval(activityInterval);
    }
}

/**
 * Syncs form reactions for a specific form from the server to local storage.
 * * @param {string} formId - The UUID of the form to sync rules for.
 * @param {function} setStatus - State setter for UI feedback.
 */
export const syncFormReactions = async (formId, setStatus) => {
    try {
        updateStatus(setStatus, `Fetching decision rules for form ${formId}...`);

        // 1. Fetch from Django API using your axios instance
        const response = await api.get(`api/v1/form-reactions/${formId}`);
        const reactions = response.data;

        if (reactions && Array.isArray(reactions)) {
            updateStatus(setStatus, `Processing ${reactions.length} logic rules...`);

            // 2. Clear existing rules for this specific form to prevent duplicates
            // Uses the 'remove' helper from your database.js
            await remove('form_reactions', 'form = ?', [formId]);

            // 3. Insert new rules
            for (const reaction of reactions) {
                await insert('form_reactions', {
                    form: reaction.form,
                    reaction_id: reaction.id,
                    priority: reaction.priority,
                    condition: reaction.condition,
                    actions_json: JSON.stringify(reaction.actions)
                });
            }

            updateStatus(setStatus, `Successfully updated ${reactions.length} reactions.`);
            return { success: true, count: reactions.length };
        } else {
            updateStatus(setStatus, `No specific reactions found for this form.`);
            return { success: true, count: 0 };
        }

    } catch (error) {
        console.error("Failed to sync form reactions:", error);
        updateStatus(setStatus, `Error syncing reactions: ${error.message}`);
        return { success: false, error: error.message };
    }
};

export const submitProjectData = async (project_id, setStatus) => {


    try {
        const finalizedData = await select('form_data', 'project = ? AND status = ?', [project_id, 'finalized']);

        if (finalizedData && finalizedData.length > 0) {
            // If there are finalized forms, submit them
            await submitForms(finalizedData);
        } else {
            // If no finalized forms, show alert
            Alert.alert(
                'Nothing to Submit',
                'There are no finalized forms to submit for this project.',
                [{ text: 'OK' }]
            );
        }
    } catch (error) {
        // Handle any errors
        console.error('Error submitting forms:', error);
        Alert.alert(
            'Submission Failed',
            'An error occurred while submitting forms. Please try again.',
            [{ text: 'OK' }]
        );
    }

}
/**
 * Sends a single message to the Django conversation endpoint
 */
export const sendMessageToServer = async (conversationId, messageData) => {
    try {
        const response = await api.post(`api/v1/chat/conversations/${conversationId}/messages`, {
            text: messageData.text,
            external_id: messageData.local_id,
        });
        
        // Update local status to synced and save the remote_id
        await update('messages', 
            { sync_status: 'synced', remote_id: response.data.id }, 
            'local_id = ?', 
            [messageData.local_id]
        );
        
        return response.data;
    } catch (error) {
        console.error("Failed to send message to server:", error);
        throw error;
    }
};

/**
 * Syncs messages and ensures all local messages for this form 
 * are linked to the newly created/retrieved conversation_id.
 */
export const syncMessages = async (formData, participants = []) => {
    try {
        const convResponse = await api.post('api/v1/chat/conversations', {
            title: formData.title || `Chat for ${formData.uuid}`,
            form: formData.form, 
            instance: formData.original_uuid,
            participants: participants
        });

        const conversation = convResponse.data.data;
        const convId = conversation.id;

        // 1. Update all local messages that belong to this form but lack a conversation_id
        await update('messages', 
            { conversation_id: convId }, 
            'formDataUUID = ? AND (conversation_id IS NULL OR conversation_id = "")', 
            [formData.original_uuid]
        );

        // 2. Fetch remote messages and insert them
        const msgResponse = await api.get(`api/v1/chat/conversations/${convId}/messages`);

        for (const msg of msgResponse.data) {
            await insert_into_messages({
                remote_id: msg.id,
                local_id: msg.external_id,
                conversation_id: convId,
                formDataUUID: formData.original_uuid,
                text: msg.text,
                sender_id: msg.sender.id,
                sender_name: msg.sender.username,
                sync_status: 'synced',
                created_at: msg.created_at
            });
        }

        // 3. Automatically push any messages that are still 'pending' for this conversation
        const pendingMessages = await select('messages', 
            'conversation_id = ? AND sync_status = ?', 
            [convId, 'pending']
        );

        for (const localMsg of pendingMessages) {
            try {
                await sendMessageToServer(convId, localMsg);
            } catch (err) {
                console.warn("Failed to push pending message during sync", localMsg.local_id);
            }
        }

        return convId;
    } catch (error) {
        console.error("Sync failed, using offline mode", error);
        return null;
    }
};


export const postData = async (endpoint, data = {}, headers = {}) => {
    try {
        const response = await api.post(`api/v1/${endpoint}`, data, headers);
        return response.data;
    } catch (error) {
        console.error(`Error fetching ${endpoint}:`, error);
        return null;
    }
};































const submitForms = async (data = []) => {
    Alert.alert(
        'Confirm Submission',
        `Are you sure you want to submit ${data.length} form(s)?`,
        [
            {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => console.log('Submission cancelled')
            },
            {
                text: 'Submit',
                onPress: () => handleFormSubmission(data)
            }
        ],
        { cancelable: false }
    );
};

// In services.js / submitForms.js
const handleFormSubmission = async (data, onProgress) => { // Added onProgress
    const successForms = [];
    const failedForms = [];

    try {
        for (const formItem of data) {
            // CALL THE CALLBACK HERE
            if (onProgress) onProgress(formItem.id, true);

            try {
                const submissionResult = await submitSingleForm(formItem);
                if (submissionResult.success) {
                    successForms.push(formItem.form);
                } else {
                    failedForms.push({ form: formItem.form, error: submissionResult.error });
                }
            } catch (error) {
                failedForms.push({ form: formItem.form, error: error.message });
            } finally {
                // TURN OFF SPINNER FOR THIS SPECIFIC ID
                if (onProgress) onProgress(formItem.id, false);
            }
        }
        showSubmissionResults(successForms, failedForms, data.length);
    } catch (error) {
        Alert.alert('Error', 'Form submission process failed');
    }
};

export const submitSingleForm = async (formItem) => {
    //console.log('formdata', JSON.stringify(formItem, null, 5))
    const formData = new FormData();

    // Process images from directory
    await processFormImages(formItem, formData);

    // Add form fields
    for (const field in formItem) {
        if (formItem.hasOwnProperty(field)) {
            formData.append(field, formItem[field]);
        }
    }

    // Submit form data with better error handling
    let result;
    try {
        //console.log('form-data', JSON.stringify(formData, null, 5))
        result = await postData('form-data', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    } catch (error) {
        console.error('Network request failed:', error);
        return { success: false, error: error.message };
    }

    console.log('Submission result for form:', formItem.form, result);

    // Handle null result or network errors
    if (!result) {
        return { success: false, error: 'No response from server' };
    }

    if (result.error || result.status >= 400) {
        return { success: false, error: result.error || `Server error: ${result.status}` };
    }

    // Success case
    await updateFormStatus(formItem.id);
    return { success: true };
};

const processFormImages = async (formItem, formData) => {
    const formDirectory = new Directory(Paths.document, formItem.original_uuid);

    if (!formDirectory.exists) {
        //console.log(`Directory does not exist for form: ${formItem.form}`);
        return;
    }

    const directoryContents = await formDirectory.list();

    for (const fileItem of directoryContents) {
        if (fileItem.constructor.name !== 'File') continue;

        try {
            await processSingleImage(fileItem, formData);
        } catch (error) {
            console.error(`Error processing image ${fileItem.uri}:`, error);
            // Continue with other images even if one fails
        }
    }
};

const processSingleImage = async (fileItem, formData) => {
    const fileName = fileItem.uri.split('/').pop();
    const match = fileName.match(/^(.+?)__(.+)$/);

    if (!match) {
        console.log(`Filename ${fileName} does not match expected pattern`);
        return;
    }

    const [, fieldName, imageName] = match;

    if (!fileItem.exists) {
        console.warn(`Image file does not exist: ${fileName}`);
        return;
    }

    try {
        // Fixed ImageManipulator usage
        const manipulatedImage = await ImageManipulator.manipulateAsync(
            fileItem.uri,
            [{ resize: { width: 800, height: 800 } }],
            {
                compress: 0.7,
                format: ImageManipulator.SaveFormat.JPEG // This should work now with proper import
            }
        );

        formData.append(fieldName, {
            uri: manipulatedImage.uri,
            type: 'image/jpeg',
            name: `${fieldName}_${Date.now()}.jpg`
        });

        console.log(`Successfully processed image: ${fileName}`);
    } catch (resizeError) {
        console.error(`Error compressing image ${fileName}:`, resizeError);

        // Fallback: try without format specification or use original image
        try {
            console.log('Trying fallback image processing...');
            const manipulatedImage = await ImageManipulator.manipulateAsync(
                fileItem.uri,
                [{ resize: { width: 800, height: 800 } }],
                { compress: 0.7 }
                // Remove format specification as fallback
            );

            formData.append(fieldName, {
                uri: manipulatedImage.uri,
                type: 'image/jpeg',
                name: `${fieldName}_${Date.now()}.jpg`
            });

            console.log(`Successfully processed image with fallback: ${fileName}`);
        } catch (fallbackError) {
            console.error(`Fallback also failed for ${fileName}:`, fallbackError);

            // Last resort: use original image without processing
            formData.append(fieldName, {
                uri: fileItem.uri,
                type: 'image/jpeg', // or get actual mime type
                name: `${fieldName}_${Date.now()}.jpg`
            });

            console.log(`Using original image without compression: ${fileName}`);
        }
    }
};

const updateFormStatus = async (formId) => {
    await update(
        'form_data',
        {
            status: 'sent',
            status_date: new Date().toISOString()
        },
        'id = ?',
        [formId]
    );
};

const showSubmissionResults = async (successForms, failedForms, totalForms) => {
    const successCount = successForms.length;
    const failedCount = failedForms.length;

    let message = `Successfully submitted ${successCount} out of ${totalForms} form(s)`;

    if (failedCount > 0) {
        message += `\nFailed: ${failedCount} form(s)`;

        // Show first few failures with errors
        const recentFailures = failedForms.slice(0, 3);
        recentFailures.forEach(failure => {
            message += `\n• ${failure.form}: ${failure.error || 'Unknown error'}`;
        });

        if (failedCount > 3) {
            message += `\n... and ${failedCount - 3} more`;
        }
    }

    Alert.alert(
        'Submission Results',
        message,
        [
            {
                text: 'OK',
            }
        ]
    );
};

export { handleFormSubmission, submitForms };
