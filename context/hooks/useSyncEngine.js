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

    // Periodically check for dirty data and sync
    useEffect(() => {
        if (loading) return;
        
        const interval = setInterval(() => {
            const hasDirtyData = Object.keys(dataState).some(key => localStore.isDirty(key));
            if (hasDirtyData) {
                triggerSync();
            }
        }, 30000); // Check every 30 seconds

        return () => clearInterval(interval);
    }, [loading, dataState, triggerSync]);

    return {
        isSyncing,
        lastSyncedAt,
        setLastSyncedAt,
        triggerSync
    };
};
