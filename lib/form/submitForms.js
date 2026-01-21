import { Directory, Paths } from "expo-file-system";
//import { ImageManipulator } from "expo-image-manipulator";
import * as ImageManipulator from 'expo-image-manipulator';
import { Alert } from "react-native";
import { update } from "../../utils/database";
import { postData } from "../../utils/services";

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

const handleFormSubmission = async (data) => {
    const successForms = [];
    const failedForms = [];

    try {
        for (const formItem of data) {
            try {
                const submissionResult = await submitSingleForm(formItem);

                if (submissionResult.success) {
                    successForms.push(formItem.form);
                } else {
                    failedForms.push({ form: formItem.form, error: submissionResult.error });
                }
            } catch (error) {
                console.error(`Submission error for form ${formItem.form}:`, error);
                failedForms.push({ form: formItem.form, error: error.message });
            }
        }

        showSubmissionResults(successForms, failedForms, data.length);
    } catch (error) {
        console.error('Form submission process failed:', error);
        Alert.alert('Error', 'Form submission process failed');
    }
};

const submitSingleForm = async (formItem) => {
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
        console.log(`Directory does not exist for form: ${formItem.form}`);
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

export { submitForms };
