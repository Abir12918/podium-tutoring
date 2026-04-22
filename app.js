// Firebase SDKs import
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, addDoc, getDocs } from "firebase/firestore";

// Your Firebase config object
const firebaseConfig = {
  apiKey: "AIzaSyAymD4-mWInCxwXTM2T508CXLK9yz8z59s",
  authDomain: "podium-tutoring.firebaseapp.com",
  projectId: "podium-tutoring",
  storageBucket: "podium-tutoring.firebasestorage.app",
  messagingSenderId: "230712596346",
  appId: "1:230712596346:web:aa8bdeaba75b05fa30a8c3",
  measurementId: "G-3MDHWSVK9T"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM elements
const authContainer = document.getElementById('auth-container');
const attendanceContainer = document.getElementById('attendance-container');
const loginButton = document.getElementById('login-button');
const logoutButton = document.getElementById('logout-button');
const attendanceList = document.getElementById('attendance-list');

// Firebase Authentication - Google sign-in
loginButton.addEventListener("click", () => {
  const provider = new GoogleAuthProvider();
  signInWithPopup(auth, provider)
    .then((result) => {
      const user = result.user;
      console.log("User signed in:", user.displayName);
    })
    .catch((error) => {
      console.log("Error:", error.code, error.message);
    });
});

// Firebase Authentication - Logout
logoutButton.addEventListener("click", () => {
  signOut(auth).then(() => {
    console.log("User signed out");
  }).catch((error) => {
    console.log("Error signing out:", error);
  });
});

// Check auth state and toggle UI
onAuthStateChanged(auth, (user) => {
  if (user) {
    authContainer.style.display = 'none';
    attendanceContainer.style.display = 'block';
    loadAttendanceData();
  } else {
    authContainer.style.display = 'block';
    attendanceContainer.style.display = 'none';
  }
});

// Load attendance data from Firestore
async function loadAttendanceData() {
  const querySnapshot = await getDocs(collection(db, "attendance"));
  attendanceList.innerHTML = ''; // Clear previous list
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    const li = document.createElement('li');
    li.textContent = `${data.studentName} - ${data.attendanceStatus}`;
    attendanceList.appendChild(li);
  });
}

// Add attendance record to Firestore
async function addAttendance(studentName, attendanceStatus) {
  try {
    const docRef = await addDoc(collection(db, "attendance"), {
      studentName: studentName,
      attendanceStatus: attendanceStatus,
      date: new Date().toISOString()
    });
    console.log("Attendance added with ID: ", docRef.id);
  } catch (e) {
    console.error("Error adding attendance: ", e);
  }
}