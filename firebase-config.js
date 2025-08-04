// File: firebase-config.js
// Tanggung jawab: Menyimpan konfigurasi Firebase dan menginisialisasi koneksi.

// Mengimpor fungsi-fungsi yang dibutuhkan dari Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";

// PASTIKAN ANDA MENGGANTI INI DENGAN KUNCI ASLI DARI KONSOL FIREBASE ANDA
const firebaseConfig = {
    apiKey: "AIzaSyCsK53arzyEFyTJbx2XN37ahaNEjeek2BI",
    authDomain: "my-physics-journal.firebaseapp.com",
    projectId: "my-physics-journal",
    storageBucket: "my-physics-journal.firebasestorage.app",
    messagingSenderId: "16607974206",
    appId: "1:16607974206:web:1db3617bc42055011b526f"
  };

// Inisialisasi aplikasi Firebase dengan konfigurasi di atas
const app = initializeApp(firebaseConfig);

// Menyiapkan dan mengekspor layanan yang akan kita gunakan di file lain
export const db = getFirestore(app); // 'db' adalah koneksi ke database Firestore kita
export const auth = getAuth(app);    // 'auth' adalah koneksi ke layanan autentikasi (login)
