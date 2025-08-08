
import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  "projectId": "deepdive-navigator",
  "appId": "1:366214614015:web:45c15b4846a606541675ca",
  "storageBucket": "deepdive-navigator.firebasestorage.app",
  "apiKey": "AIzaSyBKSP4dx70DWZLluLGug2OvgpBj_kac8Kk",
  "authDomain": "deepdive-navigator.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "366214614015"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

export { app, auth };
