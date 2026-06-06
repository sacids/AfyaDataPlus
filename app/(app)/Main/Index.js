import { useFocusEffect } from 'expo-router';
import { useCallback, useReducer } from 'react';
import { ActivityIndicator, View } from 'react-native';

import FormDataView from '../../../components/form/FormDataView';
import { select } from '../../../utils/database';

import ProjectDetailView from '../../../components/form/ProjectDetailView';
import ProjectListView from '../../../components/form/ProjectListView';
import { ScreenWrapper } from '../../../components/layout/ScreenWrapper';
import useProjectStore from '../../../store/projectStore';

// 1. Define distinct states to avoid race conditions
const initialState = {
    status: 'idle', // 'loading', 'success', 'error'
    mode: 'projectList', // 'projectList', 'projectDetail', 'formDetail'
    data: null,
    list: [],
    error: null
};

function screenReducer(state, action) {
    switch (action.type) {
        case 'FETCH_START':
            return { ...state, status: 'loading' };
        case 'SET_PROJECT_LIST':
            return { ...state, status: 'success', mode: 'projectList', list: action.payload, data: null };
        case 'SET_PROJECT_DETAIL':
            return { 
                ...state, 
                status: 'success', 
                mode: 'projectDetail', 
                // Fallback gracefully if payroll structural attributes are flat objects
                list: action.payload?.forms || [], 
                data: action.payload?.project || action.payload 
            };
        case 'SET_FORM_DETAIL':
            return { ...state, status: 'success', mode: 'formDetail', data: action.payload };
        case 'SET_ERROR':
            return { ...state, status: 'error', error: action.payload };
        default:
            return state;
    }
}

export default function FormDataOrProjectListScreen() {
    const [state, dispatch] = useReducer(screenReducer, initialState);

    // FIX: Renamed 'state' parameter to 'store' to avoid clashing with useReducer's state variable
    const currentProject = useProjectStore(store => store.currentProject);
    const currentData = useProjectStore(store => store.currentData);

    // 2. Use a stable callback to prevent memory leaks/infinite loops
    const loadScreenData = useCallback(async () => {
        dispatch({ type: 'FETCH_START' });
        try {
            if (currentData) {
                const result = await select('form_data', 'id = ?', [currentData.id]);
                if (result.length > 0) {
                    dispatch({ type: 'SET_FORM_DETAIL', payload: result[0] });
                    return;
                }
            }

            if (currentProject && currentProject.id) {
                dispatch({ type: 'SET_PROJECT_DETAIL', payload: currentProject });
                return;
            }

            // Fallback to Project List
            const projectWithStats = await select('projects', 'active = 1 ORDER BY sort_order');
            dispatch({ type: 'SET_PROJECT_LIST', payload: projectWithStats || [] });

        } catch (err) {
            console.error("Screen initialization error:", err);
            dispatch({ type: 'SET_ERROR', payload: err.message });
        }
    }, [currentData, currentProject]);

    useFocusEffect(
        useCallback(() => {
            let isMounted = true;
            if (isMounted) loadScreenData();
            return () => { isMounted = false; };
        }, [loadScreenData])
    );

    // 3. Decoupled Rendering logic
    if (state.status === 'loading') {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <ScreenWrapper>
            {state.mode === 'formDetail' && state.data && (
                <FormDataView formData={state.data} />
            )}

            {state.mode === 'projectDetail' && (
                <ProjectDetailView project={state.data} />
            )}

            {state.mode === 'projectList' && (
                <ProjectListView projects={state.list} />
            )}
        </ScreenWrapper>
    );
}