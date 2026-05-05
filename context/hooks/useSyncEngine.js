import { useState, useEffect, useCallback, useRef } from 'react';
import { apiService } from '../../services/apiService';
import { localStore } from '../../services/core';

/**
 * Hook to manage synchronization engine and background refresh.
 */
export const useSyncEngine = (loading, setError, dataState, dataSetters) => {
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncedAt, setLastSyncedAt] = useState(null);
    const isSyncingRef = useRef(false);

    const triggerSync = useCallback(async () => {
        if (isSyncingRef.current || !navigator.onLine) return;
        
        try {
            isSyncingRef.current = true;
            setIsSyncing(true);
            
            await apiService.syncAll(dataState);
            
            setLastSyncedAt(new Date());
        } catch (err) {
            console.error('Auto-sync failed:', err);
        } finally {
            setIsSyncing(false);
            isSyncingRef.current = false;
        }
    }, [dataState]);

    // Check for dirty data and sync
    useEffect(() => {
        if (loading) return;
        
        // Immediate sync for dirty data
        const hasDirtyData = Object.keys(dataState).some(key => localStore.isDirty(key));
        
        let timeout;
        if (hasDirtyData) {
            // Debounce sync to catch rapid updates
            timeout = setTimeout(() => {
                triggerSync();
            }, 2000);
        }

        // Periodic fallback check
        const interval = setInterval(() => {
            const isAnyDirty = Object.keys(dataState).some(key => localStore.isDirty(key));
            if (isAnyDirty) {
                triggerSync();
            }
        }, 60000);

        return () => {
            if (timeout) clearTimeout(timeout);
            clearInterval(interval);
        };
    }, [loading, dataState, triggerSync]);

    return {
        isSyncing,
        lastSyncedAt,
        setLastSyncedAt,
        triggerSync
    };
};
