import React, { useState, useMemo } from "react";
import { useData } from "../../context/DataContext";
import ConfirmModal from "../ConfirmModal";
import {
  Archive,
  GraduationCap,
  UserRound,
  RefreshCw,
  Trash2,
  Inbox,
  Search,
  AlertCircle,
  CheckSquare,
  Square,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const ArchiveManager = () => {
  const {
    classes,
    unarchiveClass,
    deleteClass,
    students,
    unarchiveStudent,
    deleteStudent,
    staff,
    unarchiveStaff,
    deleteStaff,
  } = useData();

  const [activeTab, setActiveTab] = useState("students");
  const [selectedIds, setSelectedIds] = useState([]);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Filter archived items
  const archivedClasses = useMemo(() => classes.filter((cls) => cls.isArchived === true), [classes]);
  const archivedStudents = useMemo(() => students.filter((stu) => stu.isArchived === true), [students]);
  const archivedStaff = useMemo(() => staff.filter((s) => s.isArchived === true), [staff]);

  const currentItems = useMemo(() => {
    switch (activeTab) {
      case "classes": return archivedClasses;
      case "students": return archivedStudents;
      case "staff": return archivedStaff;
      default: return [];
    }
  }, [activeTab, archivedClasses, archivedStudents, archivedStaff]);

  const filteredItems = useMemo(() => {
    if (!searchQuery) return currentItems;
    return currentItems.filter(
      (item) =>
        item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.id?.toString().includes(searchQuery.toLowerCase()),
    );
  }, [currentItems, searchQuery]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map((item) => item.id));
    }
  };

  const toggleSelectItem = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBatchDelete = () => {
    setItemToDelete({ type: activeTab, isBatch: true });
    setIsConfirmDeleteOpen(true);
  };

  const handleBatchRestore = async () => {
    setIsProcessing(true);
    try {
      const tasks = selectedIds.map(id => {
        if (activeTab === "classes") return unarchiveClass(id);
        if (activeTab === "students") return unarchiveStudent(id);
        if (activeTab === "staff") return unarchiveStaff(id);
        return null;
      });
      await Promise.all(tasks);
      setSelectedIds([]);
    } catch (err) {
      console.error("Batch restore failed", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setIsProcessing(true);
    try {
      const idsToDelete = itemToDelete.isBatch ? selectedIds : [itemToDelete.id];
      const tasks = idsToDelete.map(id => {
        if (activeTab === "classes") return deleteClass(id);
        if (activeTab === "students") return deleteStudent(id);
        if (activeTab === "staff") return deleteStaff(id);
        return null;
      });
      await Promise.all(tasks);
      setSelectedIds([]);
      setIsConfirmDeleteOpen(false);
      setItemToDelete(null);
    } catch (err) {
      alert("Failed to delete permanently: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header Area */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/5 blur-[100px] -mr-32 -mt-32 pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-full text-[10px] font-black uppercase tracking-wider mb-4">
                <AlertCircle className="w-3 h-3" />
                Administrative Storage
              </div>
              <h2 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight mb-2">
                System Archive
              </h2>
              <p className="text-slate-500 dark:text-slate-400 font-medium max-w-lg">
                Restore accidentally deleted records or permanently purge them from the cloud.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative group w-full sm:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
                <input
                  type="text"
                  placeholder={`Search archived ${activeTab}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-primary-500/20 transition-all"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
        {/* Navigation & Selection Toggle */}
        <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex p-1 bg-slate-200/50 dark:bg-slate-900/50 rounded-xl">
            {[
              { id: "students", label: "Students", icon: <GraduationCap className="w-4 h-4" /> },
              { id: "staff", label: "Staff", icon: <UserRound className="w-4 h-4" /> },
              { id: "classes", label: "Classes", icon: <Archive className="w-4 h-4" /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSelectedIds([]); }}
                className={`px-5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTab === tab.id
                    ? "bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {filteredItems.length > 0 && (
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
            >
              {selectedIds.length === filteredItems.length ? (
                <CheckSquare className="w-4 h-4 text-primary-500" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              {selectedIds.length === filteredItems.length ? "Deselect All" : "Select All"}
            </button>
          )}
        </div>

        {/* List Content */}
        <div className="flex-1 relative">
          <AnimatePresence mode="wait">
            {filteredItems.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-20"
              >
                <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6 text-slate-300">
                  <Inbox className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">No archived records</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Everything is nice and clean.</p>
              </motion.div>
            ) : (
              <div className="divide-y divide-slate-50 dark:divide-slate-800">
                {filteredItems.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`group flex items-center gap-4 p-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-all ${
                      selectedIds.includes(item.id) ? "bg-primary-50/30 dark:bg-primary-900/10" : ""
                    }`}
                  >
                    <button
                      onClick={() => toggleSelectItem(item.id)}
                      className="p-2 rounded-lg transition-all"
                    >
                      {selectedIds.includes(item.id) ? (
                        <CheckCircle2 className="w-6 h-6 text-primary-500 fill-primary-500/10" />
                      ) : (
                        <div className="w-6 h-6 rounded-md border-2 border-slate-200 dark:border-slate-700 group-hover:border-primary-400 transition-all" />
                      )}
                    </button>

                    <div className="flex-1 flex items-center justify-between pr-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 font-bold overflow-hidden">
                          {item.name?.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 dark:text-white">{item.name}</h4>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID: {item.id}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          onClick={() => {
                            if (activeTab === "classes") unarchiveClass(item.id);
                            if (activeTab === "students") unarchiveStudent(item.id);
                            if (activeTab === "staff") unarchiveStaff(item.id);
                          }}
                          title="Restore"
                          className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setItemToDelete(item)}
                          title="Delete Permanently"
                          className="p-2.5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Batch Action Bar */}
        <AnimatePresence>
          {selectedIds.length > 0 && (
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 p-4 rounded-3xl shadow-2xl flex items-center justify-between z-50 border border-white/10 dark:border-slate-200"
            >
              <div className="flex items-center gap-3 pl-2">
                <div className="w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center text-xs font-black">
                  {selectedIds.length}
                </div>
                <span className="text-sm font-bold tracking-tight">Items selected</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedIds([])}
                  className="px-4 py-2 text-xs font-bold hover:bg-white/10 dark:hover:bg-slate-100 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBatchRestore}
                  disabled={isProcessing}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-2xl text-xs font-black hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                  Restore Selected
                </button>
                <button
                  onClick={handleBatchDelete}
                  disabled={isProcessing}
                  className="flex items-center gap-2 px-5 py-2.5 bg-rose-500 text-white rounded-2xl text-xs font-black hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/20 disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete All
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ConfirmModal
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={confirmDelete}
        title={itemToDelete?.isBatch ? `Delete ${selectedIds.length} Records?` : "Permanent Deletion"}
        message={`Are you sure you want to permanently delete ${itemToDelete?.isBatch ? 'these items' : itemToDelete?.name}? This action cannot be undone.`}
        confirmText={isProcessing ? "Processing..." : "Yes, Delete Forever"}
      />
    </div>
  );
};

export default ArchiveManager;
