// Load after Firebase CDN scripts and firebase-config.js
(function(){
  if (!window.firebase || !window.firebase.initializeApp) {
    console.error('Firebase SDK not loaded');
    return;
  }
  if (!window.firebaseConfig) {
    console.error('Missing window.firebaseConfig. Create firebase-config.js from firebase-config.sample.js');
    return;
  }
  // Initialize Firebase
  window.firebaseApp = firebase.initializeApp(window.firebaseConfig);
  // Expose common services (compat)
  window.db = firebase.firestore ? firebase.firestore() : undefined;
  window.auth = firebase.auth ? firebase.auth() : undefined;
})();
