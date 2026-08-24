// Firebase initialisation shared by the app/website and adminos
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, doc, onSnapshot, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, orderBy, serverTimestamp, writeBatch,
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

export const firebaseConfig = {
  apiKey: "AIzaSyDfazJnJVmxfpwJFzvtggwIUUtv1Q-AISY",
  authDomain: "discloj-11eb2.firebaseapp.com",
  projectId: "discloj-11eb2",
  storageBucket: "discloj-11eb2.firebasestorage.app",
  messagingSenderId: "719228824900",
  appId: "1:719228824900:web:13d1434b8f16673d13bb11",
};

export const app = initializeApp(firebaseConfig);

let db;
try {
  db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
} catch (e) {
  db = initializeFirestore(app, {});
}
export { db, collection, doc, onSnapshot, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, orderBy, serverTimestamp, writeBatch };
