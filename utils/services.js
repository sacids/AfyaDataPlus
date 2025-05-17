import api from "../api/axiosInstance";
import { insert, select } from "./database";

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