import { Alert } from "react-native";
import api from "../api/axiosInstance";
import { db, getLastSyncTime, insert, insert_into_messages, remove, select, update, updateLastSyncTime } from "./database";


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

export const getProjectForms = async (project_id, setStatus) => {

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


export const getProjectData = async (project_id, setStatus, options = {}) => {
    const {
        pageSize = 50,
        maxPages = null,
        onProgress = null,
        incrementalSync = true,  // Enable incremental sync by default
        forceFullSync = false,    // Force full sync even if incremental is available
        syncMode = 'modified'     // 'modified', 'missing', 'all'
    } = options;

    let activityCounter = 0;
    let activityInterval = null;

    try {
        setStatus(prev => prev || 'Starting data sync...');

        // Start activity indicator
        activityInterval = setInterval(() => {
            activityCounter = (activityCounter + 1) % ACTIVITY_INDICATORS.length;
            setStatus(prevStatus => {
                if (!prevStatus) return '';
                const lines = prevStatus.split('\n');
                if (lines[lines.length - 1].endsWith('...')) {
                    lines[lines.length - 1] = lines[lines.length - 1].replace(/\.\.\.$/, '') +
                        ACTIVITY_INDICATORS[activityCounter];
                    return lines.join('\n');
                }
                return prevStatus;
            });
        }, 100);

        // Get local record count and last sync info
        const localRecords = await select('form_data', 'project = ?', [project_id], 'uuid, status, status_date', false, true);
        const localCount = localRecords.length;
        const lastSyncTime = await getLastSyncTime(project_id);
        
        updateStatus(setStatus, `Local records: ${localCount}`);
        
        // Determine sync strategy
        let syncStrategy = 'full';
        let queryParams = new URLSearchParams({
            page: 1,
            page_size: pageSize,
            project_id: project_id
        });

        if (incrementalSync && !forceFullSync && lastSyncTime) {
            if (syncMode === 'modified') {
                // Fetch only records modified after last sync
                queryParams.append('modified_after', lastSyncTime);
                syncStrategy = 'incremental_modified';
                updateStatus(setStatus, `Fetching records modified since ${new Date(lastSyncTime).toLocaleString()}...`);
            } else if (syncMode === 'missing') {
                // Fetch only missing UUIDs
                const localUuids = localRecords.map(r => r.uuid);
                if (localUuids.length > 0) {
                    // Send UUIDs to server to get only missing ones
                    const missingResponse = await api.post(`api/v1/form-data/find-missing/`, {
                        uuids: localUuids,
                        project_id: project_id
                    });
                    
                    if (missingResponse.data.missing_uuids?.length > 0) {
                        queryParams.append('uuids', missingResponse.data.missing_uuids.join(','));
                        syncStrategy = 'incremental_missing';
                        updateStatus(setStatus, `Fetching ${missingResponse.data.missing_uuids.length} missing records...`);
                    } else {
                        updateStatus(setStatus, 'All records are already synced!');
                        return { success: true, message: 'Already up to date', fetched: 0 };
                    }
                }
            }
        } else if (!incrementalSync || forceFullSync || !lastSyncTime) {
            updateStatus(setStatus, `Performing full sync...`);
        }

        // For missing sync with many UUIDs, use batch approach
        let allData = [];
        let currentPage = 1;
        let next = null;
        let totalFetched = 0;
        let totalUpdated = 0;
        let totalInserted = 0;

        // Get server record count first (if endpoint supports it)
        try {
            const countResponse = await api.head(`api/v1/form-data/`, { params: Object.fromEntries(queryParams) });
            const serverCount = parseInt(countResponse.headers['x-total-count'] || '0');
            if (serverCount === 0 && syncStrategy !== 'full') {
                updateStatus(setStatus, 'No new records to sync');
                return { success: true, message: 'Already up to date', fetched: 0 };
            }
            if (serverCount > 0) {
                updateStatus(setStatus, `Found ${serverCount} records to sync`);
            }
        } catch (e) {
            // HEAD request not supported, continue without count
        }

        // Fetch paginated data
        do {
            updateStatus(setStatus, `Fetching page ${currentPage}...`);
            
            const response = await api.get(`api/v1/form-data/`, { 
                params: Object.fromEntries(queryParams) 
            });
            
            let results, nextUrl;
            if (response.data.results) {
                results = response.data.results;
                nextUrl = response.data.next;
            } else if (Array.isArray(response.data)) {
                results = response.data;
                nextUrl = null;
            } else {
                break;
            }

            if (results && results.length > 0) {
                // Process batch
                const batchResult = await processFormDataBatch(results, project_id);
                totalInserted += batchResult.inserted;
                totalUpdated += batchResult.updated;
                totalFetched += results.length;
                
                allData.push(...results);
                
                if (onProgress) {
                    onProgress(totalFetched, null);
                }
                
                updateStatus(setStatus, `Synced ${totalFetched} records (${totalInserted} new, ${totalUpdated} updated)...`);
            }

            // Update pagination
            if (nextUrl) {
                // Parse next URL or just use the URL directly
                currentPage++;
            }
            next = nextUrl;

            if (maxPages && currentPage >= maxPages) {
                updateStatus(setStatus, `Reached maximum page limit (${maxPages})`);
                break;
            }

            await new Promise(resolve => setTimeout(resolve, 50));

        } while (next);

        // Update last sync timestamp
        if (incrementalSync && (totalFetched > 0 || forceFullSync)) {
            await updateLastSyncTime(project_id);
        }

        const finalMessage = `Sync complete! Fetched: ${totalFetched}, New: ${totalInserted}, Updated: ${totalUpdated}`;
        updateStatus(setStatus, finalMessage);

        return {
            success: true,
            fetched: totalFetched,
            inserted: totalInserted,
            updated: totalUpdated,
            strategy: syncStrategy
        };

    } catch (error) {
        const errorMessage = `Sync failed: ${error.message}`;
        updateStatus(setStatus, errorMessage);
        console.error('Error syncing form data:', error);
        
        return {
            success: false,
            error: error.message,
            fetched: 0
        };
    } finally {
        if (activityInterval) {
            clearInterval(activityInterval);
        }
    }
};

// Helper function to process batch efficiently
const processFormDataBatch = async (records, project_id) => {
    let inserted = 0;
    let updated = 0;
    
    // Get existing UUIDs in one query
    const uuids = records.map(r => r.uuid);
    const placeholders = uuids.map(() => '?').join(',');
    const existingRecords = await select(
        'form_data', 
        `uuid IN (${placeholders})`, 
        uuids, 
        'uuid, status, status_date',
        false,
        true
    );
    
    const existingUuids = new Set(existingRecords.map(r => r.uuid));
    
    
    // Batch insert/update using transaction
    await db.execAsync('BEGIN TRANSACTION;');
    
    try {
        for (const record of records) {
            const isExisting = existingUuids.has(record.uuid);
            
            const formDataRecord = {
                project: record.project || project_id,
                form: record.form,
                title: record.title || '',
                uuid: record.uuid,
                original_uuid: record.original_uuid || record.uuid,
                parent_uuid: record.parent_uuid || null,
                gps: record.gps || null,
                deleted: record.deleted || 0,
                archived: record.archived || 0,
                form_data: typeof record.form_data === 'string' 
                    ? record.form_data 
                    : JSON.stringify(record.form_data || {}),
                created_by: record.created_by,
                created_by_name: record.created_by_name || record.created_by,
                created_on: record.created_on || record.created_at,
                status: record.status || 'finalized',
                status_date: record.status_date || record.updated_at,
                synced: 1
            };
            
            if (isExisting) {
                const result = await update('form_data', formDataRecord, 'uuid = ?', [record.uuid]);
                if (result > 0) updated++;
            } else {
                const result = await insert('form_data', formDataRecord);
                if (result && result.changes > 0) inserted++;
            }
        }
        
        await db.execAsync('COMMIT;');
    } catch (error) {
        await db.execAsync('ROLLBACK;');
        console.error('Batch processing error:', error);
        throw error;
    }
    
    return { inserted, updated };
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
        //console.log('message data', messageData)
        const response = await api.post(`/api/v1/chat/conversations/${conversationId}/messages`, {
            text: messageData.text,
            external_id: messageData.local_id,
            sender_id: messageData.sender_id
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
export const syncMessages1 = async (convId, uuid) => {
    try {

        // 2. Fetch remote messages and insert them
        const msgResponse = await api.get(`api/v1/chat/conversations/${convId}/messages`);

        for (const msg of msgResponse.data) {
            await insert_into_messages({
                remote_id: msg.id,
                local_id: msg.external_id,
                conversation_id: convId,
                formDataUUID: uuid,
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

// In services.js, update the syncMessages function:

export const syncMessages = async (convId, uuid) => {
    try {
        // Validate inputs
        if (!convId || convId === 'null' || convId === 'undefined') {
            console.error('Invalid conversation ID provided to syncMessages:', convId);
            return null;
        }

        if (typeof convId !== 'string') {
            console.error('Conversation ID must be a string, got:', typeof convId, convId);
            return null;
        }

        // 2. Fetch remote messages and insert them
        const msgResponse = await api.get(`api/v1/chat/conversations/${convId}/messages`);

        if (!msgResponse.data || !Array.isArray(msgResponse.data)) {
            console.warn('No messages or invalid response format');
            return convId;
        }

        for (const msg of msgResponse.data) {
            await insert_into_messages({
                remote_id: msg.id,
                local_id: msg.external_id,
                conversation_id: convId,
                formDataUUID: uuid,
                text: msg.text,
                sender_id: msg.sender?.id || '0',
                sender_name: msg.sender?.username || 'afyadata_assistant',
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
                console.warn("Failed to push pending message during sync", localMsg.local_id, err);
            }
        }

        return convId;
    } catch (error) {
        console.error("Sync failed, using offline mode", error);
        return null;
    }
};

/**
 * Syncs messages and ensures all local messages for this form 
 * are linked to the newly created/retrieved conversation_id.
 */
// In services.js, update the initChat function:

export const initChat = async (formData, participants = []) => {
    try {
        const convResponse = await api.post('api/v1/chat/conversations', {
            title: formData.title || `Chat for ${formData.uuid}`,
            form: formData.form,
            instance: formData.original_uuid,
            participants: participants
        });

        const conversation = convResponse.data.data;
        const convId = conversation.id;

        // Ensure convId is a string
        const convIdString = String(convId);

        if (!convIdString || convIdString === 'null' || convIdString === 'undefined') {
            console.error('Invalid conversation ID returned from server:', convId);
            return null;
        }

        // 1. Update all local messages that belong to this form but lack a conversation_id
        await update('messages',
            { conversation_id: convIdString },
            'formDataUUID = ? AND (conversation_id IS NULL OR conversation_id = "")',
            [formData.original_uuid]
        );

        return convIdString;

    } catch (error) {
        console.error("Failed to initialize chat:", error);
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



/**
 * Check if the current user has seen a specific form data record
 * @param {number|string} id - The form_data record ID
 * @param {string} username - The current user's username (from global state)
 * @returns {Promise<boolean>} - True if user has seen the record
 */
export const hasSeen = async (id, username) => {
    try {
        if (!username) {
            console.warn('No username provided to hasSeen');
            return false;
        }

        const result = await db.getFirstAsync(
            'SELECT seen_by FROM form_data WHERE id = ?',
            [id]
        );

        if (!result || !result.seen_by) {
            return false;
        }

        // Split the comma-separated list and check if username exists
        const seenByList = result.seen_by.split(',').map(name => name.trim());
        return seenByList.includes(username);
        
    } catch (error) {
        console.error('Error checking if user has seen record:', error);
        return false;
    }
};

/**
 * Update the seen_by field to add the current user if not already present
 * @param {number|string} id - The form_data record ID
 * @param {string} username - The current user's username (from global state)
 * @returns {Promise<boolean>} - True if update was successful or user already in list
 */
export const updateSeenBy = async (id, username) => {
    try {
        if (!username) {
            console.warn('No username provided to updateSeenBy');
            return false;
        }

        // First, check if user has already seen this record
        const hasSeenResult = await hasSeen(id, username);
        
        if (hasSeenResult) {
            // User already in the list, no need to update
            return true;
        }

        // Get current seen_by value
        const result = await db.getFirstAsync(
            'SELECT seen_by FROM form_data WHERE id = ?',
            [id]
        );

        let newSeenBy;
        if (!result || !result.seen_by) {
            // No one has seen it yet
            newSeenBy = username;
        } else {
            // Append new username to the list
            newSeenBy = `${result.seen_by},${username}`;
        }

        // Update the record
        const updateResult = await db.runAsync(
            'UPDATE form_data SET seen_by = ? WHERE id = ?',
            [newSeenBy, id]
        );

        return updateResult.changes > 0;
        
    } catch (error) {
        console.error('Error updating seen_by field:', error);
        return false;
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

    //console.log('Submission result for form:', formItem.form, result);

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

        //console.log(`Successfully processed image: ${fileName}`);
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

            //console.log(`Successfully processed image with fallback: ${fileName}`);
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
