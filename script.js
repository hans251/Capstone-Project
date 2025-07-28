document.addEventListener('DOMContentLoaded', () => {
    // PERBAIKAN: Konfigurasi kustom untuk marked.js dihapus karena menyebabkan bug.
    // Kita akan menangani tautan dengan cara yang lebih aman setelahnya.


    // Seleksi Elemen DOM
    const journalForm = document.getElementById('journal-form');
    const journalInput = document.getElementById('journal-input');
    const entryList = document.getElementById('entry-list');
    const searchInput = document.getElementById('search-input');
    const sortSelect = document.getElementById('sort-select');
    const deleteAllBtn = document.getElementById('delete-all-btn');
    const charCounter = document.getElementById('char-counter');
    const entryCounter = document.getElementById('entry-counter');
    
    // Seleksi elemen musik
    const backgroundMusic = document.getElementById('background-music');
    const musicToggleBtn = document.getElementById('music-toggle-btn');
    const playIcon = document.getElementById('play-icon');
    const pauseIcon = document.getElementById('pause-icon');

    // Seleksi elemen untuk Modal Edit
    const editModal = document.getElementById('edit-modal');
    const modalTextarea = document.getElementById('modal-textarea');
    const modalSaveBtn = document.getElementById('modal-save-btn');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');

    // Seleksi elemen untuk Modal Konfirmasi Hapus
    const deleteConfirmModal = document.getElementById('delete-confirm-modal');
    const deleteModalTitle = document.getElementById('delete-modal-title');
    const deleteModalText = document.getElementById('delete-modal-text');
    const deleteConfirmBtn = document.getElementById('delete-confirm-btn');
    const deleteCancelBtn = document.getElementById('delete-cancel-btn');
    
    let currentEditingId = null;
    let currentDeletingId = null;
    let isDeletingAll = false;

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
        const entries = entriesToRender;

        if (entries.length === 0) {
            entryList.innerHTML = '<p style="text-align: center; color: #888;">No entries found. Try a different search or add a new entry!</p>';
            return;
        }

        const sortValue = sortSelect.value;
        const totalEntries = entries.length;

        entries.forEach((entry, index) => {
            const entryDiv = document.createElement('div');
            entryDiv.className = 'entry';
            entryDiv.dataset.id = entry.id;

            if (entry.id === newEntryId) {
                entryDiv.classList.add('new-entry');
            }

            const entryNumber = document.createElement('div');
            entryNumber.className = 'entry-number';
            
            if (sortValue === 'newest') {
                entryNumber.textContent = `${totalEntries - index}.`;
            } else {
                entryNumber.textContent = `${index + 1}.`;
            }

            const entryContent = document.createElement('div');
            entryContent.className = 'entry-content';
            const timestamp = document.createElement('small');
            timestamp.className = 'entry-timestamp';
            timestamp.textContent = new Date(entry.timestamp).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
            
            const entryText = document.createElement('div');
            entryText.className = 'entry-text';

            // PERBAIKAN KUNCI: Logika baru untuk menangani tautan dengan aman
            // 1. Parse Markdown menjadi HTML mentah
            const rawHtml = marked.parse(entry.text);
            // 2. Buat elemen sementara untuk memanipulasi HTML ini
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = rawHtml;
            // 3. Cari semua tag <a> di dalamnya
            const links = tempDiv.querySelectorAll('a');
            // 4. Tambahkan atribut yang benar ke setiap tautan
            links.forEach(link => {
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
            });
            // 5. Gunakan HTML yang sudah dimodifikasi
            entryText.innerHTML = tempDiv.innerHTML;
            
            const entryActions = document.createElement('div');
            entryActions.className = 'entry-actions';

            const copyButton = document.createElement('button');
            copyButton.textContent = 'Salin';
            copyButton.className = 'copy-btn';
            copyButton.addEventListener('click', () => copyEntryToClipboard(entry.text, copyButton));

            const editButton = document.createElement('button');
            editButton.textContent = 'Edit';
            editButton.className = 'edit-btn';
            editButton.addEventListener('click', () => openEditModal(entry.id));
            
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.className = 'delete-btn';
            deleteButton.addEventListener('click', () => openDeleteConfirmModal(entry.id));

            entryActions.appendChild(copyButton);
            entryActions.appendChild(editButton);
            entryActions.appendChild(deleteButton);
            
            entryContent.appendChild(timestamp);
            entryContent.appendChild(entryText);

            const TRUNCATE_LENGTH = 300;
            if (entry.text.length > TRUNCATE_LENGTH) {
                entryText.classList.add('truncated');
                const readMoreBtn = document.createElement('button');
                readMoreBtn.textContent = 'Baca Selengkapnya...';
                readMoreBtn.className = 'read-more-btn';
                readMoreBtn.addEventListener('click', () => {
                    entryText.classList.remove('truncated');
                    readMoreBtn.remove();
                });
                entryContent.appendChild(readMoreBtn);
            }
            
            entryContent.appendChild(entryActions);
            entryDiv.appendChild(entryNumber);
            entryDiv.appendChild(entryContent);
            entryList.appendChild(entryDiv);
        });
    }
    
    // --- FUNGSI UTAMA UNTUK MEMPERBARUI TAMPILAN ---
    function updateDisplay(newEntryId = null) {
        const allEntries = getEntries();
        const searchTerm = searchInput.value.toLowerCase();
        const sortValue = sortSelect.value;
        const filteredEntries = allEntries.filter(entry => entry.text.toLowerCase().includes(searchTerm));

        if (sortValue === 'newest') {
            filteredEntries.sort((a, b) => b.id - a.id);
        } else if (sortValue === 'oldest') {
            filteredEntries.sort((a, b) => a.id - b.id);
        }
        renderEntries(filteredEntries, newEntryId);
    }

    // --- FUNGSI MODAL & CRUD ---
    function openEditModal(id) {
        const entries = getEntries();
        const entryToEdit = entries.find(e => e.id === id);
        if (!entryToEdit) return;
        currentEditingId = id;
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
        const newText = modalTextarea.value.trim();
        if (entryToEdit && newText) {
            entryToEdit.text = newText;
            saveEntries(entries);
            updateDisplay();
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
                updateDisplay();
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
                    updateDisplay();
                }, 300);
            }
        }
        closeDeleteConfirmModal();
    }

    function updateCharCounter() {
        const currentLength = journalInput.value.length;
        const maxLength = journalInput.maxLength;
        charCounter.textContent = `${currentLength} / ${maxLength}`;
    }

    function copyEntryToClipboard(text, buttonElement) {
        const tempTextarea = document.createElement('textarea');
        tempTextarea.value = text;
        document.body.appendChild(tempTextarea);
        tempTextarea.select();
        document.execCommand('copy');
        document.body.removeChild(tempTextarea);

        buttonElement.textContent = 'Tersalin!';
        buttonElement.classList.add('copied');

        setTimeout(() => {
            buttonElement.textContent = 'Salin';
            buttonElement.classList.remove('copied');
        }, 1500);
    }

    function loadSettings() {
        const savedSortPreference = localStorage.getItem('journalSortPreference');
        if (savedSortPreference) {
            sortSelect.value = savedSortPreference;
        }
    }

    // --- EVENT LISTENERS ---
    journalForm.addEventListener('submit', function(event) {
        event.preventDefault();
        const text = journalInput.value.trim();
        if (text) {
            const newEntry = {
                id: Date.now(),
                text: text,
                timestamp: new Date().toISOString()
            };
            const currentEntries = getEntries();
            currentEntries.push(newEntry);
            saveEntries(currentEntries);
            journalInput.value = '';
            updateCharCounter();
            updateDisplay(newEntry.id);
        }
    });

    deleteAllBtn.addEventListener('click', () => {
        if (getEntries().length > 0) {
            openDeleteConfirmModal(null);
        }
    });

    journalInput.addEventListener('input', updateCharCounter);
    searchInput.addEventListener('input', updateDisplay);
    
    sortSelect.addEventListener('change', () => {
        localStorage.setItem('journalSortPreference', sortSelect.value);
        updateDisplay();
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

    modalSaveBtn.addEventListener('click', saveEdit);
    modalCancelBtn.addEventListener('click', closeEditModal);
    editModal.addEventListener('click', (event) => { if (event.target === editModal) closeEditModal(); });
    deleteConfirmBtn.addEventListener('click', confirmDelete);
    deleteCancelBtn.addEventListener('click', closeDeleteConfirmModal);
    deleteConfirmModal.addEventListener('click', (event) => { if (event.target === deleteConfirmModal) closeDeleteConfirmModal(); });

    // --- PEMUATAN AWAL ---
    loadSettings();
    updateDisplay();
    updateCharCounter();
    backgroundMusic.volume = 0.3;
});
