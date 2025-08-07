
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyCsK53arzyEFyTJbx2XN37ahaNEjeek2BI",
    authDomain: "my-physics-journal.firebaseapp.com",
    projectId: "my-physics-journal",
    storageBucket: "my-physics-journal.firebasestorage.app",
    messagingSenderId: "16607974206",
    appId: "1:16607974206:web:1db3617bc42055011b526f"
  };

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
