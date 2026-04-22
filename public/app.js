// Firebase Configuration
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
const app = firebase.initializeApp(firebaseConfig); // Use global firebase object
const auth = firebase.auth();
const db = firebase.firestore();

// DOM elements
const authContainer = document.getElementById('auth-container');
const attendanceContainer = document.getElementById('attendance-container');
const loginButton = document.getElementById('login-button');
const logoutButton = document.getElementById('logout-button');
const attendanceList = document.getElementById('attendance-list');

// Firebase Authentication - Google sign-in
loginButton.addEventListener("click", () => {
  const provider = new firebase.auth.GoogleAuthProvider(); // Use global firebase object
  firebase.auth().signInWithPopup(provider)
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
  firebase.auth().signOut().then(() => {
    console.log("User signed out");
  }).catch((error) => {
    console.log("Error signing out:", error);
  });
});

// Check auth state and toggle UI
firebase.auth().onAuthStateChanged((user) => {
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
  const querySnapshot = await firebase.firestore().collection("attendance").get();
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
    const docRef = await firebase.firestore().collection("attendance").add({
      studentName: studentName,
      attendanceStatus: attendanceStatus,
      date: new Date().toISOString()
    });
    console.log("Attendance added with ID: ", docRef.id);
  } catch (e) {
    console.error("Error adding attendance: ", e);
  }
}