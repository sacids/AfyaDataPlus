import { Alert } from "react-native";
import api from "../api/axiosInstance";

import { db, getLastSyncTime, insert, insert_into_messages, remove, select, update, updateLastSyncTime } from "./database";


import { Directory, File, Paths } from "expo-file-system";
import * as ImageManipulator from 'expo-image-manipulator';
import { t } from "i18next";


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
        setStatus('Retrieving local forms...');
        const localForms = {};
        const sql = await select('form_defn', 'project = ?', [project_id]);
        for (const form of sql) {
            localForms[form.form_id] = form.version;
        }

        // Get all forms meta data
        setStatus('Retrieving metadata...');
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
        setStatus('Sync failed - see console for details');
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



export const cacheProjectImage1 = async (
    imageUrl,
    projectId,
    forceRefresh = false
) => {
    if (!imageUrl) return null;

    const projectsDir = new Directory(
        Paths.cache,
        'projects'
    );

    if (!projectsDir.exists) {
        projectsDir.create({ intermediates: true });
    }

    const extension =
        imageUrl.split('.').pop()?.split('?')[0] || 'jpg';

    const file = new File(
        projectsDir,
        `${projectId}.${extension}`
    );

    if (!forceRefresh && file.exists) {
        return file.uri;
    }

    const response = await fetch(imageUrl);

    if (!response.ok) {
        throw new Error(
            `Failed to download image: ${response.status}`
        );
    }

    const bytes = await response.bytes();

    file.write(bytes);

    return file.uri;
};


export const cacheProjectImage = async (imageUrl, projectId) => {
    console.log('cached project image', projectId, imageUrl);

    if (!imageUrl) return null;

    try {
        const projectsDir = new Directory(Paths.cache, 'projects');

        if (!projectsDir.exists) {
            projectsDir.create({ intermediates: true });
        }

        const extension =
            imageUrl.split('.').pop()?.split('?')[0] || 'jpg';

        const file = new File(
            projectsDir,
            `${projectId}.${extension}`
        );

        const response = await fetch(imageUrl);

        if (!response.ok) {
            throw new Error(
                `Failed to download image: ${response.status}`
            );
        }

        const arrayBuffer = await response.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);

        file.write(bytes);

        return file.uri;
    } catch (error) {
        console.error(
            'Failed to cache project image:',
            error
        );
        return null;
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
        //console.log('Starting data sync for project', project_id, 'with options', options);
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

        setStatus(`Local records: ${localCount}`);

        // Determine sync strategy
        let syncStrategy = 'full';
        let queryParams = new URLSearchParams({
            page: 1,
            page_size: pageSize,
            project_id: project_id
        });

        //console.log('parameters', incrementalSync, forceFullSync, lastSyncTime)

        if (incrementalSync && !forceFullSync && lastSyncTime) {
            if (syncMode === 'modified') {
                // Fetch only records modified after last sync
                queryParams.append('modified_after', lastSyncTime);
                syncStrategy = 'incremental_modified';
                setStatus(`Fetching records modified since ${new Date(lastSyncTime).toLocaleString()}...`);
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
                        setStatus(`Fetching ${missingResponse.data.missing_uuids.length} missing records...`);
                    } else {
                        setStatus('All records are already synced!');
                        return { success: true, message: 'Already up to date', fetched: 0 };
                    }
                }
            }
        } else if (!incrementalSync || forceFullSync || !lastSyncTime) {
            //console.log('performing full sync due to settings or missing last sync time');
            setStatus(`Performing full sync...`);
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
                setStatus('No new records to sync');
                return { success: true, message: 'Already up to date', fetched: 0 };
            }
            if (serverCount > 0) {
                setStatus(`Found ${serverCount} records to sync`);
            }
        } catch (e) {
            // HEAD request not supported, continue without count
        }

        // Fetch paginated data
        do {
            setStatus(`Fetching page ${currentPage}...`);

            const response = await api.get(`api/v1/form-data/`, {
                params: Object.fromEntries(queryParams)
            });

            //console.log('fetch page', currentPage, 'response', 'api/v1/form-data/', response.data);
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

                setStatus(`Synced ${totalFetched} records (${totalInserted} new, ${totalUpdated} updated)...`);
            }

            // Update pagination
            if (nextUrl) {
                // Parse next URL or just use the URL directly
                currentPage++;
            }
            next = nextUrl;

            if (maxPages && currentPage >= maxPages) {
                setStatus(`Reached maximum page limit (${maxPages})`);
                break;
            }

            await new Promise(resolve => setTimeout(resolve, 50));

        } while (next);

        // Update last sync timestamp
        if (incrementalSync && (totalFetched > 0 || forceFullSync)) {
            await updateLastSyncTime(project_id);
        }

        const finalMessage = `Sync complete! Fetched: ${totalFetched}, New: ${totalInserted}, Updated: ${totalUpdated}`;
        //console.log(finalMessage);
        setStatus(finalMessage);

        return {
            success: true,
            fetched: totalFetched,
            inserted: totalInserted,
            updated: totalUpdated,
            strategy: syncStrategy
        };

    } catch (error) {
        const errorMessage = `Sync failed: ${error.message}`;
        setStatus(errorMessage);
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
const processFormDataBatch1 = async (records, project_id) => {
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
                status: record.status || 'sent',
                status_date: record.status_date || record.updated_at,
                synced: 1
            };

            //console.log('formdata record', formDataRecord);

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

            // Parse form_data object if it comes as a string representation
            let parsedFields = typeof record.form_data === 'string'
                ? JSON.parse(record.form_data || '{}')
                : { ...record.form_data };

            // --- MEDIA DOWNLOAD ATTACHMENT SYNC ---
            if (record.files && Array.isArray(record.files) && record.files.length > 0) {
                // Determine target instance directory UUID matching CurrentDataView structure
                const targetFolderUuid = record.original_uuid || record.uuid;
                const formDirectory = new Directory(Paths.document, targetFolderUuid);

                // Ensure permanent document directory path exists for this unique form entry
                if (!formDirectory.exists) {
                    formDirectory.create({ intermediates: true });
                }

                for (const fileMetadata of record.files) {
                    // Check if a valid URL pointer and target input field assignment exist
                    if (!fileMetadata.file_url || !fileMetadata.field_name) continue;

                    // Locate filename from form_data value (which retains the local naming pattern)
                    // If missing or null, fallback to extracting it from the remote URL string
                    const targetFileName = parsedFields[fileMetadata.field_name] ||
                        fileMetadata.file_url.split('/').pop()?.split('?')[0];

                    if (!targetFileName) continue;

                    try {
                        const destinationFile = new File(formDirectory, targetFileName);

                        // Download the binary file if it doesn't already exist on local disk storage
                        if (!destinationFile.exists) {
                            console.log(`Downloading asset for field "${fileMetadata.field_name}": ${targetFileName}`);
                            const fileResponse = await fetch(fileMetadata.file_url);

                            if (fileResponse.ok) {
                                const arrayBuffer = await fileResponse.arrayBuffer();
                                const bytes = new Uint8Array(arrayBuffer);
                                destinationFile.write(bytes);
                            } else {
                                console.warn(`Failed downloading asset from ${fileMetadata.file_url}. Status: ${fileResponse.status}`);
                            }
                        }
                    } catch (fileDownloadError) {
                        console.error(`Media download error processing asset file ${targetFileName}:`, fileDownloadError);
                    }
                }
            }
            // ----------------------------------------

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
                form_data: JSON.stringify(parsedFields), // Ensure changes to form_data are saved back to DB
                created_by: record.created_by,
                created_by_name: record.created_by_name || record.created_by,
                created_on: record.created_on || record.created_at,
                status: record.status || 'sent',
                status_date: record.status_date || record.updated_at,
                synced: 1
            };

            if (isExisting) {
                //console.log('update', formDataRecord)
                const result = await update('form_data', formDataRecord, 'uuid = ?', [record.uuid]);
                if (result > 0) updated++;
            } else {

                //console.log('insert', formDataRecord)
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
        setStatus(`Fetching decision rules for form ${formId}...`);

        // 1. Fetch from Django API using your axios instance
        const response = await api.get(`api/v1/form-reactions/${formId}`);
        const reactions = response.data;

        if (reactions && Array.isArray(reactions)) {
            setStatus(`Processing ${reactions.length} logic rules...`);

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

            setStatus(`Successfully updated ${reactions.length} reactions.`);
            return { success: true, count: reactions.length };
        } else {
            setStatus(`No specific reactions found for this form.`);
            return { success: true, count: 0 };
        }

    } catch (error) {
        console.error("Failed to sync form reactions:", error);
        setStatus(`Error syncing reactions: ${error.message}`);
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
                t('services:nothingToSubmit'),
                t('services:nothingToSubmitMessage')
            );
        }
    } catch (error) {
        // Handle any errors
        console.error('Error submitting forms:', error);
        Alert.alert(
            t('services:submissionFailed'),
            t('services:submissionFailedMessage'),
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
            'UPDATE form_data SET seen_by = ?, synced = ? WHERE id = ?',
            [newSeenBy, 0, id]
        );

        return updateResult.changes > 0;

    } catch (error) {
        console.error('Error updating seen_by field:', error);
        return false;
    }
};





/**
 * Synchronizes disease knowledge data from the API server into the local database.
 * * @param {string} projectId - The active workspace/project identification key.
 * @param {boolean} full_sync - If true, appends ?modified_from based on the last updated record.
 * @param {function} setStatus - Status state setter function for tracking UI logs.
 */
export const syncDiseaseKnowledge = async (projectId, setStatus, full_sync = false) => {
    let activityCounter = 0;

    try {
        // Initialize status tracker if empty
        setStatus(prev => prev || 'Starting disease knowledge sync...');

        // Start context activity loading indicator loop matching pattern
        activityInterval = setInterval(() => {
            activityCounter = (activityCounter + 1) % ACTIVITY_INDICATORS.length;
            setStatus(prevStatus => {
                if (!prevStatus) return '';
                const lines = prevStatus.split('\n');
                if (lines[lines.length - 1].startsWith('Syncing knowledge base')) {
                    lines[lines.length - 1] = `Syncing knowledge base ${ACTIVITY_INDICATORS[activityCounter]}`;
                    return lines.join('\n');
                }
                return prevStatus;
            });
        }, 200);

        setStatus('Checking local timeline parameters...');

        let modifiedFrom = '1970-01-01T00:00:00.000Z'; // Epoch starting point fallback

        if (!full_sync) {
            // Retrieve the last sync or update time from local records matching this project table
            const lastTime = await getLastSyncTime(`disease_knowledge_${projectId}`);
            if (lastTime) {
                modifiedFrom = lastTime;
            }
        }

        setStatus(`Syncing knowledge base ${ACTIVITY_INDICATORS[activityCounter]}`);

        // Construct initial end-point URI dynamically targeting your knowledge resource endpoint
        // Adjust endpoint routing key string ('/knowledge-base/') to match your exact structural server router map
        let nextUrl = `/api/v1/project/${projectId}/knowledge-base?modified_from=${encodeURIComponent(modifiedFrom)}`;
        let totalDownloaded = 0;

        while (nextUrl) {
            // Query the remote REST server instance
            //console.log('Fetching knowledge data from', nextUrl);
            const response = await api.get(nextUrl);
            const data = response.data;

            // Handle standard pagination structures or simple flat JSON arrays
            const results = Array.isArray(data) ? data : (data.results || []);
            const next = Array.isArray(data) ? null : data.next;

            if (results.length > 0) {
                for (const record of results) {
                    // Normalize backend model payload to map perfectly into database columns
                    // Handles fallbacks cleanly if title/photo fields match your snippet formats
                    await insert('tb_disease_knowledge', {
                        id: record.id,
                        project_id: record.project || projectId,
                        name: record.title || '',
                        description: record.description || '',
                        image: record.photo_url || record.photo || '',
                        created_at: record.created_at,
                        updated_at: record.updated_at,
                        created_by: record.created_by,
                        updated_by: record.updated_by
                    }, true); // Pass true to replace/upsert rows on conflicting IDs
                }
                totalDownloaded += results.length;
            }

            nextUrl = next;
            if (Array.isArray(data)) nextUrl = null;
        }

        // Capture current operational timestamp profile to lock time references for next execution pass
        const currentSyncTimestamp = new Date().toISOString();
        await updateLastSyncTime(`disease_knowledge_${projectId}`, currentSyncTimestamp);

        // Clear layout update loop intervals cleanly upon normal resolution
        if (activityInterval) clearInterval(activityInterval);

        setStatus(`Sync complete for knowledge base. ${totalDownloaded} entries processed.`);
        return { success: true, count: totalDownloaded };

    } catch (error) {
        if (activityInterval) clearInterval(activityInterval);
        console.error(`Knowledge base sync routine aborted for project ${projectId}:`, error);
        setStatus(`Sync error: ${error.message}`);
        return { success: false, error: error.message };
    }
};

























const submitForms = async (data = []) => {
    Alert.alert(
        t('services:confirmSubmission'),
        t('services:confirmSubmissionMessage', { count: data.length }),
        [
            {
                text: t('services:cancel'),
                style: 'cancel',
                onPress: () => console.log('Submission cancelled')
            },
            {
                text: t('services:submit'),
                onPress: () => handleFormSubmission(data)
            }
        ],
        { cancelable: false }
    );
};


export function recursiveJSONParse(input, maxDepth = 5) {
    let depth = 0;
    let current = input;

    while (typeof current === 'string' && depth < maxDepth) {
        try {
            current = JSON.parse(current);
            depth += 1;
        } catch (e) {
            // Return the last successful parse if failed mid-way
            break;
        }
    }

    return current;
}


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
        t('services:submissionResults'),
        message,
        [
            {
                text: t('services:ok'),
            }
        ]
    );
};

export { handleFormSubmission, submitForms };


/**
 * Synchronizes workflow states and action logs for a specific project.
 * * @param {string} projectId - The UUID of the project to sync.
 * @param {function} setStatus - State setter for UI feedback.
 */
export const syncWorkflowData = async (projectId, setStatus) => {
    try {
        // ---------------------------------------------------------
        // 1. UPSYNC: Push local project changes to Server
        // ---------------------------------------------------------
        setStatus(`Checking for unsynced updates in project ${projectId}...`);

        // Filter local selection by both sync_status AND project_id
        const unsyncedWorkflows = await select('tb_form_data_workflow', 'sync_status = ? AND project_id = ?', [0, projectId]);
        const unsyncedLogs = await select('tb_workflow_action_logs', 'sync_status = ? AND project_id = ?', [0, projectId]);

        if (unsyncedWorkflows.length > 0 || unsyncedLogs.length > 0) {
            setStatus(`Uploading ${unsyncedWorkflows.length} states and ${unsyncedLogs.length} logs...`);

            // The 'api' instance should be configured with the project's specific Token/BaseURL before this call
            await api.post('api/v1/workflow-sync/', {
                project_id: projectId,
                workflows: unsyncedWorkflows,
                logs: unsyncedLogs
            });

            // Mark only this project's records as synced
            await update('tb_form_data_workflow', { sync_status: 1 }, 'sync_status = ? AND project_id = ?', [0, projectId]);
            await update('tb_workflow_action_logs', { sync_status: 1 }, 'sync_status = ? AND project_id = ?', [0, projectId]);

            setStatus("Project updates uploaded successfully.");
        }

        // ---------------------------------------------------------
        // 2. DOWNSYNC: Fetch project updates from Server
        // ---------------------------------------------------------
        setStatus("Fetching latest workflow updates...");

        // Get the latest update timestamp for this specific project
        const lastUpdateResult = await select(
            'tb_form_data_workflow',
            'project_id = ?',
            [projectId],
            'MAX(updated_at) as last_val'
        );
        const lastUpdate = lastUpdateResult[0]?.last_val || "1970-01-01T00:00:00Z";

        // Include project_id in the query params if your backend requires it for filtering
        let nextUrl = `api/v1/workflow-sync/?project_id=${projectId}&last_update=${lastUpdate}`;
        //console.log('Initial workflow sync URL:', nextUrl);
        let totalDownloaded = 0;

        while (nextUrl) {
            const downResponse = await api.get(nextUrl);
            const data = downResponse.data;

            // Detect if response is paginated (object with results) or a direct array
            const results = Array.isArray(data) ? data : (data.results || []);
            const next = data.next || null; // Arrays won't have a .next property

            if (results.length > 0) {
                setStatus(`Downloading ${results.length} records...`);

                for (const record of results) {
                    // Update current workflow runtime state
                    await insert('tb_form_data_workflow', {
                        id: record.id,
                        form_data_uuid: record.form_data_uuid,
                        project_id: projectId, // Ensure project_id is persisted locally
                        workflow_state: record.workflow_state,
                        workflow_updated_at: record.workflow_updated_at,
                        last_action: record.last_action,
                        is_locked: record.is_locked ? 1 : 0,
                        is_closed: record.is_closed ? 1 : 0,
                        metadata: JSON.stringify(record.metadata),
                        sync_status: 1,
                        updated_at: record.updated_at
                    }, true);

                    // Sync nested action logs if provided by the backend
                    if (record.action_logs && Array.isArray(record.action_logs)) {
                        for (const log of record.action_logs) {
                            await insert('tb_workflow_action_logs', {
                                id: log.id,
                                form_data_uuid: record.form_data_uuid,
                                project_id: projectId,
                                transition_action: log.action_name,
                                from_state: log.from_state,
                                to_state: log.to_state,
                                action_by: log.action_by,
                                created_at: log.created_at,
                                sync_status: 1
                            }, true);
                        }
                    }
                }
                totalDownloaded += results.length;
            }

            // Break the loop if there's no next page or if data was a simple array
            nextUrl = next;
            if (Array.isArray(data)) nextUrl = null;
        }
        setStatus(`Sync complete for project ${projectId}. ${totalDownloaded} records updated.`);
        return { success: true, count: totalDownloaded };

    } catch (error) {
        console.error(`Workflow sync failed for project ${projectId}:`, error);
        setStatus(`Sync error: ${error.message}`);
        return { success: false, error: error.message };
    }
};



