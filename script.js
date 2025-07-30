document.addEventListener('DOMContentLoaded', () => {
    // Seleksi Elemen DOM
    const journalForm = document.getElementById('journal-form');
    const titleInput = document.getElementById('title-input');
    const journalInput = document.getElementById('journal-input');
    const tagInput = document.getElementById('tag-input');
    const entryList = document.getElementById('entry-list');
    const searchInput = document.getElementById('search-input');
    const sortSelect = document.getElementById('sort-select');
    const deleteAllBtn = document.getElementById('delete-all-btn');
    const charCounter = document.getElementById('char-counter');
    const entryCounter = document.getElementById('entry-counter');
    const tagCloudContainer = document.getElementById('tag-cloud-container');
    
    // Seleksi elemen musik
    const backgroundMusic = document.getElementById('background-music');
    const musicToggleBtn = document.getElementById('music-toggle-btn');
    const playIcon = document.getElementById('play-icon');
    const pauseIcon = document.getElementById('pause-icon');

    // Seleksi elemen untuk Modal Edit
    const editModal = document.getElementById('edit-modal');
    const modalTitleInput = document.getElementById('modal-title-input');
    const modalTextarea = document.getElementById('modal-textarea');
    const modalSaveBtn = document.getElementById('modal-save-btn');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');

    // Seleksi elemen untuk Modal Konfirmasi Hapus
    const deleteConfirmModal = document.getElementById('delete-confirm-modal');
    const deleteModalTitle = document.getElementById('delete-modal-title');
    const deleteModalText = document.getElementById('delete-modal-text');
    const deleteConfirmBtn = document.getElementById('delete-confirm-btn');
    const deleteCancelBtn = document.getElementById('delete-cancel-btn');
    
    // Seleksi elemen untuk Ekspor/Impor
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const importFileInput = document.getElementById('import-file-input');

    // Seleksi elemen untuk Modal Notifikasi
    const notificationModal = document.getElementById('notification-modal');
    const notificationTitle = document.getElementById('notification-title');
    const notificationText = document.getElementById('notification-text');
    const notificationOkBtn = document.getElementById('notification-ok-btn');

    // Seleksi container toast
    const toastContainer = document.getElementById('toast-container');

    // Seleksi elemen untuk grafik
    const chartContainer = document.getElementById('chart-container');
    const tagChartCanvas = document.getElementById('tag-chart');
    let myTagChart = null;

    // Variabel state aplikasi
    let currentEditingId = null;
    let currentDeletingId = null;
    let isDeletingAll = false;
    let activeTag = null;

    // --- FUNGSI PENGELOLAAN DATA ---
    function getEntries() {
        const entries = localStorage.getItem('journalEntries');
        return entries ? JSON.parse(entries) : [];
    }

    function saveEntries(entries) {
        localStorage.setItem('journalEntries', JSON.stringify(entries));
    }

    // --- FUNGSI RENDER ---
    function renderEntries(entriesToRender, newEntryId = null) {
        entryCounter.textContent = `${entriesToRender.length} Entries Found`;
        entryList.innerHTML = '';
        
        if (entriesToRender.length === 0) {
            entryList.innerHTML = '<p style="text-align: center; color: #888;">No entries found. Try a different search or add a new entry!</p>';
            return;
        }

        const sortValue = sortSelect.value;
        const totalEntries = entriesToRender.length;

        entriesToRender.forEach((entry, index) => {
            const entryElement = createEntryElement(entry, index, totalEntries, sortValue);
            if (entry.id === newEntryId) {
                entryElement.classList.add('new-entry');
            }
            entryList.appendChild(entryElement);
        });

        Prism.highlightAll();
        renderMathInElement(document.body, {
            delimiters: [
                {left: '$$', right: '$$', display: true},
                {left: '$', right: '$', display: false}
            ]
        });
    }
    
    // REFACTOR: Fungsi-fungsi pembantu untuk render
    function createEntryElement(entry, index, totalEntries, sortValue) {
        const entryContainer = document.createElement('div');
        entryContainer.className = 'entry';
        entryContainer.dataset.id = entry.id;

        const numberElement = document.createElement('div');
        numberElement.className = 'entry-number';
        if (sortValue === 'newest') {
            numberElement.textContent = `${totalEntries - index}.`;
        } else {
            numberElement.textContent = `${index + 1}.`;
        }

        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'entry-content';
        
        const titleElement = document.createElement('h3');
        titleElement.className = 'entry-title';
        titleElement.textContent = entry.title;

        const timestampElement = document.createElement('small');
        timestampElement.className = 'entry-timestamp';
        timestampElement.textContent = new Date(entry.timestamp).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
        
        const textElement = document.createElement('div');
        textElement.className = 'entry-text';
        const rawHtml = marked.parse(entry.text);
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = rawHtml;
        const links = tempDiv.querySelectorAll('a');
        links.forEach(link => {
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
        });
        textElement.innerHTML = tempDiv.innerHTML;
        
        const tagsContainer = createTagsElement(entry);
        const actionsContainer = createActionsElement(entry);

        contentWrapper.appendChild(titleElement);
        contentWrapper.appendChild(timestampElement);
        contentWrapper.appendChild(textElement);
        contentWrapper.appendChild(tagsContainer);

        const TRUNCATE_LENGTH = 300;
        if (entry.text.length > TRUNCATE_LENGTH) {
            textElement.classList.add('truncated');
            const readMoreBtn = document.createElement('button');
            readMoreBtn.textContent = 'Baca Selengkapnya...';
            readMoreBtn.className = 'read-more-btn';
            readMoreBtn.addEventListener('click', () => {
                textElement.classList.remove('truncated');
                readMoreBtn.remove();
            });
            contentWrapper.appendChild(readMoreBtn);
        }
        
        contentWrapper.appendChild(actionsContainer);
        entryContainer.appendChild(numberElement);
        entryContainer.appendChild(contentWrapper);
        return entryContainer;
    }

    function createTagsElement(entry) {
        const container = document.createElement('div');
        container.className = 'entry-tags';
        if (entry.tags && entry.tags.length > 0) {
            entry.tags.forEach(tag => {
                const tagSpan = document.createElement('span');
                tagSpan.className = 'entry-tag';
                tagSpan.textContent = tag;
                container.appendChild(tagSpan);
            });
        }
        return container;
    }

    function createActionsElement(entry) {
        const container = document.createElement('div');
        container.className = 'entry-actions';

        const copyButton = document.createElement('button');
        copyButton.textContent = 'Salin';
        copyButton.className = 'copy-btn';
        copyButton.addEventListener('click', () => copyEntryToClipboard(entry.text));

        const editButton = document.createElement('button');
        editButton.textContent = 'Edit';
        editButton.className = 'edit-btn';
        editButton.addEventListener('click', () => openEditModal(entry.id));
        
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.className = 'delete-btn';
        deleteButton.addEventListener('click', () => openDeleteConfirmModal(entry.id));

        container.appendChild(copyButton);
        container.appendChild(editButton);
        container.appendChild(deleteButton);
        return container;
    }

    function renderTagCloud() {
        const allEntries = getEntries();
        const allTags = allEntries.flatMap(entry => entry.tags || []);
        const uniqueTags = [...new Set(allTags)];
        tagCloudContainer.innerHTML = '';

        const allButton = document.createElement('button');
        allButton.textContent = 'Semua Entri';
        allButton.className = 'tag-btn';
        if (activeTag === null) {
            allButton.classList.add('active');
        }
        allButton.addEventListener('click', () => {
            activeTag = null;
            refreshJournalView();
        });
        tagCloudContainer.appendChild(allButton);

        uniqueTags.forEach(tag => {
            const tagButton = document.createElement('button');
            tagButton.textContent = tag;
            tagButton.className = 'tag-btn';
            if (tag === activeTag) {
                tagButton.classList.add('active');
            }
            tagButton.addEventListener('click', () => {
                activeTag = tag;
                refreshJournalView();
            });
            tagCloudContainer.appendChild(tagButton);
        });
    }

    function renderTagChart() {
        const allEntries = getEntries();
        const allTags = allEntries.flatMap(entry => entry.tags || []);
        
        if (allTags.length === 0) {
            chartContainer.style.display = 'none';
            return;
        }
        
        chartContainer.style.display = 'block';

        const tagCounts = allTags.reduce((acc, tag) => {
            acc[tag] = (acc[tag] || 0) + 1;
            return acc;
        }, {});

        const labels = Object.keys(tagCounts);
        const data = Object.values(tagCounts);

        if (myTagChart) {
            myTagChart.destroy();
        }

        myTagChart = new Chart(tagChartCanvas, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Jumlah Entri',
                    data: data,
                    backgroundColor: [
                        'rgba(212, 175, 55, 0.8)',
                        'rgba(100, 149, 237, 0.8)',
                        'rgba(218, 112, 214, 0.8)',
                        'rgba(255, 105, 97, 0.8)',
                        'rgba(0, 191, 255, 0.8)',
                        'rgba(240, 230, 140, 0.8)'
                    ],
                    borderColor: '#1e1e1e',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#f0f0f0',
                            font: {
                                family: "'Inter', sans-serif"
                            }
                        }
                    }
                }
            }
        });
    }

    // REFACTOR: Nama fungsi diubah menjadi lebih deskriptif
    /**
     * Fungsi utama untuk memuat ulang seluruh tampilan jurnal.
     * Mengambil data, memfilter, mengurutkan, lalu memanggil semua fungsi render.
     * @param {number|null} newEntryId - ID entri baru untuk dianimasikan.
     */
    function refreshJournalView(newEntryId = null) {
        // 1. Ambil semua data
        let allEntries = getEntries();
        const searchTerm = searchInput.value.toLowerCase();
        const sortValue = sortSelect.value;
        
        // 2. Filter data berdasarkan tag dan pencarian
        if (activeTag) {
            allEntries = allEntries.filter(entry => entry.tags && entry.tags.includes(activeTag));
        }
        const filteredEntries = allEntries.filter(entry => 
            entry.text.toLowerCase().includes(searchTerm) || 
            (entry.title && entry.title.toLowerCase().includes(searchTerm))
        );

        // 3. Urutkan data
        if (sortValue === 'newest') {
            filteredEntries.sort((a, b) => b.id - a.id);
        } else if (sortValue === 'oldest') {
            filteredEntries.sort((a, b) => a.id - b.id);
        }

        // 4. Panggil semua fungsi render dengan data yang sudah diproses
        renderEntries(filteredEntries, newEntryId);
        renderTagCloud();
        renderTagChart();
    }

    // --- FUNGSI MODAL & CRUD ---
    function openEditModal(id) {
        const entries = getEntries();
        const entryToEdit = entries.find(e => e.id === id);
        if (!entryToEdit) return;
        currentEditingId = id;
        modalTitleInput.value = entryToEdit.title || '';
        modalTextarea.value = entryToEdit.text;
        editModal.style.display = 'flex';
    }

    function closeEditModal() {
        currentEditingId = null;
        editModal.style.display = 'none';
    }

    function saveEdit() {
        if (currentEditingId === null) return;
        const entries = getEntries();
        const entryToEdit = entries.find(e => e.id === currentEditingId);
        const newTitle = modalTitleInput.value.trim();
        const newText = modalTextarea.value.trim();
        if (entryToEdit && newTitle && newText) {
            entryToEdit.title = newTitle;
            entryToEdit.text = newText;
            saveEntries(entries);
            refreshJournalView();
        }
        closeEditModal();
    }
    
    function openDeleteConfirmModal(id) {
        if (id) {
            isDeletingAll = false;
            currentDeletingId = id;
            deleteModalTitle.textContent = 'Confirm Deletion';
            deleteModalText.textContent = 'Are you sure you want to permanently delete this entry? This action cannot be undone.';
        } else {
            isDeletingAll = true;
            currentDeletingId = null; 
            deleteModalTitle.textContent = 'Delete All Entries';
            deleteModalText.textContent = 'Are you sure you want to delete ALL entries? This is irreversible.';
        }
        deleteConfirmModal.style.display = 'flex';
    }

    function closeDeleteConfirmModal() {
        deleteConfirmModal.style.display = 'none';
    }

    function confirmDelete() {
        if (isDeletingAll) {
            const allEntryElements = document.querySelectorAll('.entry');
            allEntryElements.forEach(el => el.classList.add('removing'));
            setTimeout(() => {
                saveEntries([]);
                refreshJournalView();
                isDeletingAll = false;
            }, 300);
        } else if (currentDeletingId !== null) {
            const entryElement = document.querySelector(`.entry[data-id="${currentDeletingId}"]`);
            if (entryElement) {
                entryElement.classList.add('removing');
                const idToDelete = currentDeletingId;
                setTimeout(() => {
                    let entries = getEntries();
                    entries = entries.filter(e => e.id !== idToDelete);
                    saveEntries(entries);
                    currentDeletingId = null;
                    refreshJournalView();
                }, 300);
            }
        }
        closeDeleteConfirmModal();
    }

    function updateCharCounter() {
        const currentLength = journalInput.value.length;
        charCounter.textContent = `${currentLength}`;
    }

    function copyEntryToClipboard(text) {
        const tempTextarea = document.createElement('textarea');
        tempTextarea.value = text;
        document.body.appendChild(tempTextarea);
        tempTextarea.select();
        document.execCommand('copy');
        document.body.removeChild(tempTextarea);
        showToast('Teks berhasil disalin!');
    }

    function loadSettings() {
        const savedSortPreference = localStorage.getItem('journalSortPreference');
        if (savedSortPreference) {
            sortSelect.value = savedSortPreference;
        }
    }

    function showNotification(title, message) {
        notificationTitle.textContent = title;
        notificationText.textContent = message;
        notificationModal.style.display = 'flex';
    }

    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('show');
        }, 100);

        setTimeout(() => {
            toast.classList.remove('show');
            toast.classList.add('hide');
            toast.addEventListener('transitionend', () => toast.remove());
        }, 3000);
    }

    function saveDraft() {
        const draft = {
            title: titleInput.value,
            text: journalInput.value,
            tags: tagInput.value
        };
        localStorage.setItem('journalDraft', JSON.stringify(draft));
    }

    function loadDraft() {
        const savedDraft = localStorage.getItem('journalDraft');
        if (savedDraft) {
            const draft = JSON.parse(savedDraft);
            titleInput.value = draft.title || '';
            journalInput.value = draft.text || '';
            tagInput.value = draft.tags || '';
            updateCharCounter();
        }
    }

    function clearDraft() {
        localStorage.removeItem('journalDraft');
    }

    // --- EVENT LISTENERS ---
    journalForm.addEventListener('submit', function(event) {
        event.preventDefault();
        const title = titleInput.value.trim();
        const text = journalInput.value.trim();
        const tags = tagInput.value.trim().split(/[\s,]+/).filter(tag => tag.startsWith('#') && tag.length > 1);

        if (title && text) {
            const newEntry = {
                id: Date.now(),
                title: title,
                text: text,
                timestamp: new Date().toISOString(),
                tags: tags
            };
            const currentEntries = getEntries();
            currentEntries.push(newEntry);
            saveEntries(currentEntries);
            
            titleInput.value = '';
            journalInput.value = '';
            tagInput.value = '';
            clearDraft();
            updateCharCounter();
            refreshJournalView(newEntry.id);
        }
    });

    [titleInput, journalInput, tagInput].forEach(input => {
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && event.ctrlKey) {
                event.preventDefault();
                journalForm.querySelector('button[type="submit"]').click();
            }
        });
        input.addEventListener('input', saveDraft);
    });

    deleteAllBtn.addEventListener('click', () => {
        if (getEntries().length > 0) {
            openDeleteConfirmModal(null);
        }
    });

    journalInput.addEventListener('input', updateCharCounter);
    searchInput.addEventListener('input', refreshJournalView);
    
    sortSelect.addEventListener('change', () => {
        localStorage.setItem('journalSortPreference', sortSelect.value);
        refreshJournalView();
    });
    
    musicToggleBtn.addEventListener('click', () => {
        if (backgroundMusic.paused) {
            backgroundMusic.play();
            playIcon.style.display = 'none';
            pauseIcon.style.display = 'inline-block';
        } else {
            backgroundMusic.pause();
            playIcon.style.display = 'inline-block';
            pauseIcon.style.display = 'none';
        }
    });

    exportBtn.addEventListener('click', () => {
        const entries = getEntries();
        if (entries.length === 0) {
            showNotification('Ekspor Gagal', 'Tidak ada data untuk diekspor.');
            return;
        }
        const dataStr = JSON.stringify(entries, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'physics-journal-backup.json';
        link.click();
        URL.revokeObjectURL(url);
    });

    importBtn.addEventListener('click', () => {
        importFileInput.click();
    });

    importFileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedEntries = JSON.parse(e.target.result);
                if (isValidJournalData(importedEntries)) {
                    isDeletingAll = true;
                    deleteModalTitle.textContent = 'Konfirmasi Impor';
                    deleteModalText.textContent = 'Ini akan menimpa semua entri yang ada. Lanjutkan?';
                    deleteConfirmModal.style.display = 'flex';
                    
                    const importConfirmHandler = () => {
                        saveEntries(importedEntries);
                        refreshJournalView();
                        closeDeleteConfirmModal();
                        deleteConfirmBtn.removeEventListener('click', importConfirmHandler);
                        deleteConfirmBtn.addEventListener('click', confirmDelete);
                    };
                    
                    deleteConfirmBtn.removeEventListener('click', confirmDelete);
                    deleteConfirmBtn.addEventListener('click', importConfirmHandler);

                } else {
                    showNotification('Impor Gagal', 'File JSON tidak memiliki struktur data jurnal yang benar.');
                }
            } catch (error) {
                showNotification('Impor Gagal', 'Gagal membaca file. Pastikan file dalam format JSON yang benar.');
            }
        };
        reader.readAsText(file);
        importFileInput.value = '';
    });


    modalSaveBtn.addEventListener('click', saveEdit);
    modalCancelBtn.addEventListener('click', closeEditModal);
    editModal.addEventListener('click', (event) => { if (event.target === editModal) closeEditModal(); });
    deleteConfirmBtn.addEventListener('click', confirmDelete);
    deleteCancelBtn.addEventListener('click', closeDeleteConfirmModal);
    deleteConfirmModal.addEventListener('click', (event) => { if (event.target === deleteConfirmModal) closeDeleteConfirmModal(); });
    
    notificationOkBtn.addEventListener('click', () => {
        notificationModal.style.display = 'none';
    });
    notificationModal.addEventListener('click', (event) => {
        if (event.target === notificationModal) {
            notificationModal.style.display = 'none';
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            if (editModal.style.display === 'flex') {
                closeEditModal();
            }
            if (deleteConfirmModal.style.display === 'flex') {
                closeDeleteConfirmModal();
            }
            if (notificationModal.style.display === 'flex') {
                notificationModal.style.display = 'none';
            }
        }
    });

    // --- PEMUATAN AWAL ---
    loadSettings();
    loadDraft();
    refreshJournalView();
    updateCharCounter();
    backgroundMusic.volume = 0.3;
});
