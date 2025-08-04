// Mengimpor koneksi (db, auth) dari file konfigurasi dan fungsi-fungsi Firebase yang dibutuhkan.
import { db, auth } from "./firebase-config.js";
import {
  collection,
  query,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  getDocs,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import {
  signInAnonymously,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
  // Seleksi semua elemen DOM yang dibutuhkan
  const journalForm = document.getElementById("journal-form");
  const titleInput = document.getElementById("title-input");
  const journalInput = document.getElementById("journal-input");
  const tagInput = document.getElementById("tag-input");
  const entryList = document.getElementById("entry-list");
  const searchInput = document.getElementById("search-input");
  const sortSelect = document.getElementById("sort-select");
  const deleteAllBtn = document.getElementById("delete-all-btn");
  const charCounter = document.getElementById("char-counter");
  const entryCounter = document.getElementById("entry-counter");
  const tagCloudContainer = document.getElementById("tag-cloud-container");
  const backgroundMusic = document.getElementById("background-music");
  const musicToggleBtn = document.getElementById("music-toggle-btn");
  const playIcon = document.getElementById("play-icon");
  const pauseIcon = document.getElementById("pause-icon");
  const editModal = document.getElementById("edit-modal");
  const modalTitleInput = document.getElementById("modal-title-input");
  const modalTextarea = document.getElementById("modal-textarea");
  const modalSaveBtn = document.getElementById("modal-save-btn");
  const modalCancelBtn = document.getElementById("modal-cancel-btn");
  const deleteConfirmModal = document.getElementById("delete-confirm-modal");
  const deleteModalTitle = document.getElementById("delete-modal-title");
  const deleteModalText = document.getElementById("delete-modal-text");
  const deleteConfirmBtn = document.getElementById("delete-confirm-btn");
  const deleteCancelBtn = document.getElementById("delete-cancel-btn");
  const exportBtn = document.getElementById("export-btn");
  const importBtn = document.getElementById("import-btn");
  const importFileInput = document.getElementById("import-file-input");
  const notificationModal = document.getElementById("notification-modal");
  const notificationTitle = document.getElementById("notification-title");
  const notificationText = document.getElementById("notification-text");
  const notificationOkBtn = document.getElementById("notification-ok-btn");
  const toastContainer = document.getElementById("toast-container");
  const chartContainer = document.getElementById("chart-container");
  const tagChartCanvas = document.getElementById("tag-chart");
  const infoBtn = document.getElementById("info-btn");
  const infoModal = document.getElementById("info-modal");
  const infoOkBtn = document.getElementById("info-ok-btn");

  // Variabel untuk menyimpan state aplikasi
  let myTagChart = null;
  let currentEditingId = null;
  let currentDeletingId = null;
  let isDeletingAll = false;
  let activeTag = null;
  let allEntries = []; // Sumber data utama, diisi oleh Firebase secara real-time
  let currentUser = null; // Menyimpan info pengguna yang login
  let entriesListener = null; // Menyimpan fungsi 'unsubscribe' dari listener Firebase

  // --- FUNGSI PENGELOLAAN DATA (FIREBASE) ---

  async function addEntry(entryData) {
    if (!currentUser) return;
    try {
      const collectionRef = collection(db, "users", currentUser.uid, "entries");
      await addDoc(collectionRef, entryData);
    } catch (error) {
      console.error("Error adding document: ", error);
      showNotification("Error", "Gagal menyimpan entri baru.");
    }
  }

  async function updateEntry(id, updatedData) {
    if (!currentUser) return;
    try {
      const docRef = doc(db, "users", currentUser.uid, "entries", id);
      await updateDoc(docRef, updatedData);
    } catch (error) {
      console.error("Error updating document: ", error);
      showNotification("Error", "Gagal memperbarui entri.");
    }
  }

  async function deleteEntry(id) {
    if (!currentUser) return;
    try {
      await deleteDoc(doc(db, "users", currentUser.uid, "entries", id));
    } catch (error) {
      console.error("Error deleting document: ", error);
      showNotification("Error", "Gagal menghapus entri.");
    }
  }

  async function deleteAllEntries() {
    if (!currentUser) return;
    const collectionRef = collection(db, "users", currentUser.uid, "entries");
    const querySnapshot = await getDocs(collectionRef);
    const batch = writeBatch(db);
    querySnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  }

  // --- FUNGSI AUTENTIKASI & LISTENER DATA ---
  
  function listenForEntries() {
    if (entriesListener) entriesListener(); // Hentikan listener lama jika ada
    if (!currentUser) {
      allEntries = [];
      refreshJournalView();
      return;
    }

    const collectionRef = collection(db, "users", currentUser.uid, "entries");
    const q = query(collectionRef);

    entriesListener = onSnapshot(
      q,
      (querySnapshot) => {
        allEntries = [];
        querySnapshot.forEach((doc) => {
          allEntries.push({ id: doc.id, ...doc.data() });
        });
        refreshJournalView();
      },
      (error) => {
        console.error("Error listening for entries: ", error);
        showNotification("Error", "Tidak dapat mengambil data jurnal.");
      }
    );
  }

  onAuthStateChanged(auth, (user) => {
    if (user) {
      currentUser = user;
      listenForEntries();
    } else {
      currentUser = null;
      listenForEntries();
    }
  });

  async function anonymousLogin() {
    try {
      await signInAnonymously(auth);
    } catch (error) {
      console.error("Anonymous sign in failed:", error);
      showNotification(
        "Koneksi Gagal",
        "Tidak dapat terhubung ke server. Periksa koneksi dan pengaturan Firebase Anda."
      );
    }
  }

  // --- FUNGSI RENDER ---
  function renderEntries(entriesToRender, newEntryId = null) {
    entryCounter.textContent = `${entriesToRender.length} Entries Found`;
    entryList.innerHTML = "";

    if (entriesToRender.length === 0) {
      entryList.innerHTML =
        '<p style="text-align: center; color: #888;">Tidak ada entri. Coba buat entri baru!</p>';
      return;
    }

    const sortValue = sortSelect.value;
    const totalEntries = entriesToRender.length;

    entriesToRender.forEach((entry, index) => {
      const entryElement = createEntryElement(
        entry,
        index,
        totalEntries,
        sortValue
      );
      if (entry.id === newEntryId) {
        entryElement.classList.add("new-entry");
      }
      entryList.appendChild(entryElement);
    });

    setTimeout(() => {
      if (typeof Prism !== "undefined") Prism.highlightAll();
      if (typeof renderMathInElement !== "undefined") {
        renderMathInElement(document.body, {
          delimiters: [
            { left: "$$", right: "$$", display: true },
            { left: "$", right: "$", display: false },
          ],
        });
      }
    }, 0);
  }

  function createEntryElement(entry, index, totalEntries, sortValue) {
    const entryContainer = document.createElement("div");
    entryContainer.className = "entry";
    entryContainer.dataset.id = entry.id;

    const numberElement = document.createElement("div");
    numberElement.className = "entry-number";
    if (sortValue === "newest") {
      numberElement.textContent = `${totalEntries - index}.`;
    } else {
      numberElement.textContent = `${index + 1}.`;
    }

    const contentWrapper = document.createElement("div");
    contentWrapper.className = "entry-content";

    const titleElement = document.createElement("h3");
    titleElement.className = "entry-title";
    titleElement.textContent = entry.title;

    const timestampElement = document.createElement("small");
    timestampElement.className = "entry-timestamp";
    timestampElement.textContent = new Date(entry.timestamp).toLocaleString(
      "id-ID",
      { dateStyle: "medium", timeStyle: "short" }
    );

    const textElement = document.createElement("div");
    textElement.className = "entry-text";
    const rawHtml = typeof marked !== 'undefined' ? marked.parse(entry.text) : entry.text;
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = rawHtml;
    const links = tempDiv.querySelectorAll("a");
    links.forEach((link) => {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
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
      textElement.classList.add("truncated");
      const readMoreBtn = document.createElement("button");
      readMoreBtn.textContent = "Read More...";
      readMoreBtn.className = "read-more-btn";
      readMoreBtn.addEventListener("click", () => {
        textElement.classList.remove("truncated");
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
    const container = document.createElement("div");
    container.className = "entry-tags";
    if (entry.tags && entry.tags.length > 0) {
      entry.tags.forEach((tag) => {
        const tagSpan = document.createElement("span");
        tagSpan.className = "entry-tag";
        tagSpan.textContent = tag;
        container.appendChild(tagSpan);
      });
    }
    return container;
  }

  function createActionsElement(entry) {
    const container = document.createElement("div");
    container.className = "entry-actions";

    const copyButton = document.createElement("button");
    copyButton.textContent = "Copy";
    copyButton.className = "copy-btn";
    copyButton.addEventListener("click", () =>
      copyEntryToClipboard(entry.text)
    );

    const editButton = document.createElement("button");
    editButton.textContent = "Edit";
    editButton.className = "edit-btn";
    editButton.addEventListener("click", () => openEditModal(entry.id));

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.className = "delete-btn";
    deleteButton.addEventListener("click", () =>
      openDeleteConfirmModal(entry.id)
    );

    container.appendChild(copyButton);
    container.appendChild(editButton);
    container.appendChild(deleteButton);
    return container;
  }

  function renderTagCloud() {
    const allTags = allEntries.flatMap((entry) => entry.tags || []);
    const uniqueTags = [...new Set(allTags)];
    tagCloudContainer.innerHTML = "";

    const allButton = document.createElement("button");
    allButton.textContent = "All Entries";
    allButton.className = "tag-btn";
    if (activeTag === null) {
      allButton.classList.add("active");
    }
    allButton.addEventListener("click", () => {
      activeTag = null;
      refreshJournalView();
    });
    tagCloudContainer.appendChild(allButton);

    uniqueTags.forEach((tag) => {
      const tagButton = document.createElement("button");
      tagButton.textContent = tag;
      tagButton.className = "tag-btn";
      if (tag === activeTag) {
        tagButton.classList.add("active");
      }
      tagButton.addEventListener("click", () => {
        activeTag = tag;
        refreshJournalView();
      });
      tagCloudContainer.appendChild(tagButton);
    });
  }

  function renderTagChart() {
    const allTags = allEntries.flatMap((entry) => entry.tags || []);

    if (allTags.length === 0) {
      chartContainer.style.display = "none";
      return;
    }

    chartContainer.style.display = "block";

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
      type: "doughnut",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Entries",
            data: data,
            backgroundColor: [
              "rgba(212, 175, 55, 0.8)",
              "rgba(100, 149, 237, 0.8)",
              "rgba(218, 112, 214, 0.8)",
              "rgba(255, 105, 97, 0.8)",
              "rgba(0, 191, 255, 0.8)",
              "rgba(240, 230, 140, 0.8)",
            ],
            borderColor: "#1e1e1e",
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: "#f0f0f0",
              font: {
                family: "'Inter', sans-serif",
              },
            },
          },
        },
      },
    });
  }

  function refreshJournalView(newEntryId = null) {
    let entriesToDisplay = [...allEntries];
    const searchTerm = searchInput.value.toLowerCase();
    const sortValue = sortSelect.value;
    if (activeTag) {
      entriesToDisplay = entriesToDisplay.filter(
        (entry) => entry.tags && entry.tags.includes(activeTag)
      );
    }
    if (searchTerm) {
      entriesToDisplay = entriesToDisplay.filter(
        (entry) =>
          entry.text.toLowerCase().includes(searchTerm) ||
          (entry.title && entry.title.toLowerCase().includes(searchTerm))
      );
    }
    if (sortValue === "newest") {
      entriesToDisplay.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } else {
      entriesToDisplay.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }
    renderEntries(entriesToDisplay, newEntryId);
    renderTagCloud();
    renderTagChart();
  }

  // --- MODAL FUNCTIONS ---
  function openEditModal(id) {
    const entryToEdit = allEntries.find((e) => e.id === id);
    if (!entryToEdit) return;
    currentEditingId = id;
    modalTitleInput.value = entryToEdit.title || "";
    modalTextarea.value = entryToEdit.text;
    editModal.style.display = "flex";
  }

  function closeEditModal() {
    currentEditingId = null;
    editModal.style.display = "none";
  }

  async function saveEdit() {
    if (currentEditingId === null) return;
    const newTitle = modalTitleInput.value.trim();
    const newText = modalTextarea.value.trim();
    if (newTitle && newText) {
      await updateEntry(currentEditingId, { title: newTitle, text: newText });
    }
    closeEditModal();
  }

  function openDeleteConfirmModal(id) {
    if (id) {
      isDeletingAll = false;
      currentDeletingId = id;
      deleteModalTitle.textContent = "Confirm Deletion";
      deleteModalText.textContent =
        "Are you sure you want to permanently delete this entry? This action cannot be undone.";
    } else {
      isDeletingAll = true;
      currentDeletingId = null;
      deleteModalTitle.textContent = "Delete All Entries";
      deleteModalText.textContent =
        "Are you sure you want to delete ALL entries? This is irreversible.";
    }
    deleteConfirmModal.style.display = "flex";
  }

  function closeDeleteConfirmModal() {
    deleteConfirmModal.style.display = "none";
  }

  async function confirmDelete() {
    closeDeleteConfirmModal();
    if (isDeletingAll) {
      await deleteAllEntries();
    } else if (currentDeletingId) {
      await deleteEntry(currentDeletingId);
    }
  }

  function updateCharCounter() {
    const currentLength = journalInput.value.length;
    charCounter.textContent = `${currentLength}`;
  }

  function copyEntryToClipboard(text) {
    const tempTextarea = document.createElement("textarea");
    tempTextarea.value = text;
    document.body.appendChild(tempTextarea);
    tempTextarea.select();
    document.execCommand("copy");
    document.body.removeChild(tempTextarea);
    showToast("Text successfully copied!");
  }

  function loadSettings() {
    const savedSortPreference = localStorage.getItem("journalSortPreference");
    if (savedSortPreference) {
      sortSelect.value = savedSortPreference;
    }
  }

  function showNotification(title, message) {
    notificationTitle.textContent = title;
    notificationText.textContent = message;
    notificationModal.style.display = "flex";
  }

  function showToast(message) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("show");
    }, 100);

    setTimeout(() => {
      toast.classList.remove("show");
      toast.classList.add("hide");
      toast.addEventListener("transitionend", () => toast.remove());
    }, 3000);
  }

  function saveDraft() {
    const draft = {
      title: titleInput.value,
      text: journalInput.value,
      tags: tagInput.value,
    };
    localStorage.setItem("journalDraft", JSON.stringify(draft));
  }

  function loadDraft() {
    const savedDraft = localStorage.getItem("journalDraft");
    if (savedDraft) {
      const draft = JSON.parse(savedDraft);
      titleInput.value = draft.title || "";
      journalInput.value = draft.text || "";
      tagInput.value = draft.tags || "";
      updateCharCounter();
    }
  }

  function clearDraft() {
    localStorage.removeItem("journalDraft");
  }

  function isValidJournalData(data) {
    if (!Array.isArray(data)) {
      return false;
    }
    if (data.length === 0) {
      return true;
    }
    const firstEntry = data[0];
    return (
      firstEntry.hasOwnProperty("title") &&
      firstEntry.hasOwnProperty("text") &&
      firstEntry.hasOwnProperty("timestamp")
    );
  }

  journalForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    const title = titleInput.value.trim();
    const text = journalInput.value.trim();
    const tags = tagInput.value
      .trim()
      .split(/[\s,]+/)
      .filter((tag) => tag.startsWith("#") && tag.length > 1);

    if (title && text) {
      const newEntry = {
        title: title,
        text: text,
        timestamp: new Date().toISOString(),
        tags: tags,
      };
      await addEntry(newEntry);

      titleInput.value = "";
      journalInput.value = "";
      tagInput.value = "";
      clearDraft();
      updateCharCounter();
    }
  });

  [titleInput, journalInput, tagInput].forEach((input) => {
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && event.ctrlKey) {
        event.preventDefault();
        journalForm.querySelector('button[type="submit"]').click();
      }
    });
    input.addEventListener("input", saveDraft);
  });

  deleteAllBtn.addEventListener("click", () => {
    if (allEntries.length > 0) {
      openDeleteConfirmModal(null);
    }
  });

  journalInput.addEventListener("input", updateCharCounter);
  searchInput.addEventListener("input", refreshJournalView);

  sortSelect.addEventListener("change", () => {
    localStorage.setItem("journalSortPreference", sortSelect.value);
    refreshJournalView();
  });

  musicToggleBtn.addEventListener("click", () => {
    if (backgroundMusic.paused) {
      backgroundMusic.play();
      playIcon.style.display = "none";
      pauseIcon.style.display = "inline-block";
    } else {
      backgroundMusic.pause();
      playIcon.style.display = "inline-block";
      pauseIcon.style.display = "none";
    }
  });

  exportBtn.addEventListener("click", () => {
    if (allEntries.length === 0) {
      showNotification("Export Failed", "No data to export.");
      return;
    }
    const dataStr = JSON.stringify(allEntries, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "physics-journal-backup.json";
    link.click();
    URL.revokeObjectURL(url);
  });

  importBtn.addEventListener("click", () => {
    importFileInput.click();
  });

  importFileInput.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedEntries = JSON.parse(e.target.result);
        if (isValidJournalData(importedEntries)) {
            openDeleteConfirmModal(null); // Buka modal konfirmasi untuk menimpa
            
            const importConfirmHandler = async () => {
                await deleteAllEntries(); // Hapus semua data lama
                const batch = writeBatch(db);
                importedEntries.forEach(entry => {
                    delete entry.id; 
                    const docRef = doc(collection(db, 'users', currentUser.uid, 'entries'));
                    batch.set(docRef, entry);
                });
                await batch.commit(); // Tambahkan semua data baru
                
                closeDeleteConfirmModal();
                deleteConfirmBtn.removeEventListener("click", importConfirmHandler);
                deleteConfirmBtn.addEventListener("click", confirmDelete);
            };

            deleteConfirmBtn.removeEventListener("click", confirmDelete);
            deleteConfirmBtn.addEventListener("click", importConfirmHandler);
        } else {
          showNotification(
            "Import Failed",
            "The JSON file does not have the correct journal data structure."
          );
        }
      } catch (error) {
        showNotification(
          "Import Failed",
          "Failed to read the file. Ensure the file is in the correct JSON format."
        );
      }
    };
    reader.readAsText(file);
    importFileInput.value = "";
  });

  modalSaveBtn.addEventListener("click", saveEdit);
  modalCancelBtn.addEventListener("click", closeEditModal);
  editModal.addEventListener("click", (event) => {
    if (event.target === editModal) closeEditModal();
  });
  deleteConfirmBtn.addEventListener("click", confirmDelete);
  deleteCancelBtn.addEventListener("click", closeDeleteConfirmModal);
  deleteConfirmModal.addEventListener("click", (event) => {
    if (event.target === deleteConfirmModal) closeDeleteConfirmModal();
  });

  notificationOkBtn.addEventListener("click", () => {
    notificationModal.style.display = "none";
  });
  notificationModal.addEventListener("click", (event) => {
    if (event.target === notificationModal) {
      notificationModal.style.display = "none";
    }
  });

  infoBtn.addEventListener("click", () => {
    infoModal.style.display = "flex";
  });
  infoOkBtn.addEventListener("click", () => {
    infoModal.style.display = "none";
  });
  infoModal.addEventListener("click", (event) => {
    if (event.target === infoModal) {
      infoModal.style.display = "none";
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (editModal.style.display === "flex") {
        closeEditModal();
      }
      if (deleteConfirmModal.style.display === "flex") {
        closeDeleteConfirmModal();
      }
      if (notificationModal.style.display === "flex") {
        notificationModal.style.display = "none";
      }
      if (infoModal.style.display === "flex") {
        infoModal.style.display = "none";
      }
    }
  });

  // --- PEMUATAN AWAL ---
  loadSettings();
  loadDraft();
  entryList.innerHTML = '<p style="text-align: center; color: #888;">Connecting to the server...</p>';
  anonymousLogin();
  updateCharCounter();
  backgroundMusic.volume = 0.3;

  // --- PWA Service Worker Registration ---
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').then(registration => {
            console.log('ServiceWorker registration successful with scope: ', registration.scope);
        }, err => {
            console.log('ServiceWorker registration failed: ', err);
        });
    });
  }
});
